import { supabase } from '@/lib/supabase'
import { MessageFromContent, MessageData } from '@/types'

class BackgroundService {
  constructor() {
    this.setupMessageListener()
    this.setupActionListener()
    console.log('LinkedIn AI Assistant: Background service worker initialized')
  }

  private setupActionListener() {
    // Handle extension icon clicks
    chrome.action.onClicked.addListener((tab) => {
      if (tab.url?.includes('linkedin.com')) {
        // Send message to content script to toggle sidebar
        chrome.tabs.sendMessage(tab.id!, { action: 'toggleSidebar' })
      }
    })
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: MessageFromContent, _sender, _sendResponse) => {
      switch (message.type) {
        case 'NEW_MESSAGE':
          this.handleNewLinkedInMessage(message.data)
          break
      }
      return true // Keep message channel open for async response
    })
  }

  private async handleNewLinkedInMessage(messageData: MessageData) {
    try {
      console.log('New LinkedIn message received:', messageData)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        console.log('No authenticated user found')
        return
      }

      // Find contact by LinkedIn URL
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .eq('linkedin_url', messageData.senderLinkedInUrl)
        .eq('user_id', user.id)
        .single()

      if (contactError || !contact) {
        console.log('Contact not found for:', messageData.senderLinkedInUrl)
        return
      }

      // Check if auto-pilot is enabled for this contact
      if (!contact.auto_pilot_enabled) {
        console.log('Auto-pilot not enabled for contact:', contact.name)
        return
      }

      console.log('Auto-pilot enabled, generating response for:', contact.name)

      // Call generate-response Edge Function
      const { data: responseData, error: responseError } = await supabase.functions.invoke('generate-response', {
        body: {
          contactId: contact.id,
          incomingMessage: messageData.messageText,
          userId: user.id
        }
      })

      if (responseError) {
        console.error('Error generating response:', responseError)
        return
      }

      const generatedMessage = responseData.generatedMessage

      // Send response back to content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'SEND_REPLY',
            data: { message: generatedMessage }
          }).catch((error) => {
            console.error('Error sending reply to content script:', error)
          })
        }
      })

      // Show notification
      this.showNotification(`AI responded to ${contact.name}`, generatedMessage)

    } catch (error) {
      console.error('Error handling new LinkedIn message:', error)
    }
  }

  public async sendConnectionRequest(contactId: string) {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Call send-connection-request Edge Function
      const { data: responseData, error } = await supabase.functions.invoke('send-connection-request', {
        body: {
          contactId,
          userId: user.id
        }
      })

      if (error) {
        console.error('Error generating connection request:', error)
        return
      }

      // Get contact details
      const { data: contact } = await supabase
        .from('contacts')
        .select('linkedin_url')
        .eq('id', contactId)
        .single()

      if (!contact) return

      // Send to content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'SEND_CONNECTION_REQUEST',
            data: {
              profileUrl: contact.linkedin_url,
              message: responseData.connectionMessage
            }
          }).catch((error) => {
            console.error('Error sending connection request to content script:', error)
          })
        }
      })

      // Update contact status
      await supabase
        .from('contacts')
        .update({ status: 'connection_sent' })
        .eq('id', contactId)

    } catch (error) {
      console.error('Error sending connection request:', error)
    }
  }

  private showNotification(title: string, message: string) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon.svg',
      title,
      message: message.substring(0, 300) // Limit notification length
    })
  }
}

// Initialize background service
new BackgroundService()

// Export for use by popup
;(self as any).backgroundService = BackgroundService