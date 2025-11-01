// Dify API 服务
const DIFY_BASE_URL = 'http://dify.mindboat.app/v1'
const DIFY_API_KEY = 'app-FytpuO1CiSt97A6CobP2D8rz'

// Dify API 响应类型
export interface DifyWorkflowResponse {
  workflow_run_id: string
  task_id: string
  data: {
    id: string
    workflow_id: string
    status: 'running' | 'succeeded' | 'failed' | 'stopped'
    outputs?: Record<string, any>
    error?: string
    elapsed_time?: number
    total_tokens?: number
    total_steps?: number
    created_at: number
    finished_at?: number
  }
}

// 流式响应事件类型
export interface DifyStreamEvent {
  event: 'workflow_started' | 'node_started' | 'text_chunk' | 'node_finished' | 'workflow_finished' | 'tts_message' | 'tts_message_end' | 'ping'
  task_id: string
  workflow_run_id: string
  data: any
}

// 文件上传响应类型
export interface DifyFileUploadResponse {
  id: string
  name: string
  size: number
  extension: string
  mime_type: string
  created_by: string
  created_at: number
}

// 工作流输入参数类型
export interface DifyWorkflowInput {
  inputs: Record<string, any>
  response_mode: 'streaming' | 'blocking'
  user: string
  files?: Array<{
    type: 'document' | 'image' | 'audio' | 'video' | 'custom'
    transfer_method: 'remote_url' | 'local_file'
    url?: string
    upload_file_id?: string
  }>
}

class DifyService {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string = DIFY_BASE_URL, apiKey: string = DIFY_API_KEY) {
    this.baseUrl = baseUrl
    this.apiKey = apiKey
  }

  private getHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    }
  }

  private getFormHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`
    }
  }

  /**
   * 上传文件到 Dify
   */
  async uploadFile(file: File, user: string): Promise<DifyFileUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('user', user)

    const response = await fetch(`${this.baseUrl}/files/upload`, {
      method: 'POST',
      headers: this.getFormHeaders(),
      body: formData
    })

    if (!response.ok) {
      throw new Error(`File upload failed: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * 执行工作流 - 阻塞模式
   */
  async runWorkflow(input: DifyWorkflowInput): Promise<DifyWorkflowResponse> {
    const response = await fetch(`${this.baseUrl}/workflows/run`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        ...input,
        response_mode: 'blocking'
      })
    })

    if (!response.ok) {
      throw new Error(`Workflow execution failed: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * 执行工作流 - 流式模式
   */
  async runWorkflowStreaming(
    input: DifyWorkflowInput,
    onEvent: (event: DifyStreamEvent) => void,
    onComplete: (result: any) => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/workflows/run`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          ...input,
          response_mode: 'streaming'
        })
      })

      if (!response.ok) {
        throw new Error(`Workflow execution failed: ${response.status} ${response.statusText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body reader available')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let workflowResult: any = null

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // 处理 SSE 格式的数据
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留最后一个可能不完整的行

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6)) as DifyStreamEvent
              onEvent(eventData)

              // 如果是工作流完成事件，保存结果
              if (eventData.event === 'workflow_finished') {
                workflowResult = eventData.data
              }
            } catch (e) {
              console.warn('Failed to parse SSE event:', line, e)
            }
          }
        }
      }

      onComplete(workflowResult)
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error occurred'))
    }
  }

  /**
   * 获取工作流执行状态
   */
  async getWorkflowStatus(workflowRunId: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/workflows/run/${workflowRunId}`, {
      method: 'GET',
      headers: this.getHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to get workflow status: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * 停止工作流执行
   */
  async stopWorkflow(taskId: string, user: string): Promise<{ result: string }> {
    const response = await fetch(`${this.baseUrl}/workflows/tasks/${taskId}/stop`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ user })
    })

    if (!response.ok) {
      throw new Error(`Failed to stop workflow: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  }

  /**
   * 测试 Dify 连接状态
   */
  async testConnection(): Promise<{ connected: boolean; message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/info`, {
        method: 'GET',
        headers: this.getHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        return {
          connected: true,
          message: `Connected to Dify successfully. App: ${data.name || 'Unknown'}`
        }
      } else {
        return {
          connected: false,
          message: `Connection failed: ${response.status} ${response.statusText}`
        }
      }
    } catch (error) {
      return {
        connected: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * 处理音频文件并获取联系人信息
   */
  async processAudioForContacts(
    audioFile: File,
    user: string,
    onProgress?: (progress: number, message: string) => void,
    onEvent?: (event: DifyStreamEvent) => void
  ): Promise<any> {
    // 设置超时时间 (30秒)
    const timeout = 30000
    
    try {
      // 步骤 1: 上传音频文件
      onProgress?.(20, 'Uploading audio file...')
      
      const uploadPromise = this.uploadFile(audioFile, user)
      const uploadResult = await Promise.race([
        uploadPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('File upload timeout')), timeout)
        )
      ]) as DifyFileUploadResponse
      
      onProgress?.(40, 'Processing audio with AI...')

      // 步骤 2: 执行工作流
      return new Promise((resolve, reject) => {
        // 设置工作流超时
        const workflowTimeout = setTimeout(() => {
          reject(new Error('Workflow execution timeout'))
        }, timeout)

        const workflowInput: DifyWorkflowInput = {
          inputs: {
            // 根据你的工作流配置调整输入参数
            audio_file: [{
              type: 'audio',
              transfer_method: 'local_file',
              upload_file_id: uploadResult.id
            }]
          },
          response_mode: 'streaming',
          user: user
        }

        this.runWorkflowStreaming(
          workflowInput,
          (event) => {
            onEvent?.(event)
            
            // 根据事件类型更新进度
            switch (event.event) {
              case 'workflow_started':
                onProgress?.(50, 'AI analysis started...')
                break
              case 'node_started':
                if (event.data.node_type === 'llm') {
                  onProgress?.(70, 'Analyzing conversation content...')
                } else if (event.data.node_type === 'code') {
                  onProgress?.(85, 'Extracting contact information...')
                }
                break
              case 'text_chunk':
                // 可以在这里处理流式文本输出
                break
              case 'workflow_finished':
                onProgress?.(100, 'Processing complete!')
                break
            }
          },
          (result) => {
            clearTimeout(workflowTimeout)
            // 验证结果是否有效
            if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
              reject(new Error('Workflow returned empty or invalid result'))
            } else {
              resolve(result)
            }
          },
          (error) => {
            clearTimeout(workflowTimeout)
            reject(error)
          }
        )
      })
    } catch (error) {
      // 增强错误信息
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[DifyService] processAudioForContacts error:', errorMessage)
      throw new Error(`Dify processing failed: ${errorMessage}`)
    }
  }
}

// 导出单例实例
export const difyService = new DifyService()
export default DifyService
