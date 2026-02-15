// LocalStorage service for projects, files, and stats
// Since localStorage is client-side only, all data operations happen here

export type ProjectStatus = 'active' | 'review' | 'planning'

export interface Project {
  id: string
  name: string
  created_at: string
  user_id?: string
  description?: string
  status: ProjectStatus
  progress: number
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

// === REVIEWS ===

export interface Review {
  id: string
  projectId: string
  title: string
  description?: string
  type: 'code' | 'asset' | 'document'
  priority: 'urgent' | 'normal' | 'low'
  agentName: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
}

// Storage keys
const PROJECTS_KEY = 'master-studio-projects'
const FILES_KEY = 'master-studio-files'
const STATS_KEY = 'master-studio-stats'
const REVIEWS_KEY = 'master-studio-reviews'
const AGENTS_KEY = 'master-studio-agents'

// Default projects for first-time users
const DEFAULT_PROJECTS: Project[] = [
  { 
    id: '00000000-0000-0000-0000-000000000001', 
    name: 'Master Studio MVP', 
    created_at: new Date().toISOString(), 
    description: 'AI-powered project management dashboard with real-time collaboration features', 
    status: 'active', 
    progress: 75 
  },
  { 
    id: 'default-2', 
    name: 'Website Redesign', 
    created_at: new Date(Date.now() - 86400000).toISOString(), 
    description: 'Modern glass morphism redesign for corporate website with dark theme', 
    status: 'review', 
    progress: 90 
  },
  { 
    id: 'default-3', 
    name: 'Mobile App', 
    created_at: new Date(Date.now() - 172800000).toISOString(), 
    description: 'Cross-platform mobile application with React Native and Expo', 
    status: 'planning', 
    progress: 25 
  },
  { 
    id: 'default-4', 
    name: 'API Integration', 
    created_at: new Date(Date.now() - 259200000).toISOString(), 
    description: 'REST API integration layer for third-party services and webhooks', 
    status: 'active', 
    progress: 45 
  },
]

// === PROJECTS ===

export function getProjects(): Project[] {
  if (typeof window === 'undefined') return DEFAULT_PROJECTS
  
  const stored = localStorage.getItem(PROJECTS_KEY)
  if (!stored) {
    // Initialize with default projects
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(DEFAULT_PROJECTS))
    console.log('[localStorage] Initialized with default projects')
    return DEFAULT_PROJECTS
  }
  
  try {
    const parsed = JSON.parse(stored) as Project[]
    // Migrate old projects that don't have status/progress fields
    let needsMigration = false
    const migrated = parsed.map(p => {
      if (!p.status || p.progress === undefined || p.progress === null) {
        needsMigration = true
        console.log(`[localStorage] Migrating project "${p.name}" - adding status/progress`)
        return {
          ...p,
          status: p.status || 'planning' as ProjectStatus,
          progress: typeof p.progress === 'number' ? p.progress : 0
        }
      }
      return p
    })
    if (needsMigration) {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(migrated))
      console.log('[localStorage] Migration complete')
    }
    return migrated
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
    description: '',
    status: 'planning',
    progress: 0
  }
  
  const updated = [...projects, newProject]
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated))
  console.log(`[localStorage] Created project "${name}" with status=planning, progress=0`)
  
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

// === PROJECT STATUS & PROGRESS ===

export function updateProjectStatus(id: string, status: ProjectStatus): Project | null {
  try {
    const projects = getProjects()
    const index = projects.findIndex(p => p.id === id)
    
    if (index === -1) {
      console.log(`[localStorage] updateProjectStatus: project ${id} not found`)
      return null
    }
    
    const updated = [...projects]
    updated[index] = { ...updated[index], status }
    
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated))
    console.log(`[localStorage] Updated project "${updated[index].name}" status to: ${status}`)
    return updated[index]
  } catch (err) {
    console.error('[localStorage] Error updating project status:', err)
    return null
  }
}

export function updateProjectProgress(id: string, progress: number): Project | null {
  try {
    // Clamp progress between 0-100
    const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)))
    
    const projects = getProjects()
    const index = projects.findIndex(p => p.id === id)
    
    if (index === -1) {
      console.log(`[localStorage] updateProjectProgress: project ${id} not found`)
      return null
    }
    
    const updated = [...projects]
    updated[index] = { ...updated[index], progress: clampedProgress }
    
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(updated))
    console.log(`[localStorage] Updated project "${updated[index].name}" progress to: ${clampedProgress}%`)
    return updated[index]
  } catch (err) {
    console.error('[localStorage] Error updating project progress:', err)
    return null
  }
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

