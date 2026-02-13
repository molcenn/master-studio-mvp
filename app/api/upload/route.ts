import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

// Upload limits
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const ALLOWED_CONTENT_TYPES = [
  'image/',
  'video/',
  'audio/',
  'text/',
  'application/pdf',
  'application/json',
  'application/javascript',
  'application/typescript',
  'application/zip',
]

// POST /api/upload - Upload file to Supabase Storage
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const projectId = formData.get('projectId') as string

    if (!file || !projectId) {
      return NextResponse.json({ error: 'Missing file or projectId' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 413 })
    }

    // Validate content type
    const isAllowed = ALLOWED_CONTENT_TYPES.some(type => file.type.startsWith(type))
    if (!isAllowed) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 415 })
    }

    // Sanitize filename
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `${session.user.id}/${projectId}/${Date.now()}-${sanitizedFilename}`

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('files')
      .upload(key, file, {
        contentType: file.type,
        upsert: false,
      })

    if (error) {
      console.error('Storage upload error:', error)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(key)

    // Return complete file data for localStorage sync
    const fileData = {
      id: `file-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      created_at: new Date().toISOString(),
      url: publicUrl,
      projectId: projectId,
      key: key,
    }

    return NextResponse.json({
      file: fileData,
      fileUrl: publicUrl,
      key,
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
  }
}
