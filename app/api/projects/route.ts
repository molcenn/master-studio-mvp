import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

// Mock data for dev mode
const MOCK_PROJECTS = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Master Studio MVP', created_at: new Date().toISOString(), user_id: '00000000-0000-0000-0000-000000000000', description: '' },
  { id: 'mock-2', name: 'Website Redesign', created_at: new Date(Date.now() - 86400000).toISOString(), user_id: '00000000-0000-0000-0000-000000000000', description: '' },
  { id: 'mock-3', name: 'Mobile App', created_at: new Date(Date.now() - 172800000).toISOString(), user_id: '00000000-0000-0000-0000-000000000000', description: '' },
]

// Check if in dev/mock mode
const isMockMode = () => {
  return process.env.MOCK_MODE === 'true' || process.env.NODE_ENV === 'development'
}

// GET /api/projects - Get all projects
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  // Mock mode: bypass auth
  if (!session && !isMockMode()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Mock mode: return mock data
  if (isMockMode()) {
    return NextResponse.json({ projects: MOCK_PROJECTS })
  }

  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ projects: projects || [] })
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
  }
}

// POST /api/projects - Create new project
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  
  // Mock mode: bypass auth
  if (!session && !isMockMode()) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { name } = await req.json()

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return NextResponse.json({ error: 'Project name required' }, { status: 400 })
  }

  // Mock mode: create mock project
  if (isMockMode()) {
    const newProject = {
      id: `mock-${Date.now()}`,
      name: name.trim(),
      created_at: new Date().toISOString(),
      user_id: '00000000-0000-0000-0000-000000000000',
      description: ''
    }
    MOCK_PROJECTS.push(newProject)
    return NextResponse.json({ project: newProject })
  }

  try {
    const { data: project, error } = await supabase
      .from('projects')
      .insert({ 
        name: name.trim(),
        user_id: session?.user?.id || '00000000-0000-0000-0000-000000000000',
        description: '',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ project })
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
