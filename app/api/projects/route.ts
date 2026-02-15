import { NextRequest, NextResponse } from 'next/server';
import { getProjects, createProject } from '@/lib/db';
import { CreateProjectInput } from '@/types/project';

// GET /api/projects - List all projects
export async function GET() {
  try {
    const projects = getProjects();
    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create new project
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as CreateProjectInput;
    
    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }
    
    // Validate status if provided
    const validStatuses = ['active', 'paused', 'completed'];
    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be: active, paused, or completed' },
        { status: 400 }
      );
    }
    
    const project = createProject({
      name: body.name,
      description: body.description || '',
      status: body.status,
    });
    
    return NextResponse.json({ project }, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}
