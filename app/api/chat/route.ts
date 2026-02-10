import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

// GET /api/chat?projectId=xxx
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projectId = req.nextUrl.searchParams.get('projectId')
  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
  }

  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST /api/chat
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { projectId, content, type = 'text', fileInfo } = body

  if (!projectId || !content) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // SECURITY: Hardcode role to 'user' to prevent injection
  const role = 'user'

  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        user_id: session.user.id,
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
