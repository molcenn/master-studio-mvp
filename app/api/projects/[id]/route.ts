import { NextRequest } from 'next/server'

// This API route is kept for backwards compatibility
// All project data is now stored in localStorage on the client side
// See /lib/localStorage.ts for the actual implementation

// GET /api/projects/[id] - Returns mock (client uses localStorage)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  if (!id) {
    return new Response(JSON.stringify({ error: 'Project ID required' }), { status: 400 })
  }
  
  // Client-side localStorage handles this
  return new Response(JSON.stringify({ 
    project: { 
      id, 
      name: 'Project', 
      created_at: new Date().toISOString(),
      description: ''
    },
    source: 'localStorage'
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

// PATCH /api/projects/[id] - Returns success (client uses localStorage)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  const { name } = await req.json()
  
  if (!id) {
    return new Response(JSON.stringify({ error: 'Project ID required' }), { status: 400 })
  }
  
  // Client-side localStorage handles this
  return new Response(JSON.stringify({ 
    project: { 
      id, 
      name: name || 'Project', 
      created_at: new Date().toISOString(),
      description: ''
    },
    source: 'localStorage'
  }), {
    headers: { 'Content-Type': 'application/json' },
  })
}

// DELETE /api/projects/[id] - Returns success (client uses localStorage)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params
  
  if (!id) {
    return new Response(JSON.stringify({ error: 'Project ID required' }), { status: 400 })
  }
  
  // Client-side localStorage handles this
  return new Response(JSON.stringify({ success: true, source: 'localStorage' }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
