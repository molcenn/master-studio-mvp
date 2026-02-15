import { Project, CreateProjectInput } from '@/types/project';
import { createClient } from '@supabase/supabase-js';

// Supabase client (for chat/upload routes)
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Mock in-memory storage for projects (replaces Supabase for MVP)
const projects: Project[] = [
  {
    id: 'proj_1',
    name: 'Example Project',
    description: 'A sample project to get started',
    status: 'active',
    progress: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Generate unique ID
function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get all projects
export function getProjects(): Project[] {
  return [...projects].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// Get project by ID
export function getProjectById(id: string): Project | null {
  return projects.find(p => p.id === id) || null;
}

// Create new project
export function createProject(input: CreateProjectInput): Project {
  const now = new Date().toISOString();
  const project: Project = {
    id: generateId(),
    name: input.name.trim(),
    description: input.description?.trim() || '',
    status: input.status || 'active',
    progress: 0,
    created_at: now,
    updated_at: now,
  };
  
  projects.push(project);
  return project;
}

// Update project
export function updateProject(id: string, updates: Partial<Omit<Project, 'id' | 'created_at'>>): Project | null {
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return null;
  
  projects[index] = {
    ...projects[index],
    ...updates,
    updated_at: new Date().toISOString(),
  };
  
  return projects[index];
}

// Delete project
export function deleteProject(id: string): boolean {
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return false;
  
  projects.splice(index, 1);
  return true;
}

// Upload file to Supabase Storage (kept for upload route)
export async function uploadFileToStorage(
  file: Buffer | Blob,
  filename: string,
  contentType: string,
  userId: string,
  projectId: string
) {
  const key = `${userId}/${projectId}/${Date.now()}-${filename}`;
  
  const { data, error } = await supabase.storage
    .from('files')
    .upload(key, file, {
      contentType,
      upsert: false,
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('files')
    .getPublicUrl(key);

  return { key, publicUrl };
}
