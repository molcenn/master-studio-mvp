import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

// GET /api/projects/[id] - Get single project by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { id } = params
  
  if (!id) {
    return new Response(JSON.stringify({ error: 'Project ID required' }), { status: 400 })
  }

  try {
    const { data: project, error } = await supabase
      .from('projects')
      .select(`
        *,
        messages:messages(count)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return new Response(JSON.stringify({ error: 'Project not found' }), { status: 404 })
      }
      throw error
    }

    return new Response(JSON.stringify({ project }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching project:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch project' }), { status: 500 })
  }
}

// PATCH /api/projects/[id] - Update project
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { id } = params
  const { name } = await req.json()
  
  if (!id) {
    return new Response(JSON.stringify({ error: 'Project ID required' }), { status: 400 })
  }

  try {
    const { data: project, error } = await supabase
      .from('projects')
      .update({ name })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return new Response(JSON.stringify({ project }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error updating project:', error)
    return new Response(JSON.stringify({ error: 'Failed to update project' }), { status: 500 })
  }
}

// DELETE /api/projects/[id] - Delete project
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const { id } = params
  
  if (!id) {
    return new Response(JSON.stringify({ error: 'Project ID required' }), { status: 400 })
  }

  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error deleting project:', error)
    return new Response(JSON.stringify({ error: 'Failed to delete project' }), { status: 500 })
  }
}
