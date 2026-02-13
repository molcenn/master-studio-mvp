import { NextRequest, NextResponse } from 'next/server'

// This API route is kept for backwards compatibility
// All file data is now stored in localStorage on the client side
// See /lib/localStorage.ts for the actual implementation

// GET /api/files?projectId=xxx - Returns empty array (client uses localStorage)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const projectId = searchParams.get('projectId')

  if (!projectId) {
    return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
  }

  // Client-side localStorage handles this
  return NextResponse.json({ files: [], source: 'localStorage' })
}

// DELETE /api/files?key=xxx - Returns success (client uses localStorage)
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const fileKey = searchParams.get('key')

  if (!fileKey) {
    return NextResponse.json({ error: 'Missing file key' }, { status: 400 })
  }

  // Client-side localStorage handles this
  return NextResponse.json({ success: true, source: 'localStorage' })
}
