import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

// GET /api/files?projectId=xxx - List files from Supabase Storage
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

  try {
    const prefix = `${session.user.id}/${projectId}`
    
    const { data, error } = await supabase.storage
      .from('files')
      .list(prefix, {
        limit: 100,
        sortBy: { column: 'name', order: 'desc' }
      })

    if (error) {
      console.error('Storage list error:', error)
      return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
    }

    // Map files and get public URLs
    const files = (data || [])
      .filter(item => !item.id.endsWith('/')) // Filter out folders
      .map(item => {
        const key = `${prefix}/${item.name}`
        const { data: { publicUrl } } = supabase.storage
          .from('files')
          .getPublicUrl(key)

        return {
          name: item.name,
          size: item.metadata?.size || 0,
          type: item.metadata?.mimetype || 'application/octet-stream',
          created_at: item.created_at || item.updated_at || new Date().toISOString(),
          url: publicUrl,
          key
        }
      })

    return NextResponse.json({ files })
  } catch (error) {
    console.error('Error listing files:', error)
    return NextResponse.json({ error: 'Failed to list files' }, { status: 500 })
  }
}

// DELETE /api/files?key=xxx - Delete file from Supabase Storage
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const fileKey = searchParams.get('key')

  if (!fileKey) {
    return NextResponse.json({ error: 'Missing file key' }, { status: 400 })
  }

  try {
    // Verify ownership - the key should start with user id
    if (!fileKey.startsWith(session.user.id)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { error } = await supabase.storage
      .from('files')
      .remove([fileKey])

    if (error) {
      console.error('Storage delete error:', error)
      return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting file:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
