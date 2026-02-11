import { NextRequest, NextResponse } from 'next/server'
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, message, context = [] } = await req.json()
  
  if (!projectId || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Save user message
  let userMessage
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        user_id: session.user.id,
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
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }

  try {
    // Build context messages for Gateway
    const contextMessages = context.slice(-10).map((msg: any) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content,
    }))

    // Call OpenClaw Gateway /v1/chat/completions
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
      }),
      signal: AbortSignal.timeout(120000), // 2 min timeout
    })

    if (!aiResponse.ok) {
      const errBody = await aiResponse.text()
      console.error('Gateway error:', aiResponse.status, errBody)
      throw new Error(`Gateway error: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json()
    const aiContent = aiData.choices?.[0]?.message?.content || 'Yanıt alınamadı.'

    // Save AI response
    const { data: aiMessage, error } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        user_id: 'system',
        role: 'assistant',
        content: aiContent,
        type: 'text',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      userMessage,
      aiMessage,
    })
  } catch (error) {
    console.error('Error in AI chat:', error)
    
    const { data: errorMessage } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        user_id: 'system',
        role: 'assistant',
        content: 'Bağlantı hatası. Lütfen tekrar deneyin.',
        type: 'text',
      })
      .select()
      .single()

    return NextResponse.json({
      userMessage,
      aiMessage: errorMessage,
    })
  }
}
