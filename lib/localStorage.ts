// LocalStorage service for projects, files, and stats
// Since localStorage is client-side only, all data operations happen here

export interface Project {
  id: string
  name: string
  created_at: string
  user_id?: string
  description?: string
  messages?: { count: number }[]
}

export interface StoredFile {
  id: string
  name: string
  size: number
  type: string
  created_at: string
  url: string
  projectId: string
  content?: string // base64 for small files
}

export interface Stats {
  projectCount: number
  activeAgents: number
  pendingReviews: number
  todayMessageCount: number
  fileCount: number
}

// Storage keys
const PROJECTS_KEY = 'master-studio-projects'
const FILES_KEY = 'master-studio-files'
const STATS_KEY = 'master-studio-stats'

// Default projects for first-time users
const DEFAULT_PROJECTS: Project[] = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Master Studio MVP', created_at: new Date().toISOString(), description: '' },
  { id: 'default-2', name: 'Website Redesign', created_at: new Date(Date.now() - 86400000).toISOString(), description: '' },
  { id: 'default-3', name: 'Mobile App', created_at: new Date(Date.now() - 172800000).toISOString(), description: '' },
]

// === PROJECTS ===

export function getProjects(): Project[] {
  if (typeof window === 'undefined') return DEFAULT_PROJECTS
  
  const stored = localStorage.getItem(PROJECTS_KEY)
  if (!stored) {
    // Initialize with default projects
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(DEFAULT_PROJECTS))
    return DEFAULT_PROJECTS
  }
  
  try {
    return JSON.parse(stored)
  } catch {
    return DEFAULT_PROJECTS
  }
}

export function getProject(id: string): Project | null {
  const projects = getProjects()
  return projects.find(p => p.id === id) || null
}

export function createProject(name: string): Project {
  const projects = getProjects()
  const newProject: Project = {
    id: `project-${Date.now()}`,
    name: name.trim(),
    created_at: new Date().toISOString(),
    description: ''
  }
  
  const updated = [...projects, newProject]
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated))
  
  return newProject
}

export function updateProject(id: string, updates: Partial<Project>): Project | null {
  const projects = getProjects()
  const index = projects.findIndex(p => p.id === id)
  
  if (index === -1) return null
  
  const updated = [...projects]
  updated[index] = { ...updated[index], ...updates }
  
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated))
  return updated[index]
}

export function deleteProject(id: string): boolean {
  const projects = getProjects()
  const filtered = projects.filter(p => p.id !== id)
  
  if (filtered.length === projects.length) return false
  
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered))
  
  // Also delete related files
  const files = getFiles()
  const remainingFiles = files.filter(f => f.projectId !== id)
  localStorage.setItem(FILES_KEY, JSON.stringify(remainingFiles))
  
  return true
}

// === FILES ===

export function getFiles(projectId?: string): StoredFile[] {
  if (typeof window === 'undefined') return []
  
  const stored = localStorage.getItem(FILES_KEY)
  if (!stored) return []
  
  try {
    const files: StoredFile[] = JSON.parse(stored)
    if (projectId) {
      return files.filter(f => f.projectId === projectId)
    }
    return files
  } catch {
    return []
  }
}

export function createFile(file: Omit<StoredFile, 'id' | 'created_at'>): StoredFile {
  const files = getFiles()
  const newFile: StoredFile = {
    ...file,
    id: `file-${Date.now()}`,
    created_at: new Date().toISOString()
  }
  
  const updated = [...files, newFile]
  localStorage.setItem(FILES_KEY, JSON.stringify(updated))
  
  return newFile
}

export function deleteFile(id: string): boolean {
  const files = getFiles()
  const filtered = files.filter(f => f.id !== id)
  
  if (filtered.length === files.length) return false
  
  localStorage.setItem(FILES_KEY, JSON.stringify(filtered))
  return true
}

// === STATS ===

export function getStats(): Stats {
  const projects = getProjects()
  const files = getFiles()
  
  // Calculate today's messages (from localStorage message count)
  let todayMessages = 0
  const today = new Date().toDateString()
  const msgKey = `master-studio-messages-${today}`
  const storedMsgs = localStorage.getItem(msgKey)
  if (storedMsgs) {
    try {
      todayMessages = parseInt(storedMsgs, 10) || 0
    } catch {}
  }
  
  return {
    projectCount: projects.length,
    activeAgents: 4, // Mock
    pendingReviews: 2, // Mock
    todayMessageCount: todayMessages,
    fileCount: files.length
  }
}

// Export for convenience
export const localStorageService = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getFiles,
  createFile,
  deleteFile,
  getStats
}
