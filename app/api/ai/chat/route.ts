import { NextRequest, NextResponse } from 'next/server'

const GATEWAY_URL = 'http://localhost:18789/v1/chat/completions'
const GATEWAY_TOKEN = 'TjYqXyEx9uvADPH0LBRGc15otgnlaWUm'

export async function POST(req: NextRequest) {
  try {
    const { projectId, message, model = 'kimi-k2.5', stream = false } = await req.json()
    
    if (!message) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 })
    }

    // Map dashboard model names to Gateway models
    const modelMap: Record<string, string> = {
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

    const gatewayModel = modelMap[model] || 'minimax/MiniMax-M2.5-Lightning'

    // Call Gateway
    const response = await fetch(GATEWAY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_TOKEN}`,
      },
      body: JSON.stringify({
        model: gatewayModel,
        messages: [{ role: 'user', content: message }],
        stream: stream || false,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: `Gateway error: ${response.status}`, details: err }, { status: 500 })
    }

    // If streaming requested
    if (stream) {
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      const stream = new ReadableStream({
        async start(controller) {
          try {
            while (true) {
              const { done, value } = await reader!.read()
              if (done) break
              controller.enqueue(value)
            }
            controller.close()
          } catch (e) {
            controller.error(e)
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
        },
      })
    }

    // Non-streaming response
    const data = await response.json()
    const aiContent = data.choices?.[0]?.message?.content || 'No response'

    return NextResponse.json({
      userMessage: { content: message, role: 'user' },
      aiMessage: { content: aiContent, role: 'assistant' },
      model: gatewayModel
    })

  } catch (error: any) {
    console.error('Chat error:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
