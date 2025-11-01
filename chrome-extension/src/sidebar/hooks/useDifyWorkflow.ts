import { useState, useCallback } from 'react'
import { difyService, DifyStreamEvent } from '@/lib/dify'

export interface WorkflowProgress {
  progress: number
  message: string
  isProcessing: boolean
}

export interface WorkflowResult {
  success: boolean
  data?: any
  error?: string
}

export interface ConnectionStatus {
  connected: boolean
  message: string
  lastChecked?: Date
}

export function useDifyWorkflow() {
  const [progress, setProgress] = useState<WorkflowProgress>({
    progress: 0,
    message: '',
    isProcessing: false
  })
  const [result, setResult] = useState<WorkflowResult | null>(null)
  const [events, setEvents] = useState<DifyStreamEvent[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    message: 'Not tested',
    lastChecked: undefined
  })

  const testConnection = useCallback(async (): Promise<ConnectionStatus> => {
    try {
      const result = await difyService.testConnection()
      const status: ConnectionStatus = {
        connected: result.connected,
        message: result.message,
        lastChecked: new Date()
      }
      setConnectionStatus(status)
      return status
    } catch (error) {
      const status: ConnectionStatus = {
        connected: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date()
      }
      setConnectionStatus(status)
      return status
    }
  }, [])

  const processAudio = useCallback(async (
    audioFile: File,
    userId: string = 'linkus-user'
  ): Promise<WorkflowResult> => {
    try {
      // 重置状态
      setProgress({ progress: 0, message: 'Starting...', isProcessing: true })
      setResult(null)
      setEvents([])

      const workflowResult = await difyService.processAudioForContacts(
        audioFile,
        userId,
        // 进度回调
        (progress, message) => {
          setProgress({ progress, message, isProcessing: true })
        },
        // 事件回调
        (event) => {
          setEvents(prev => [...prev, event])
          
          // 处理特定事件
          if (event.event === 'text_chunk') {
            // 可以在这里处理流式文本输出
            console.log('Text chunk received:', event.data.text)
          }
        }
      )

      // 处理完成
      setProgress({ progress: 100, message: 'Processing complete!', isProcessing: false })
      
      const successResult: WorkflowResult = {
        success: true,
        data: workflowResult
      }
      
      setResult(successResult)
      return successResult

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      
      setProgress({ progress: 0, message: 'Processing failed', isProcessing: false })
      
      const errorResult: WorkflowResult = {
        success: false,
        error: errorMessage
      }
      
      setResult(errorResult)
      return errorResult
    }
  }, [])

  const reset = useCallback(() => {
    setProgress({ progress: 0, message: '', isProcessing: false })
    setResult(null)
    setEvents([])
  }, [])

  return {
    progress,
    result,
    events,
    connectionStatus,
    processAudio,
    testConnection,
    reset,
    isProcessing: progress.isProcessing
  }
}
