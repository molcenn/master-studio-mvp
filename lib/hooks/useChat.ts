'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface Message {
  id: string
  project_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  type?: 'text' | 'file' | 'audio'
  file_info?: string
  created_at: string
}

interface UseChatOptions {
  projectId: string
  model?: string
}

export function useChat({ projectId, model }: UseChatOptions) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingContent, setStreamingContent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch messages on mount
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat?projectId=${projectId}`)
        if (!res.ok) throw new Error('Failed to fetch messages')
        const data = await res.json()
        setMessages(data.messages || [])
      } catch (err) {
        console.error('Failed to fetch messages:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    fetchMessages()
  }, [projectId])

  // Send message to AI with streaming
  const sendMessage = useCallback(async (content: string, type: 'text' | 'file' | 'audio' = 'text', fileInfo?: any) => {
    if (!content.trim()) return

    setIsLoading(true)
    setStreamingContent('')
    setError(null)
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      // Optimistic update for user message
      const tempUserMessage: Message = {
        id: 'temp-' + Date.now(),
        project_id: projectId,
        user_id: session?.user?.id || 'local',
        role: 'user',
        content,
        type,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, tempUserMessage])

      // Call AI endpoint with streaming
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: content,
          context: messages.slice(-10),
          stream: true,
          model,
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let fullContent = ''
      let buffer = ''
      let aiMessageId: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value)
        const events = buffer.split('\n\n')
        buffer = events.pop() || ''

        for (const event of events) {
          const lines = event.split('\n')
          
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            
            const data = line.slice(6)
            
            try {
              const parsed = JSON.parse(data)
              
              switch (parsed.type) {
                case 'user_message':
                  // Replace temp message with real one
                  setMessages((prev) => [
                    ...prev.filter(m => m.id !== tempUserMessage.id),
                    parsed.message,
                  ])
                  break
                  
                case 'ai_id':
                  aiMessageId = parsed.messageId
                  break
                  
                case 'chunk':
                  fullContent += parsed.content
                  setStreamingContent(fullContent)
                  break
                  
                case 'done':
                  if (aiMessageId && fullContent) {
                    const aiMessage: Message = {
                      id: aiMessageId,
                      project_id: projectId,
                      user_id: 'system',
                      role: 'assistant',
                      content: fullContent,
                      type: 'text',
                      created_at: new Date().toISOString(),
                    }
                    setMessages((prev) => [...prev, aiMessage])
                  }
                  setStreamingContent('')
                  break
                  
                case 'error':
                  throw new Error(parsed.error || 'Stream error')
              }
            } catch (e) {
              // Re-throw intentional errors
              if (e instanceof Error && e.message !== 'Unexpected token') {
                throw e
              }
            }
          }
        }
      }
      
      // Handle remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'done' && aiMessageId && fullContent) {
                const aiMessage: Message = {
                  id: aiMessageId,
                  project_id: projectId,
                  user_id: 'system',
                  role: 'assistant',
                  content: fullContent,
                  type: 'text',
                  created_at: new Date().toISOString(),
                }
                setMessages((prev) => [...prev, aiMessage])
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled - keep partial content as message
        setStreamingContent((current) => {
          if (current) {
            const aiMessage: Message = {
              id: 'stopped-' + Date.now(),
              project_id: projectId,
              user_id: 'system',
              role: 'assistant',
              content: current,
              type: 'text',
              created_at: new Date().toISOString(),
            }
            setMessages((prev) => [...prev, aiMessage])
          }
          return ''
        })
      } else {
        console.error('Chat error:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setMessages((prev) => prev.filter(m => !m.id.startsWith('temp-')))
      }
    } finally {
      setIsLoading(false)
      setStreamingContent('')
      abortControllerRef.current = null
    }
  }, [projectId, session, messages, model])

  // Upload file
  const uploadFile = useCallback(async (file: File) => {
    // Dev mode'da session kontrolünü atla
    const isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    if (!isDev && !session) return

    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to upload file')
      }

      const { fileUrl } = await res.json()
      await sendMessage(`Dosya: ${file.name}`, 'file', { name: file.name, url: fileUrl, type: file.type, size: file.size })

      return fileUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [projectId, session, sendMessage])

  // Stop generation
  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsLoading(false)
    }
  }, [])

  return {
    messages,
    streamingContent,
    sendMessage,
    uploadFile,
    stopGeneration,
    isLoading,
    error,
  }
}
