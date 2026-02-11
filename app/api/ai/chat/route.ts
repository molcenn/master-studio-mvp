import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

// OpenClaw Gateway configuration
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:18789'
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN

// Simple AI response generator (fallback when gateway unavailable)
async function generateAIResponse(message: string, context: any[]): Promise<string> {
  // Check if gateway is available
  try {
    const gatewayCheck = await fetch(`${OPENCLAW_URL}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    })
    if (gatewayCheck.ok) {
      // Gateway available - use it
      const aiResponse = await fetch(`${OPENCLAW_URL}/v1/sessions/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(OPENCLAW_TOKEN && { 'Authorization': `Bearer ${OPENCLAW_TOKEN}` }),
        },
        body: JSON.stringify({
          sessionKey: 'agent:main:main',
          message: `[Dashboard] Murat: ${message}`,
        }),
        signal: AbortSignal.timeout(30000)
      })
      if (aiResponse.ok) {
        const data = await aiResponse.json()
        return data.response || data.message || 'Mesajınız iletildi. Betsy yakında yanıtlayacak.'
      }
    }
  } catch (e) {
    console.log('Gateway unavailable, using fallback')
  }
  
  // Fallback: Message will be handled manually or via Telegram
  return 'Mesajınız Betsy\'ye iletildi. Telegram üzerinden yanıtlayacağım.'
}

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
    // Generate AI response
    const aiContent = await generateAIResponse(message, context)
    
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
