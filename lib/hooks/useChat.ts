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
}

export function useChat({ projectId }: UseChatOptions) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

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

  // Send message to AI
  const sendMessage = useCallback(async (content: string, type: 'text' | 'file' | 'audio' = 'text', fileInfo?: any) => {
    if (!session || !content.trim()) return

    setIsLoading(true)
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

      // Call AI endpoint
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          message: content,
          context: messages.slice(-10),
        }),
        signal: abortControllerRef.current.signal,
      })

      if (!res.ok) throw new Error('Failed to send message')

      const data = await res.json()
      
      // Replace temp message with actual and add AI response
      setMessages((prev) => [
        ...prev.filter(m => m.id !== tempUserMessage.id),
        data.userMessage,
        data.aiMessage,
      ])
      
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      // Remove optimistic message on error
      setMessages((prev) => prev.filter(m => !m.id.startsWith('temp-')))
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [projectId, session, messages])

  // Upload file
  const uploadFile = useCallback(async (file: File) => {
    if (!session) return

    setIsLoading(true)
    setError(null)

    try {
      // Upload via formData
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

      // Send message with file
      await sendMessage(`Dosya: ${file.name}`, 'file', { name: file.name, url: fileUrl, type: file.type, size: file.size })

      return fileUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [projectId, session, sendMessage])

  // SSE connection for real-time updates (from other users)
  useEffect(() => {
    if (!session) return

    const eventSource = new EventSource(`/api/stream?projectId=${projectId}`)

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'new_message') {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.find(m => m.id === data.message.id)) return prev
          return [...prev, data.message]
        })
      }
    }

    eventSource.onerror = () => {
      console.error('SSE connection error')
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [projectId, session])

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
    sendMessage,
    uploadFile,
    stopGeneration,
    isLoading,
    error,
  }
}