// === AGENTS ===

/**
 * Get all user-created agents from localStorage.
 * Returns an array of agent objects stored under AGENTS_KEY.
 */
export function getAgents(): { id: string; name: string; model: string }[] {
  if (typeof window === 'undefined') return []

  const stored = localStorage.getItem(AGENTS_KEY)
  if (!stored) return []

  try {
    return JSON.parse(stored)
  } catch {
    return []
  }
}

// === REVIEWS ===

const DEFAULT_REVIEWS: Review[] = [
  {
    id: 'review-default-1',
    projectId: '00000000-0000-0000-0000-000000000001',
    title: 'API endpoint refactoring',
    description: 'Refactored REST endpoints to follow consistent naming conventions and added proper error handling.',
    type: 'code',
    priority: 'urgent',
    agentName: 'coding-agent',
    status: 'pending',
    createdAt: new Date(Date.now() - 600000).toISOString(), // 10 min ago
  },
  {
    id: 'review-default-2',
    projectId: 'default-2',
    title: 'Hero image generation v3',
    description: 'Generated new hero image with updated brand colors and gradient overlay.',
    type: 'asset',
    priority: 'normal',
    agentName: 'dalle-agent',
    status: 'pending',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: 'review-default-3',
    projectId: 'default-3',
    title: 'User onboarding flow spec',
    description: 'Complete specification document for the new user onboarding experience with wireframes.',
    type: 'document',
    priority: 'low',
    agentName: 'research-agent',
    status: 'pending',
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  },
]

export function getReviews(): Review[] {
  if (typeof window === 'undefined') return DEFAULT_REVIEWS

  const stored = localStorage.getItem(REVIEWS_KEY)
  if (!stored) {
    localStorage.setItem(REVIEWS_KEY, JSON.stringify(DEFAULT_REVIEWS))
    return DEFAULT_REVIEWS
  }

  try {
    return JSON.parse(stored)
  } catch {
    return DEFAULT_REVIEWS
  }
}

export function getPendingReviews(): Review[] {
  return getReviews().filter(r => r.status === 'pending')
}

export function addReview(review: Omit<Review, 'id' | 'createdAt'>): Review {
  const reviews = getReviews()
  const newReview: Review = {
    ...review,
    id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  }

  const updated = [...reviews, newReview]
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(updated))
  return newReview
}

export function updateReviewStatus(id: string, status: 'approved' | 'rejected'): void {
  const reviews = getReviews()
  const index = reviews.findIndex(r => r.id === id)
  if (index === -1) return

  reviews[index] = { ...reviews[index], status }
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews))
}

export function deleteReview(id: string): void {
  const reviews = getReviews()
  const filtered = reviews.filter(r => r.id !== id)
  localStorage.setItem(REVIEWS_KEY, JSON.stringify(filtered))
}

// === STATS ===

/**
 * Increment the daily message counter for today.
 * Called each time a message is sent from the chat panel.
 * Uses a date-stamped localStorage key so counts reset daily.
 */
export function incrementDailyMessageCount(): number {
  if (typeof window === 'undefined') return 0

  const today = new Date().toDateString()
  const msgKey = `master-studio-messages-${today}`

  let current = 0
  try {
    const stored = localStorage.getItem(msgKey)
    if (stored) current = parseInt(stored, 10) || 0
  } catch {}

  const next = current + 1
  localStorage.setItem(msgKey, String(next))
  return next
}

export function getStats(): Stats {
  const projects = getProjects()
  const files = getFiles()
  const agents = getAgents()
  
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
    activeAgents: agents.length + 1, // +1 for Betsy (default agent)
    pendingReviews: getPendingReviews().length,
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
  updateProjectStatus: updateProjectStatus,
  updateProjectProgress: updateProjectProgress,
  deleteProject,
  getFiles,
  createFile,
  deleteFile,
  getAgents,
  getStats,
  incrementDailyMessageCount,
  getReviews,
  getPendingReviews,
  addReview,
  updateReviewStatus,
  deleteReview,
}
