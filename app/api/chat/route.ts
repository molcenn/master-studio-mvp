import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

// In-memory mock messages store
const MOCK_MESSAGES: Record<string, any[]> = {
  '00000000-0000-0000-0000-000000000001': [
    { id: 'msg-1', project_id: '00000000-0000-0000-0000-000000000001', role: 'assistant', content: 'Welcome to Master Studio! How can I help you today?', type: 'text', created_at: new Date().toISOString() },
    { id: 'msg-2', project_id: '00000000-0000-0000-0000-000000000001', role: 'user', content: 'I want to create a new project', type: 'text', created_at: new Date().toISOString() },
  ]
}

// Check if in dev mode - ALWAYS skip auth for local development
const isDevMode = () => {
  return process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
}

// GET /api/chat?projectId=xxx
export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  // Dev mode: skip auth check entirely
  if (isDevMode()) {
    return NextResponse.json({ messages: MOCK_MESSAGES[projectId] || [] })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST /api/chat
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { projectId, content, type = 'text', fileInfo } = body

  if (!projectId || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Dev mode: skip auth check entirely, store in memory
  if (isDevMode()) {
    const newMessage = {
      id: `msg-${Date.now()}`,
      project_id: projectId,
      role: 'user',
      content,
      type,
      file_info: fileInfo || null,
      created_at: new Date().toISOString()
    }
    if (!MOCK_MESSAGES[projectId]) {
      MOCK_MESSAGES[projectId] = []
    }
    MOCK_MESSAGES[projectId].push(newMessage)
    return NextResponse.json({ message: newMessage })
  }

  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // SECURITY: Hardcode role to 'user' to prevent injection
  const role = 'user'

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        user_id: session?.user?.id || '00000000-0000-0000-0000-000000000002',
        role,
        content,
        type,
        file_info: fileInfo || null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ message: data })
  } catch (error) {
    console.error('Error saving message:', error)
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 })
  }
}
