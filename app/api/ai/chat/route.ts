import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

// OpenClaw Gateway - OpenAI-compatible endpoint
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:18789'
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN

// POST /api/ai/chat - Send message to Betsy via Gateway and get response
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { projectId, message, context = [], stream = false } = await req.json()
  
  if (!projectId || !message) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
  }

  // Default user UUID for single-user mode
  const USER_UUID = '00000000-0000-0000-0000-000000000002'
  const SYSTEM_UUID = '00000000-0000-0000-0000-000000000099'

  // Save user message
  let userMessage
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        user_id: USER_UUID,
        role: 'user',
        content: message,
        type: 'text',
      })
      .select()
      .single()

    if (error) throw error
    userMessage = data
  } catch (error) {
    console.error('Error saving user message:', error)
    return new Response(JSON.stringify({ error: 'Failed to save message' }), { status: 500 })
  }

  try {
    // Build context messages for Gateway
    const contextMessages = context.slice(-10).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }))

    // Call OpenClaw Gateway /v1/chat/completions with streaming
    const aiResponse = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_TOKEN}`,
        'x-openclaw-agent-id': 'main',
      },
      body: JSON.stringify({
        model: 'openclaw:main',
        messages: [
          ...contextMessages,
          { role: 'user', content: message },
        ],
        user: session.user.id || 'dashboard-user',
        stream: true,
      }),
    })

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text()
      console.error('Gateway error:', aiResponse.status, errBody)
      throw new Error(`Gateway error: ${aiResponse.status}`)
    }

    // Get AI message ID from database first (for reference)
    const { data: aiMessagePlaceholder, error: placeholderError } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        user_id: SYSTEM_UUID,
        role: 'assistant',
        content: '',
        type: 'text',
      })
      .select()
      .single()

    if (placeholderError) throw placeholderError

    const encoder = new TextEncoder()
    const messageId = aiMessagePlaceholder.id

    // Create stream
    const stream = new ReadableStream({
      async start(controller) {
        // Send user message first
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'user_message', message: userMessage })}

`))
        
        // Send AI message ID
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'ai_id', messageId })}

`))

        if (!aiResponse.body) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'No response body' })}

`))
          controller.close()
          return
        }

        const reader = aiResponse.body.getReader()
        let fullContent = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                
                if (data === '[DONE]') {
                  // Stream complete, update database with full content
                  await supabase
                    .from('messages')
                    .update({ content: fullContent })
                    .eq('id', messageId)
                  
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}

`))
                  controller.close()
                  return
                }

                try {
                  const parsed = JSON.parse(data)
                  const delta = parsed.choices?.[0]?.delta?.content
                  
                  if (delta) {
                    fullContent += delta
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content: delta })}

`))
                  }
                } catch (e) {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }
        } catch (err) {
          console.error('Stream error:', err)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Stream interrupted' })}

`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in AI chat:', error)
    
    const { data: errorMessage } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        user_id: SYSTEM_UUID,
        role: 'assistant',
        content: 'Bağlantı hatası. Lütfen tekrar deneyin.',
        type: 'text',
      })
      .select()
      .single()

    return new Response(JSON.stringify({
      userMessage,
      aiMessage: errorMessage,
    }))
  }
}
