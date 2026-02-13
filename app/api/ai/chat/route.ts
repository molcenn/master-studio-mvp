import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

// Mock responses for demo/offline mode
const MOCK_RESPONSES = [
  "Merhaba! Ben Betsy, size nasıl yardımcı olabilirim? 🎯",
  "Anlıyorum, bu konuda size yardımcı olabilirim. Detayları paylaşır mısınız?",
  "Harika bir soru! Bunun üzerine çalışalım.",
  "Projeniz için bazı önerilerim var. Başlayalım mı?",
  "Bu konuyu adım adım ele alalım. İlk olarak ne yapmamı istersiniz?",
]

// Model to provider mapping
const MODEL_CONFIG: Record<string, { provider: string; apiUrl: string; apiKey: string; modelId: string }> = {
  'gpt-4o': {
    provider: 'openai',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: process.env.OPENAI_API_KEY || '',
    modelId: 'gpt-4o',
  },
  'claude-opus': {
    provider: 'anthropic',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    modelId: 'claude-opus-4-20250514',
  },
  'MiniMax-M2.5-Lightning': {
    provider: 'minimax',
    apiUrl: 'https://api.minimaxi.chat/v1/text/chatcompletion_v2',
    apiKey: process.env.MINIMAX_API_KEY || '',
    modelId: 'MiniMax-M2.5-Lightning',
  },
  'glm-5': {
    provider: 'zai',
    apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    apiKey: process.env.ZAI_API_KEY || '',
    modelId: 'glm-5',
  },
  'kimi-k2.5': {
    provider: 'moonshot',
    apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
    apiKey: process.env.MOONSHOT_API_KEY || '',
    modelId: 'kimi-k2.5',
  },
}

// Aliases for convenience
const MODEL_ALIASES: Record<string, string> = {
  'kimi': 'kimi-k2.5',
  'm25': 'MiniMax-M2.5-Lightning',
  'glm5': 'glm-5',
  'sonnet': 'claude-opus',
  'opus': 'claude-opus',
}

// Default UUIDs for single-user mode
const USER_UUID = '00000000-0000-0000-0000-000000000002'
const SYSTEM_UUID = '00000000-0000-0000-0000-000000000099'

// System prompt for Master Studio
const SYSTEM_PROMPT = `This message is from the Master Studio Dashboard web interface. The Dashboard has an iframe preview panel — when you produce HTML/CSS/JS code, the user can see it in the Workspace > Preview tab. Do not search for browser, canvas, or node access — just produce code and write it as \`\`\`html code blocks. The user will see it in the preview.

When user discusses project milestones or process changes, include a JSON block at the end of your response: \`\`\`milestone-update
{action, milestoneTitle, detail}
\`\`\` so the dashboard can sync.`

