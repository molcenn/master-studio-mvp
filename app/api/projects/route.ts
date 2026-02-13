import { NextRequest, NextResponse } from 'next/server'

// This API route is kept for backwards compatibility
// All project data is now stored in localStorage on the client side
// See /lib/localStorage.ts for the actual implementation

// GET /api/projects - Returns empty array (client uses localStorage)
export async function GET(req: NextRequest) {
  // Client-side localStorage handles this
  return NextResponse.json({ projects: [], source: 'localStorage' })
}

// POST /api/projects - Returns success (client uses localStorage)
export async function POST(req: NextRequest) {
  const { name } = await req.json()
  
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Project name required' }, { status: 400 })
  }
  
  // Client-side localStorage handles this
  // Return a mock project for backwards compatibility
  const mockProject = {
    id: `project-${Date.now()}`,
    name: name.trim(),
    created_at: new Date().toISOString(),
    description: ''
  }
  
  return NextResponse.json({ project: mockProject, source: 'localStorage' })
}
