import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

// OpenClaw Gateway configuration
const OPENCLAW_URL = process.env.OPENCLAW_URL || 'http://localhost:18789'
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN

// Send message to OpenClaw via CLI
async function sendToOpenClaw(message: string): Promise<string> {
  try {
    // Use openclaw CLI to send message to main session
    const cmd = `openclaw sessions send --session-key agent:main:main --message "[Dashboard] Murat: ${message.replace(/"/g, '\\"')}" --timeout-seconds 60`
    const { stdout } = await execAsync(cmd, { timeout: 65000 })
    return stdout.trim() || 'Mesajınız iletildi. Yanıt bekleniyor...'
  } catch (error) {
    console.error('OpenClaw CLI error:', error)
    // Fallback: Store message for manual processing
    return 'Mesajınız kaydedildi. Betsy yakında yanıtlayacak.'
  }
}

// Queue for pending messages (simple file-based queue)
const PENDING_MESSAGES_FILE = '/root/clawd/.pending-messages.json'

// Read pending messages
async function readPendingMessages(): Promise<any[]> {
  try {
    const fs = await import('fs/promises')
    const data = await fs.readFile(PENDING_MESSAGES_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Write pending message
async function queueMessage(message: any) {
  try {
    const fs = await import('fs/promises')
    const pending = await readPendingMessages()
    pending.push({
      ...message,
      timestamp: new Date().toISOString(),
    })
    await fs.writeFile(PENDING_MESSAGES_FILE, JSON.stringify(pending, null, 2))
  } catch (e) {
    console.error('Failed to queue message:', e)
  }
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

  // Queue message for Betsy to respond
  await queueMessage({
    projectId,
    userId: session.user.id,
    userName: session.user.name || session.user.email,
    message,
    messageId: userMessage.id,
  })

  // Return user message immediately (Betsy will respond async)
  return NextResponse.json({
    userMessage,
    aiMessage: null, // Will be filled by Betsy later
  })
}
