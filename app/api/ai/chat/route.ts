import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

// OpenClaw Gateway URL (configured via env)
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:3001'
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN

// POST /api/ai/chat - Send message to AI and get response
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId, message, context = [] } = await req.json()
  
  if (!projectId || !message) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Save user message first (to get real ID)
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
    // Call OpenClaw Gateway for AI response
    const aiResponse = await fetch(`${OPENCLAW_URL}/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(OPENCLAW_TOKEN && { 'Authorization': `Bearer ${OPENCLAW_TOKEN}` }),
      },
      body: JSON.stringify({
        message,
        context: context.slice(-10),
        userId: session.user.id,
        projectId,
      }),
    })

    if (!aiResponse.ok) {
      throw new Error('AI service error')
    }

    const aiData = await aiResponse.json()
    
    // Save AI response
    const { data: aiMessage, error } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        user_id: 'system',
        role: 'assistant',
        content: aiData.response || aiData.message,
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
    
    // Fallback: Save error message
    const { data: errorMessage } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        user_id: 'system',
        role: 'assistant',
        content: 'Üzgünüm, şu anda yanıt veremiyorum. Lütfen daha sonra tekrar deneyin.',
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
