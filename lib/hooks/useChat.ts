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
  const streamingContentRef = useRef<string>('') // Ref to avoid stale closure

  // Fetch messages
  useEffect(() => {
    if (!session) return

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat?projectId=${projectId}`)
        if (!res.ok) throw new Error('Failed to fetch messages')
        const data = await res.json()
        setMessages(data.messages)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    fetchMessages()
  }, [projectId, session])

  // Send message to AI with streaming
  const sendMessage = useCallback(async (content: string, type: 'text' | 'file' | 'audio' = 'text', fileInfo?: any) => {
    if (!session || !content.trim()) return

    setIsLoading(true)
    setStreamingContent('')
    streamingContentRef.current = '' // Reset ref
    setError(null)
    
    // Create new abort controller for this request
    abortControllerRef.current = new AbortController()

    try {
      // Optimistic update for user message
      const tempUserMessage: Message = {
        id: 'temp-' + Date.now(),
        project_id: projectId,
        user_id: session.user.id,
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

      if (!res.ok) throw new Error('Failed to send message')

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let userMessageData: Message | null = null
      let aiMessageId: string | null = null
      let fullContent = ''
      let buffer = '' // Buffer for incomplete SSE events

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Append new chunk to buffer
        buffer += decoder.decode(value)
        
        // Split on double newlines (SSE event delimiter)
        const events = buffer.split('\n\n')
        
        // Keep the last item in buffer (could be incomplete)
        buffer = events.pop() || ''
        
        // Process complete events
        for (const event of events) {
          const lines = event.split('\n')
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              
              let parsed: any
              try {
                parsed = JSON.parse(data)
                
                switch (parsed.type) {
                  case 'user_message':
                    userMessageData = parsed.message
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
                    streamingContentRef.current = fullContent // Keep ref in sync
                    break
                  case 'done':
                    // Stream complete, add final message
                    if (aiMessageId) {
                      const aiMessage: Message = {
                        id: aiMessageId,
                        project_id: projectId,
                        user_id: '00000000-0000-0000-0000-000000000099',
                        role: 'assistant',
                        content: fullContent,
                        type: 'text',
                        created_at: new Date().toISOString(),
                      }
                      setMessages((prev) => [...prev, aiMessage])
                      setStreamingContent('')
                      streamingContentRef.current = ''
                    }
                    break
                  case 'error':
                    // Propagate error to outer catch block
                    throw new Error(parsed.error || 'Stream error')
                }
              } catch (e) {
                // Re-throw errors from error case, ignore parse errors
                if (parsed?.type === 'error') {
                  throw e
                }
                // Otherwise ignore parse errors
              }
            }
          }
        }
      }
      
      // Process any remaining buffer when stream ends
      if (buffer.trim()) {
        const lines = buffer.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'chunk' && parsed.content) {
                fullContent += parsed.content
              } else if (parsed.type === 'done' && aiMessageId) {
                const aiMessage: Message = {
                  id: aiMessageId,
                  project_id: projectId,
                  user_id: '00000000-0000-0000-0000-000000000099',
                  role: 'assistant',
                  content: fullContent,
                  type: 'text',
                  created_at: new Date().toISOString(),
                }
                setMessages((prev) => [...prev, aiMessage])
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // User cancelled, add partial message using ref (avoids stale closure)
        const partialContent = streamingContentRef.current
        if (partialContent) {
          const aiMessage: Message = {
            id: 'stopped-' + Date.now(),
            project_id: projectId,
            user_id: '00000000-0000-0000-0000-000000000099',
            role: 'assistant',
            content: partialContent,
            type: 'text',
            created_at: new Date().toISOString(),
          }
          setMessages((prev) => [...prev, aiMessage])
        }
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error')
        setMessages((prev) => prev.filter(m => !m.id.startsWith('temp-')))
      }
    } finally {
      setIsLoading(false)
      setStreamingContent('')
      streamingContentRef.current = ''
    }
  }, [projectId, session, messages])

  // Upload file
  const uploadFile = useCallback(async (file: File) => {
    if (!session) return

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
      // Partial message is handled in the AbortError catch block
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