// Build request body for each provider
function buildProviderRequest(provider: string, modelId: string, messages: any[], stream: boolean) {
  switch (provider) {
    case 'openai':
    case 'moonshot':
    case 'zai':
      return {
        model: modelId,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        stream,
        temperature: 0.7,
      }
    case 'anthropic':
      return {
        model: modelId,
        messages: messages,
        system: SYSTEM_PROMPT,
        stream,
        max_tokens: 4096,
      }
    case 'minimax':
      return {
        model: modelId,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        stream,
        temperature: 0.7,
      }
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

// Build headers for each provider
function buildProviderHeaders(provider: string, apiKey: string): Record<string, string> {
  const baseHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  }

  switch (provider) {
    case 'openai':
    case 'moonshot':
    case 'zai':
      baseHeaders['Authorization'] = `Bearer ${apiKey}`
      return baseHeaders
    case 'anthropic':
      baseHeaders['x-api-key'] = apiKey
      baseHeaders['anthropic-version'] = '2023-06-01'
      return baseHeaders
    case 'minimax':
      baseHeaders['Authorization'] = `Bearer ${apiKey}`
      return baseHeaders
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

// Parse stream chunk based on provider
function parseStreamChunk(provider: string, line: string): string | null {
  if (!line.startsWith('data: ')) return null
  
  const data = line.slice(6).trim()
  if (data === '[DONE]') return null
  
  try {
    const parsed = JSON.parse(data)
    
    switch (provider) {
      case 'openai':
      case 'moonshot':
      case 'zai':
        return parsed.choices?.[0]?.delta?.content || null
      case 'anthropic':
        if (parsed.type === 'content_block_delta') {
          return parsed.delta?.text || null
        }
        return null
      case 'minimax':
        return parsed.choices?.[0]?.delta?.content || null
      default:
        return null
    }
  } catch {
    return null
  }
}

// POST /api/ai/chat - Send message to AI provider with streaming
export async function POST(req: NextRequest) {
  // Demo mode bypass - skip auth
  if (DEMO_MODE) {
    // Skip auth in demo mode
  } else {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }
  }

  const { projectId, message, context = [], model: selectedModel = 'kimi-k2.5' } = await req.json()
  
  if (!projectId || !message) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 })
  }

  // Resolve model alias
  const modelKey = MODEL_ALIASES[selectedModel] || selectedModel
  const config = MODEL_CONFIG[modelKey]

  if (!config) {
    return new Response(JSON.stringify({ error: `Unknown model: ${selectedModel}` }), { status: 400 })
  }

  // Demo mode fallback - return mock response if no API key
  if (DEMO_MODE && !config.apiKey) {
    const mockResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
    
    // Return mock response directly without database
    return new Response(JSON.stringify({
      userMessage: { content: message, role: 'user' },
      aiMessage: { content: mockResponse, role: 'assistant' },
      demo: true
    }))
  }

  if (!config.apiKey) {
    return new Response(JSON.stringify({ 
      error: `API key not configured for ${config.provider}`,
      hint: `Set ${config.provider.toUpperCase()}_API_KEY in environment`
    }), { status: 500 })
  }

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

  // Demo mode fallback
  if (DEMO_MODE && !config.apiKey) {
    const mockResponse = MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)]
    
    const { data: aiMessage } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        user_id: SYSTEM_UUID,
        role: 'assistant',
        content: mockResponse + '\n\n_Demo mode - API key not configured_',
        type: 'text',
      })
      .select()
      .single()

    return new Response(JSON.stringify({
      userMessage,
      aiMessage,
    }))
  }

  try {
    // Build context messages
    const contextMessages = context.slice(-10).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }))

    const requestBody = buildProviderRequest(config.provider, config.modelId, contextMessages, true)
    const headers = buildProviderHeaders(config.provider, config.apiKey)

    // Call AI provider API with streaming
    const aiResponse = await fetch(config.apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    })

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text()
      console.error('AI provider error:', aiResponse.status, errBody)
      throw new Error(`Provider error: ${aiResponse.status}`)
    }

    // Create placeholder for AI message
    const { data: aiMessagePlaceholder, error: placeholderError } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        user_id: SYSTEM_UUID,
        role: 'assistant',
        content: '',
        type: 'text',
        model: modelKey,
      })
      .select()
      .single()

    if (placeholderError) throw placeholderError

    const encoder = new TextEncoder()
    const messageId = aiMessagePlaceholder.id

    // Create stream
    const responseStream = new ReadableStream({
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
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += new TextDecoder().decode(value)
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              const trimmedLine = line.trim()
              if (!trimmedLine) continue

              // Handle SSE format
              if (trimmedLine.startsWith('data: ')) {
                const content = parseStreamChunk(config.provider, trimmedLine)
                
                if (content !== null) {
                  fullContent += content
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', content })}

`))
                }
              }
            }
          }
          
          // Stream ended - save final content
          if (fullContent) {
            await supabase
              .from('messages')
              .update({ content: fullContent })
              .eq('id', messageId)
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}

`))
          controller.close()
          
        } catch (err) {
          console.error('Stream error:', err)
          
          // Save partial content on error
          if (fullContent) {
            await supabase
              .from('messages')
              .update({ content: fullContent })
              .eq('id', messageId)
          }
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Stream interrupted' })}

`))
          controller.close()
        }
      },
    })

    return new Response(responseStream, {
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
