import { useState, useEffect } from 'react'
import { Contact } from '@/types'

// Supabase configuration from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// API response interface
interface APIContact {
  name: string
  profile_url: string
  conversation_summary: string
  follow_up_text: string
  date_met: string
  meeting_event: string
  future_potential: string
  follow_up_priority: string
  follow_up_suggestion: string
}

interface APIResponse {
  status: string
  message: string
  contacts: APIContact[]
}

// Convert API contact to our Contact interface
function convertAPIContactToContact(apiContact: APIContact, index: number): Contact {
  // Fix date parsing - API returns "YYYY-MM-DD", ensure proper parsing
  const dateMet = new Date(apiContact.date_met + 'T00:00:00.000Z')
  
  return {
    id: (index + 1).toString(),
    user_id: 'yilun-user-id',
    name: apiContact.name,
    linkedin_url: apiContact.profile_url,
    linkedin_profile_data: {
      title: '', // Not provided by API
      company: '', // Not provided by API
      location: '' // Not provided by API
    },
    relationship_type: apiContact.meeting_event || 'professional_contact', // Use meeting_event as relationship_type
    custom_instructions: apiContact.conversation_summary,
    auto_pilot_enabled: apiContact.follow_up_priority === 'High',
    status: 'connected',
    created_at: dateMet.toISOString(),
    updated_at: dateMet.toISOString()
  }
}

export function useContacts() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch contacts from API on component mount (page refresh)
  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      setError(null)

      const url = `${SUPABASE_URL}/functions/v1/chrome-get-contacts?user_email=yilun@example.com`
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data: APIResponse = await response.json()
      
      if (data.status !== 'success') {
        throw new Error(data.message || 'API request failed')
      }

      // Convert API contacts to our Contact interface
      const convertedContacts = data.contacts.map(convertAPIContactToContact)
      
      // Sort by date_met (newest first)
      const sortedContacts = convertedContacts.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

      setContacts(sortedContacts)
      console.log('[useContacts] Fetched contacts:', sortedContacts.length)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contacts'
      setError(errorMessage)
      console.error('[useContacts] Error fetching contacts:', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const updateContact = async (contactId: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(contact =>
      contact.id === contactId ? { ...contact, ...updates } : contact
    ))
  }

  const refetch = async () => {
    await fetchContacts()
  }

  return {
    contacts,
    loading,
    error,
    refetch,
    updateContact
  }
}