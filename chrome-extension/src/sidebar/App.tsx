import { useState, useMemo } from 'react'
import { useMockAuth } from './hooks/useMockAuth'
import { useContacts } from './hooks/useContacts'
import { usePersistentAudioState } from './hooks/usePersistentState'
import { useDifyWorkflow } from './hooks/useDifyWorkflow'
import { Contact } from '@/types'
import LoginPrompt from './components/LoginPrompt'
import AudioUpload from './components/AudioUpload'
import ProcessingAnimation from './components/ProcessingAnimation'

export default function App() {
  const { user, loading: authLoading } = useMockAuth()
  const { contacts, loading: contactsLoading, error: contactsError, refetch: refetchContacts } = useContacts()
  const { hasProcessedAudio, setHasProcessedAudio, isLoading: stateLoading } = usePersistentAudioState()
  const { progress, processAudio, reset: resetWorkflow, isProcessing } = useDifyWorkflow()
  const [searchQuery, setSearchQuery] = useState('')
  const [isSimulating, setIsSimulating] = useState(false)
  const [simulationProgress, setSimulationProgress] = useState({ progress: 0, message: '' })


  const handleAudioUpload = async (file: File) => {
    console.log('[Sidebar] Selected audio file:', {
      name: file.name,
      type: file.type,
      size: file.size
    })
    
    try {
      // 首先尝试使用 Dify 工作流处理音频
      console.log('[Sidebar] Attempting Dify workflow processing...')
      const workflowResult = await processAudio(file, user?.id || 'linkus-user')
      
      if (workflowResult.success && workflowResult.data) {
        console.log('[Sidebar] Dify workflow completed successfully:', workflowResult.data)
        
        // 处理完成后刷新联系人列表
        await refetchContacts()
        setHasProcessedAudio(true)
        return
      } else {
        console.warn('[Sidebar] Dify workflow failed or returned no data, falling back to simulation:', workflowResult.error)
      }
    } catch (error) {
      console.warn('[Sidebar] Dify processing failed, falling back to simulation:', error)
    }
    
    // 回退到模拟处理过程
    console.log('[Sidebar] Using fallback simulation processing...')
    await simulateAudioProcessing()
  }

  // 模拟音频处理过程（回退方案）
  const simulateAudioProcessing = async () => {
    return new Promise<void>((resolve) => {
      setIsSimulating(true)
      setSimulationProgress({ progress: 0, message: 'Starting simulation...' })
      
      // 模拟处理步骤
      const processingSteps = [
        { progress: 20, message: 'Uploading audio file...', delay: 800 },
        { progress: 40, message: 'Converting to text...', delay: 1200 },
        { progress: 60, message: 'Analyzing content...', delay: 1000 },
        { progress: 80, message: 'Generating insights...', delay: 1500 },
        { progress: 100, message: 'Processing complete!', delay: 500 }
      ]
      
      let currentStep = 0
      const processNextStep = () => {
        if (currentStep < processingSteps.length) {
          const step = processingSteps[currentStep]
          setTimeout(() => {
            // 更新模拟进度状态
            setSimulationProgress({ progress: step.progress, message: step.message })
            console.log(`[Sidebar] Simulation step ${currentStep + 1}: ${step.message} (${step.progress}%)`)
            
            currentStep++
            if (currentStep < processingSteps.length) {
              processNextStep()
            } else {
              // 处理完成
              setTimeout(() => {
                console.log('[Sidebar] Simulation processing complete')
                setIsSimulating(false)
                setSimulationProgress({ progress: 0, message: '' })
                setHasProcessedAudio(true)
                resolve()
              }, 800)
            }
          }, step.delay)
        }
      }
      
      processNextStep()
    })
  }

  // Filter and sort contacts
  const filteredAndSortedContacts = useMemo(() => {
    let filtered = contacts

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = contacts.filter(contact => 
        contact.name.toLowerCase().includes(query) ||
        contact.relationship_type.toLowerCase().includes(query) ||
        contact.created_at.includes(query)
      )
    }

    // Sort by connection date (latest first)
    return filtered.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [contacts, searchQuery])

  const handleContactClick = (contact: Contact) => {
    // Open LinkedIn profile in new tab
    window.open(contact.linkedin_url, '_blank')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (authLoading || stateLoading) {
    return (
      <div className="w-96 h-[600px] flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginPrompt />
  }

  return (
    <div className="w-96 h-[600px] bg-white flex flex-col">
      {/* Header with Search Bar */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            👤 Recent Connections
          </h1>
          {hasProcessedAudio && (
            <button
              onClick={() => {
                setHasProcessedAudio(false)
                resetWorkflow()
                setIsSimulating(false)
                setSimulationProgress({ progress: 0, message: '' })
              }}
              className="text-xs text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1"
              title="Reset and upload new audio"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          )}
        </div>
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, event type, or date..."
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

      </div>

      {/* Audio Upload Component */}
      <AudioUpload 
        onAudioUpload={handleAudioUpload}
      />


      {/* Main Content Area */}
      {(isProcessing || isSimulating) ? (
        <ProcessingAnimation 
          progress={isSimulating ? simulationProgress.progress : progress.progress} 
          message={isSimulating ? simulationProgress.message : progress.message} 
        />
      ) : hasProcessedAudio ? (
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {contactsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contactsError ? (
            <div className="text-center p-8">
              <div className="text-red-600 font-medium mb-2">Error loading contacts</div>
              <div className="text-sm text-gray-600 mb-4">{contactsError}</div>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          ) : filteredAndSortedContacts.length === 0 ? (
            <div className="text-center p-8 text-gray-500">
              {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {filteredAndSortedContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => handleContactClick(contact)}
                  className="bg-white p-4 rounded-xl border border-gray-200 cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-200 transform hover:scale-[1.02]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 text-base">
                      {contact.name}
                    </h3>
                    <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {formatDate(contact.created_at)}
                    </div>
                  </div>
                  <p className="text-sm text-blue-600 font-medium">
                    Event Type: <span className="capitalize text-gray-700">
                      {contact.relationship_type.replace('_', ' ')}
                    </span>
                  </p>
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                    Click to view LinkedIn profile
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-sm p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Upload Audio to Get Started
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload an audio file above to analyze and discover relevant contacts based on your conversation.
            </p>
            <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center justify-center gap-1 mb-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium">Tip</span>
              </div>
              <p>Supported formats: MP3, WAV, M4A, and more</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}