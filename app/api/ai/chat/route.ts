import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = 'http://localhost:18789/v1/chat/completions'
const GATEWAY_TOKEN = 'TjYqXyEx9uvADPH0LBRGc15otgnlaWUm'

const MODEL_MAP: Record<string, string> = {
  'kimi': 'moonshot/kimi-k2.5',
  'kimi-k2.5': 'moonshot/kimi-k2.5',
  'm25': 'minimax/MiniMax-M2.5-Lightning',
  'MiniMax-M2.5-Lightning': 'minimax/MiniMax-M2.5-Lightning',
  'glm5': 'zai/glm-5',
  'glm-5': 'zai/glm-5',
  'sonnet': 'anthropic/claude-sonnet-4-5-20250929',
  'opus': 'anthropic/claude-opus-4-6',
  'gpt-4o': 'openai/gpt-4o',
}

export async function POST(req: NextRequest) {
  try {
    const { projectId, message, model = 'kimi-k2.5', stream = false, context = [] } = await req.json()

    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    const gatewayModel = MODEL_MAP[model] || 'minimax/MiniMax-M2.5-Lightning'

    // Build messages with context
    const messages = [
      { role: 'system', content: 'You are Betsy, a helpful AI assistant for Master Studio.' },
      ...context.slice(-10).map((m: any) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
      { role: 'user', content: message },
    ]

    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        model: gatewayModel,
        messages,
        stream: !!stream,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('Gateway error:', response.status, err)
      return NextResponse.json({ error: `Gateway error: ${response.status}` }, { status: 500 })
    }

    // Streaming: transform OpenAI SSE → frontend format (user_message, ai_id, chunk, done)
    if (stream) {
      const reader = response.body?.getReader()
      if (!reader) {
        return NextResponse.json({ error: 'No response body' }, { status: 500 })
      }

      const decoder = new TextDecoder()
      const encoder = new TextEncoder()
      const msgId = 'ai-' + Date.now()
      const userMsgId = 'user-' + Date.now()

      const transformedStream = new ReadableStream({
        async start(controller) {
          // First: send user_message event
          const userMsg = {
            type: 'user_message',
            message: {
              id: userMsgId,
              project_id: projectId || 'default',
              user_id: 'local',
              role: 'user',
              content: message,
              type: 'text',
              created_at: new Date().toISOString(),
            },
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(userMsg)}\n\n`))

          // Send ai_id event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'ai_id', messageId: msgId })}\n\n`))

          let buffer = ''
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed) continue

                if (trimmed === 'data: [DONE]') {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
                  continue
                }

                if (trimmed.startsWith('data: ')) {
                  try {
                    const parsed = JSON.parse(trimmed.slice(6))
                    const content = parsed.choices?.[0]?.delta?.content
                    if (content) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`))
                    }
                  } catch {
                    // skip
                  }
                }
              }
            }

            // Flush remaining buffer
            if (buffer.trim()) {
              if (buffer.trim() === 'data: [DONE]') {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
              }
            }

            controller.close()
          } catch (e) {
            controller.error(e)
          }
        },
      })

      return new Response(transformedStream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }

    // Non-streaming
    const data = await response.json()
    const aiContent = data.choices?.[0]?.message?.content || 'No response'

    return NextResponse.json({
      userMessage: { content: message, role: 'user' },
      aiMessage: { content: aiContent, role: 'assistant' },
      model: gatewayModel,
    })
  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
