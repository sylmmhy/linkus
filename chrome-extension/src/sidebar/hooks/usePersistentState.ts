import { useState, useEffect } from 'react'

interface AudioProcessingState {
  hasProcessedAudio: boolean
  lastProcessedAt?: string
}

export function usePersistentAudioState() {
  const [hasProcessedAudio, setHasProcessedAudio] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Load initial state from Chrome storage
  useEffect(() => {
    const loadState = async () => {
      try {
        const result = await chrome.storage.local.get(['audioProcessingState'])
        const state: AudioProcessingState = result.audioProcessingState || { hasProcessedAudio: false }
        
        // Check if the processed state is still valid (e.g., within last 24 hours)
        if (state.hasProcessedAudio && state.lastProcessedAt) {
          const lastProcessed = new Date(state.lastProcessedAt)
          const now = new Date()
          const hoursDiff = (now.getTime() - lastProcessed.getTime()) / (1000 * 60 * 60)
          
          // Reset state if more than 24 hours have passed
          if (hoursDiff > 24) {
            await chrome.storage.local.set({
              audioProcessingState: { hasProcessedAudio: false }
            })
            setHasProcessedAudio(false)
          } else {
            setHasProcessedAudio(state.hasProcessedAudio)
          }
        } else {
          setHasProcessedAudio(state.hasProcessedAudio)
        }
      } catch (error) {
        console.error('Error loading audio processing state:', error)
        setHasProcessedAudio(false)
      } finally {
        setIsLoading(false)
      }
    }

    loadState()
  }, [])

  // Save state to Chrome storage when it changes
  const updateHasProcessedAudio = async (value: boolean) => {
    setHasProcessedAudio(value)
    
    try {
      const state: AudioProcessingState = {
        hasProcessedAudio: value,
        lastProcessedAt: value ? new Date().toISOString() : undefined
      }
      
      await chrome.storage.local.set({ audioProcessingState: state })
    } catch (error) {
      console.error('Error saving audio processing state:', error)
    }
  }

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.audioProcessingState) {
        const newState: AudioProcessingState = changes.audioProcessingState.newValue
        if (newState) {
          setHasProcessedAudio(newState.hasProcessedAudio)
        }
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  return {
    hasProcessedAudio,
    setHasProcessedAudio: updateHasProcessedAudio,
    isLoading
  }
}
