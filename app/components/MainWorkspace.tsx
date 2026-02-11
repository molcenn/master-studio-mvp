'use client'

import { useState, useEffect, useRef } from 'react'

interface Project {
  id: string
  name: string
  created_at: string
  messages?: { count: number }[]
}

interface Stats {
  projectCount: number
  activeAgents: number
  pendingReviews: number
  todayMessageCount: number
  fileCount: number
}

interface FileItem {
  name: string
  size: number
  type: string
  created_at: string
  url: string
  key: string
}

interface Review {
  id: string
  title: string
  description: string
  agent: string
  project: string
  status: 'pending' | 'approved' | 'rejected'
  type: 'code' | 'feature' | 'design' | 'decision'
  created_at: string
  diff: string | null
}

type ViewType = 'dashboard' | 'workspace' | 'files' | 'agents' | 'reviews'
type ReviewFilter = 'all' | 'pending' | 'approved' | 'rejected'
type IdeTabType = 'code' | 'preview' | 'details' | 'milestones'

interface Milestone {
  id: string
  title: string
  description: string
  status: 'planned' | 'in-progress' | 'completed'
  dueDate: string
  tasks: { id: string; text: string; done: boolean }[]
  projectId: string
}

interface Agent {
  id: string
  name: string
  model: 'kimi' | 'sonnet' | 'opus' | 'gpt4o'
  description: string
  createdAt: string
  isDefault?: boolean
}

const MODEL_LABELS: Record<Agent['model'], string> = {
  kimi: 'Kimi K2.5',
  sonnet: 'Sonnet 4.5',
  opus: 'Opus 4.6',
  gpt4o: 'GPT-4o'
}

interface MainWorkspaceProps {
  activeProject: string
  activeView: ViewType
  setActiveProject: (id: string) => void
  setActiveView: (view: ViewType) => void
}

const PROJECT_COLORS = ['#00d4ff', '#a855f7', '#ec4899', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6']
const STATUS_VARIANTS = ['Active', 'Review', 'Planning'] as const

function getProjectColor(index: number) {
  return PROJECT_COLORS[index % PROJECT_COLORS.length]
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatFileType(type: string): string {
  if (type.startsWith('image/')) return 'Image'
  if (type.startsWith('video/')) return 'Video'
  if (type.startsWith('audio/')) return 'Audio'
  if (type.includes('pdf')) return 'PDF'
  if (type.includes('json')) return 'JSON'
  if (type.includes('javascript') || type.includes('typescript')) return 'Code'
  if (type.includes('zip')) return 'Archive'
  if (type.startsWith('text/')) return 'Text'
  return 'File'
}

function getStatusFromIndex(index: number) {
  return STATUS_VARIANTS[index % STATUS_VARIANTS.length]
}

function getStatusClass(status: string) {
  switch (status) {
    case 'Active': return 'status-active'
    case 'Review': return 'status-review'
    case 'Planning': return 'status-planning'
    default: return 'status-active'
  }
}

function getProgressFromStatus(status: string) {
  switch (status) {
    case 'Active': return 75
    case 'Review': return 90
    case 'Planning': return 25
    default: return 50
  }
}

function timeAgo(date: string) {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins} min ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

interface Message {
  id: string
  content: string
  role: string
  created_at: string
  type?: string
}

const DEFAULT_PROJECT_ID = '00000000-0000-0000-0000-000000000001'

export default function MainWorkspace({ activeProject, activeView, setActiveProject, setActiveView }: MainWorkspaceProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectData, setActiveProjectData] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  // Workspace view states
  const [recentMessages, setRecentMessages] = useState<Message[]>([])
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Files view state
  const [files, setFiles] = useState<FileItem[]>([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // IDE view state
  const [ideTab, setIdeTab] = useState<IdeTabType>('code')
  const [codeBlocks, setCodeBlocks] = useState<{lang: string, code: string}[]>([])
  const [selectedBlock, setSelectedBlock] = useState(0)
  const [copied, setCopied] = useState(false)
  const [previewKey, setPreviewKey] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Reviews view state
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('all')

  // Milestones state
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [showMilestoneForm, setShowMilestoneForm] = useState(false)
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null)
  const [newMilestone, setNewMilestone] = useState({ title: '', description: '', dueDate: '' })
  const [newTaskText, setNewTaskText] = useState<{[key: string]: string}>({})

  // Agents state
  const [agents, setAgents] = useState<Agent[]>([])
  const [showAgentForm, setShowAgentForm] = useState(false)
  const [newAgent, setNewAgent] = useState<{ name: string; model: Agent['model']; description: string }>({
    name: '',
    model: 'kimi',
    description: ''
  })
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Load agents from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('master-studio-agents')
    if (saved) {
      try {
        setAgents(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading agents:', e)
      }
    }
    const savedActive = localStorage.getItem('active-agent-id')
    if (savedActive) {
      setActiveAgentId(savedActive)
    }
  }, [])

  // Save agents to localStorage
  useEffect(() => {
    localStorage.setItem('master-studio-agents', JSON.stringify(agents))
  }, [agents])

  // Save active agent ID to localStorage
  useEffect(() => {
    if (activeAgentId) {
      localStorage.setItem('active-agent-id', activeAgentId)
    }
  }, [activeAgentId])

  // Create new agent
  const createAgent = () => {
    if (!newAgent.name.trim()) return
    
    const agent: Agent = {
      id: crypto.randomUUID(),
      name: newAgent.name.trim(),
      model: newAgent.model,
      description: newAgent.description.trim(),
      createdAt: new Date().toISOString(),
      isDefault: false
    }
    
    setAgents(prev => [...prev, agent])
    setNewAgent({ name: '', model: 'kimi', description: '' })
    setShowAgentForm(false)
  }

  // Delete agent
  const deleteAgent = (id: string) => {
    setAgents(prev => prev.filter(a => a.id !== id))
    if (activeAgentId === id) {
      setActiveAgentId(null)
      localStorage.removeItem('active-agent-id')
    }
  }

  // Open chat with agent
  const openChat = (agentId: string) => {
    setActiveAgentId(agentId)
    localStorage.setItem('active-agent-id', agentId)
  }

  // Fetch stats and projects
  useEffect(() => {
    fetchData()
  }, [])

  // Fetch active project data when changed
  useEffect(() => {
    if (activeProject) {
      fetchActiveProject()
    }
  }, [activeProject])

  // Fetch messages when workspace view is active
  useEffect(() => {
    if (activeView === 'workspace') {
      fetchRecentMessages()
      fetchCodeBlocks()
    }
  }, [activeView, activeProject])

  // Auto-refresh code blocks every 5s in workspace
  useEffect(() => {
    if (activeView !== 'workspace' || ideTab === 'details') return
    const iv = setInterval(fetchCodeBlocks, 5000)
    return () => clearInterval(iv)
  }, [activeView, ideTab, activeProject])

  // Load milestones from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('master-studio-milestones')
    if (saved) {
      try {
        setMilestones(JSON.parse(saved))
      } catch (e) {
        console.error('Error loading milestones:', e)
      }
    }
  }, [])

  // Save milestones to localStorage
  useEffect(() => {
    localStorage.setItem('master-studio-milestones', JSON.stringify(milestones))
  }, [milestones])

  // Fetch files when viewing files tab
  useEffect(() => {
    if (activeView === 'files' && activeProject) {
      fetchFiles()
    }
  }, [activeView, activeProject])

  // Fetch reviews when viewing reviews tab
  useEffect(() => {
    if (activeView === 'reviews') {
      fetchReviews()
    }
  }, [activeView, reviewFilter])

  const fetchData = async () => {
    try {
      const [statsRes, projectsRes] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/projects')
      ])

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData.stats)
        setProjects(statsData.recentProjects || [])
      }

      if (projectsRes.ok) {
        const projectsData = await projectsRes.json()
        // Merge with recent projects if needed
        if (projectsData.projects?.length > 0) {
          setProjects(prev => {
            const existingIds = new Set(prev.map(p => p.id))
            const newProjects = projectsData.projects.filter((p: Project) => !existingIds.has(p.id))
            return [...prev, ...newProjects].slice(0, 6)
          })
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchActiveProject = async () => {
    try {
      const res = await fetch(`/api/projects/${activeProject}`)
      if (res.ok) {
        const data = await res.json()
        setActiveProjectData(data.project)
      }
    } catch (err) {
      console.error('Error fetching active project:', err)
    }
  }

  // Fetch recent messages for workspace view
  const fetchRecentMessages = async () => {
    // Her zaman aktif projeden mesaj çek - default project ID bile olsa
    const projectId = activeProject || DEFAULT_PROJECT_ID
    try {
      const res = await fetch(`/api/chat?projectId=${projectId}`)
      if (res.ok) {
        const data = await res.json()
        setRecentMessages(data.messages?.slice(-5).reverse() || [])
      }
    } catch (err) {
      console.error('Error fetching messages:', err)
    }
  }

  // Update project name
  const updateProjectName = async () => {
    if (!editName.trim() || !activeProjectData) return
    setIsSaving(true)
    try {
      const res = await fetch(`/api/projects/${activeProject}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      })
      if (res.ok) {
        const data = await res.json()
        setActiveProjectData(data.project)
        setIsEditingName(false)
      }
    } catch (err) {
      console.error('Error updating project name:', err)
    } finally {
      setIsSaving(false)
    }
  }

  // Delete project
  const deleteProject = async () => {
    if (!activeProject) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/projects/${activeProject}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        setActiveProject(DEFAULT_PROJECT_ID)
        setShowDeleteModal(false)
        setActiveView('dashboard')
      }
    } catch (err) {
      console.error('Error deleting project:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  const fetchCodeBlocks = async () => {
    // Her zaman fetch yap - activeProject yoksa default ID kullan
    const projectId = activeProject || DEFAULT_PROJECT_ID
    try {
      const res = await fetch(`/api/chat?projectId=${projectId}`)
      if (!res.ok) return
      const data = await res.json()
      // Tüm mesajları kontrol et (user + assistant + agent) - sadece assistant değil
      const msgs = (data.messages || [])
      const blocks: {lang: string, code: string}[] = []
      const regex = /```(\w*)\n?([\s\S]*?)```/g
      // Son 10 mesajı kontrol et - daha fazla kod bloğu bulmak için
      for (const msg of [...msgs].reverse().slice(0, 10)) {
        let match
        while ((match = regex.exec(msg.content)) !== null) {
          const lang = match[1].trim().toLowerCase()
          const code = match[2].trim()
          // HTML, CSS, JS ve diğer yaygın dilleri destekle
          if (lang && code) {
            blocks.push({ lang, code })
          }
        }
        regex.lastIndex = 0
      }
      setCodeBlocks(blocks)
      if (blocks.length > 0 && selectedBlock >= blocks.length) setSelectedBlock(0)
    } catch (err) { console.error('Error fetching code blocks:', err) }
  }

  const fetchFiles = async () => {
    if (!activeProject) return
    setFilesLoading(true)
    try {
      const res = await fetch(`/api/files?projectId=${activeProject}`)
      if (res.ok) {
        const data = await res.json()
        setFiles(data.files || [])
      }
    } catch (err) {
      console.error('Error fetching files:', err)
    } finally {
      setFilesLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeProject) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', activeProject)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      if (res.ok) {
        fetchFiles() // Refresh file list
      } else {
        console.error('Upload failed')
      }
    } catch (err) {
      console.error('Error uploading file:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  // Fetch reviews
  const fetchReviews = async () => {
    setReviewsLoading(true)
    try {
      const res = await fetch(`/api/reviews?status=${reviewFilter}`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data.reviews || [])
      }
    } catch (err) {
      console.error('Error fetching reviews:', err)
    } finally {
      setReviewsLoading(false)
    }
  }

  // Update review status
  const updateReviewStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      })
      if (res.ok) {
        fetchReviews() // Refresh reviews
        
        // Store action in localStorage for chat sync
        const actionData = { reviewId: id, action: status, timestamp: Date.now() }
        const existing = localStorage.getItem('review-actions')
        const actions = existing ? JSON.parse(existing) : []
        actions.push(actionData)
        localStorage.setItem('review-actions', JSON.stringify(actions))
        
        // Dispatch custom event to notify chat panel
        window.dispatchEvent(new CustomEvent('review-action', { detail: actionData }))
      }
    } catch (err) {
      console.error('Error updating review:', err)
    }
  }

  // Get status badge text and class
  const getStatusBadgeInfo = (status: string) => {
    switch (status) {
      case 'pending': return { text: 'Pending', className: 'status-badge-pending' }
      case 'approved': return { text: 'Approved', className: 'status-badge-approved' }
      case 'rejected': return { text: 'Needs Fix', className: 'status-badge-rejected' }
      default: return { text: status, className: '' }
    }
  }

  // Get type badge text
  const getTypeBadgeInfo = (type: string) => {
    switch (type) {
      case 'code': return { text: 'Code', className: 'type-badge-code' }
      case 'feature': return { text: 'Feature', className: 'type-badge-feature' }
      case 'design': return { text: 'Design', className: 'type-badge-design' }
      case 'decision': return { text: 'Decision', className: 'type-badge-decision' }
      default: return { text: type, className: '' }
    }
  }

  // Parse diff for display
  const parseDiff = (diff: string) => {
    return diff.split('\n').map((line, index) => {
      if (line.startsWith('- ')) {
        return { type: 'removed', content: line.substring(2), index }
      } else if (line.startsWith('+ ')) {
        return { type: 'added', content: line.substring(2), index }
      } else {
        return { type: 'neutral', content: line, index }
      }
    })
  }

  // Milestone functions
  const addMilestone = () => {
    if (!newMilestone.title.trim()) return
    const milestone: Milestone = {
      id: Date.now().toString(),
      title: newMilestone.title.trim(),
      description: newMilestone.description.trim(),
      status: 'planned',
      dueDate: newMilestone.dueDate,
      tasks: [],
      projectId: activeProject || ''
    }
    setMilestones([...milestones, milestone])
    setNewMilestone({ title: '', description: '', dueDate: '' })
    setShowMilestoneForm(false)
  }

  const updateMilestone = (id: string, updates: Partial<Milestone>) => {
    setMilestones(milestones.map(m => m.id === id ? { ...m, ...updates } : m))
  }

  const deleteMilestone = (id: string) => {
    setMilestones(milestones.filter(m => m.id !== id))
  }

  const addTask = (milestoneId: string) => {
    const text = newTaskText[milestoneId]?.trim()
    if (!text) return
    const task = { id: Date.now().toString(), text, done: false }
    setMilestones(milestones.map(m => m.id === milestoneId ? { ...m, tasks: [...m.tasks, task] } : m))
    setNewTaskText({ ...newTaskText, [milestoneId]: '' })
  }

  const toggleTask = (milestoneId: string, taskId: string) => {
    setMilestones(milestones.map(m => m.id === milestoneId ? {
      ...m,
      tasks: m.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
    } : m))
  }

  const updateTaskText = (milestoneId: string, taskId: string, text: string) => {
    setMilestones(milestones.map(m => m.id === milestoneId ? {
      ...m,
      tasks: m.tasks.map(t => t.id === taskId ? { ...t, text } : t)
    } : m))
  }

  const deleteTask = (milestoneId: string, taskId: string) => {
    setMilestones(milestones.map(m => m.id === milestoneId ? {
      ...m,
      tasks: m.tasks.filter(t => t.id !== taskId)
    } : m))
  }

  const cycleStatus = (status: Milestone['status']): Milestone['status'] => {
    const order: Milestone['status'][] = ['planned', 'in-progress', 'completed']
    const nextIndex = (order.indexOf(status) + 1) % order.length
    return order[nextIndex]
  }

  const getStatusLabel = (status: Milestone['status']) => {
    switch (status) {
      case 'planned': return 'Planned'
      case 'in-progress': return 'In Progress'
      case 'completed': return 'Completed'
    }
  }

  const getStatusColor = (status: Milestone['status']) => {
    switch (status) {
      case 'planned': return 'var(--accent-cyan)'
      case 'in-progress': return 'var(--accent-amber)'
      case 'completed': return 'var(--accent-green)'
    }
  }

  // Get active project display data
  const displayProject = activeProjectData || projects.find(p => p.id === activeProject)

  // View title mapping
  const viewTitles: Record<ViewType, string> = {
    dashboard: displayProject ? displayProject.name : 'Dashboard',
    workspace: 'Workspace',
    files: displayProject ? `${displayProject.name} — Files` : 'Files',
    agents: 'Agents',
    reviews: 'Reviews'
  }

  // Empty state component
  const EmptyState = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="empty-state">
      <div className="empty-state-icon">{icon}</div>
      <div className="empty-state-title">{title}</div>
      <div className="empty-state-desc">{description}</div>
    </div>
  )

  return (
    <main className="panel main" style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div className="main-header">
        <div className="main-header-left">
          <span className="panel-title">
            {viewTitles[activeView]}
          </span>
          {displayProject && (
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              {new Date(displayProject.created_at).toLocaleDateString('tr-TR')}
            </span>
          )}
        </div>
        <div className="toolbar-btns">
          <button className="toolbar-btn" title="Search (⌘K)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <button className="toolbar-btn" title="Settings">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.26.46.4.98.42 1.51H21a2 2 0 0 1 0 4h-.09c-.53.02-1.05.16-1.51.42z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="today-view">
        {activeView === 'dashboard' && (
          <>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px', color: 'var(--text-tertiary)' }}>
                Loading...
              </div>
            ) : (
              <>
                {/* Welcome */}
                <div className="welcome-section">
                  <div className="welcome-greeting">Good morning, <span>Murat</span> ✦</div>
                  <div className="welcome-summary">
                    {stats?.projectCount || 0} active projects · {stats?.activeAgents || 0} agents working · {stats?.pendingReviews || 0} pending reviews
                  </div>
                </div>

                {/* Stats */}
                <div className="stats-row">
                  <div className="stat-card">
                    <div className="stat-value gradient">{stats?.projectCount || 0}</div>
                    <div className="stat-label">Active Projects</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{stats?.activeAgents || 0}</div>
                    <div className="stat-label">Active Agents</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>{stats?.pendingReviews || 0}</div>
                    <div className="stat-label">Pending Reviews</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{stats?.todayMessageCount || 0}</div>
                    <div className="stat-label">Today's Messages</div>
                  </div>
                </div>

                {/* Active Projects */}
                <div className="section-header">
                  <span className="section-title">Active Projects</span>
                  <button className="section-action">View All →</button>
                </div>
                <div className="project-cards">
                  {projects.slice(0, 3).map((project, index) => {
                    const status = getStatusFromIndex(index)
                    const progress = getProgressFromStatus(status)
                    const messageCount = project.messages?.[0]?.count || 0
                    return (
                      <div 
                        key={project.id} 
                        className={`project-card ${activeProject === project.id ? 'active' : ''}`}
                        onClick={() => {
                          setActiveProject(project.id)
                          setActiveView('workspace')
                        }}
                      >
                        <div className="project-card-header">
                          <div>
                            <div className="project-card-name">{project.name}</div>
                            <div className="project-card-client">{messageCount} messages</div>
                          </div>
                          <span className={`project-card-status ${getStatusClass(status)}`}>{status}</span>
                        </div>
                        <div className="project-card-progress">
                          <div className="progress-bar-bg">
                            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                          </div>
                          <div className="progress-label">
                            <span className="progress-text">Progress</span>
                            <span className="progress-text">{progress}%</span>
                          </div>
                        </div>
                        <div className="project-card-footer">
                          <div className="agent-avatars">
                            <div className="agent-avatar cyan" style={{ background: getProjectColor(index) }}>
                              {getInitials(project.name)}
                            </div>
                          </div>
                          <span className="project-card-time">{timeAgo(project.created_at)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Review Queue */}
                <div className="section-header">
                  <span className="section-title">Pending Reviews</span>
                  <button className="section-action">View All →</button>
                </div>
                <div className="review-list">
                  <div className="review-item">
                    <div className="review-icon code">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2">
                        <polyline points="16 18 22 12 16 6"/>
                        <polyline points="8 6 2 12 8 18"/>
                      </svg>
                    </div>
                    <div className="review-info">
                      <div className="review-title">API endpoint refactoring</div>
                      <div className="review-meta">coding-agent · Agent Dashboard · 10 min ago</div>
                    </div>
                    <span className="review-priority priority-urgent">Urgent</span>
                  </div>

                  <div className="review-item">
                    <div className="review-icon asset">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                    </div>
                    <div className="review-info">
                      <div className="review-title">Hero image generation v3</div>
                      <div className="review-meta">dalle-agent · Launch Video · 1 hour ago</div>
                    </div>
                    <span className="review-priority priority-normal">Normal</span>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeView === 'workspace' && (
          <>
            <div className="ide-container">
                {/* IDE Tab Bar */}
                <div className="ide-tabs">
                  <button className={`ide-tab ${ideTab === 'code' ? 'active' : ''}`} onClick={() => setIdeTab('code')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                    </svg>
                    Code
                    {codeBlocks.length > 0 && <span className="ide-badge">{codeBlocks.length}</span>}
                  </button>
                  <button className={`ide-tab ${ideTab === 'preview' ? 'active' : ''}`} onClick={() => setIdeTab('preview')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    Preview
                  </button>
                  <button className={`ide-tab ${ideTab === 'details' ? 'active' : ''}`} onClick={() => setIdeTab('details')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06"/>
                    </svg>
                    Details
                  </button>
                </div>

                {/* CODE TAB */}
                {ideTab === 'code' && (
                  <div className="ide-code-panel">
                    {codeBlocks.length === 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-tertiary)' }}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                        </svg>
                        <div style={{ fontSize: '14px', fontWeight: 500 }}>No code blocks yet</div>
                        <div style={{ fontSize: '12px' }}>Type code with ``` in chat — auto captured</div>
                      </div>
                    ) : (
                      <>
                        {codeBlocks.length > 1 && (
                          <div className="code-selector">
                            {codeBlocks.map((b, i) => (
                              <button key={i} className={`code-sel-btn ${selectedBlock === i ? 'active' : ''}`} onClick={() => setSelectedBlock(i)}>
                                <span className="lang-tag">{b.lang}</span>
                                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{b.code.slice(0, 25)}...</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {codeBlocks[selectedBlock] && (
                          <div className="code-display">
                            <div className="code-toolbar">
                              <span className="lang-tag">{codeBlocks[selectedBlock].lang}</span>
                              <button className="code-copy-btn" onClick={async () => {
                                await navigator.clipboard.writeText(codeBlocks[selectedBlock].code)
                                setCopied(true); setTimeout(() => setCopied(false), 2000)
                              }}>
                                {copied ? '✓ Copied' : 'Copy'}
                              </button>
                            </div>
                            <pre className="code-pre"><code>{codeBlocks[selectedBlock].code}</code></pre>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* PREVIEW TAB */}
                {ideTab === 'preview' && (() => {
                  const htmlBlock = codeBlocks.find(b => b.lang === 'html' || b.lang === 'htm')
                  const cssBlock = codeBlocks.find(b => b.lang === 'css')
                  const jsBlock = codeBlocks.find(b => b.lang === 'javascript' || b.lang === 'js')
                  let previewHTML = ''
                  if (htmlBlock) {
                    previewHTML = htmlBlock.code
                    if (cssBlock) previewHTML = previewHTML.replace('</head>', `<style>${cssBlock.code}</style></head>`)
                    if (jsBlock) previewHTML = previewHTML.replace('</body>', `<script>${jsBlock.code}<\/script></body>`)
                    if (!previewHTML.includes('<html') && !previewHTML.includes('<!DOCTYPE')) {
                      previewHTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${cssBlock?.code || ''}</style></head><body>${previewHTML}<script>${jsBlock?.code || ''}<\/script></body></html>`
                    }
                  }
                  return (
                    <div className="ide-preview-panel">
                      {!previewHTML ? (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-tertiary)' }}>
                          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                          </svg>
                          <div style={{ fontSize: '14px', fontWeight: 500 }}>Ask for HTML/CSS/JS code in chat</div>
                          <div style={{ fontSize: '12px' }}>Code will automatically appear here</div>
                        </div>
                      ) : (
                        <>
                          <div className="preview-toolbar">
                            <button className="preview-action-btn" onClick={() => setPreviewKey(k => k + 1)}>↻ Refresh</button>
                            <button className="preview-action-btn" onClick={() => setIsFullscreen(true)}>⛶ Fullscreen</button>
                          </div>
                          <div className="preview-frame-wrap">
                            <iframe key={previewKey} srcDoc={previewHTML} sandbox="allow-scripts" className="preview-iframe" title="Preview" />
                          </div>
                        </>
                      )}
                      {isFullscreen && (
                        <div className="fullscreen-overlay" onClick={() => setIsFullscreen(false)}>
                          <div className="fullscreen-box" onClick={e => e.stopPropagation()}>
                            <div className="fullscreen-bar">
                              <span>Preview — {activeProjectData?.name}</span>
                              <button onClick={() => setIsFullscreen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '18px' }}>✕</button>
                            </div>
                            <iframe srcDoc={previewHTML} sandbox="allow-scripts" style={{ flex: 1, width: '100%', border: 'none', background: 'white' }} title="Preview Fullscreen" />
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* DETAILS TAB */}
                {ideTab === 'details' && (
                  <div className="workspace-detail" style={{ padding: '20px', overflow: 'auto' }}>
                    <div className="workspace-header">
                      {isEditingName ? (
                        <div className="name-edit">
                          <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') updateProjectName(); if (e.key === 'Escape') { setIsEditingName(false); setEditName(activeProjectData?.name || '') } }}
                            onBlur={() => { if (editName.trim() !== activeProjectData?.name) updateProjectName(); else setIsEditingName(false) }}
                            autoFocus className="name-input" />
                          {isSaving && <span className="saving-indicator">Saving...</span>}
                        </div>
                      ) : (
                        <h1 className="project-title" onClick={() => { setEditName(activeProjectData?.name || ''); setIsEditingName(true) }} title="Click to edit">
                          {activeProjectData?.name || 'Loading...'}
                          <svg className="edit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </h1>
                      )}
                      <div className="project-meta">
                        <span className="meta-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          {activeProjectData?.created_at ? new Date(activeProjectData.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                        </span>
                        <span className="meta-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                          {activeProjectData?.messages?.[0]?.count || 0} messages
                        </span>
                      </div>
                    </div>
                    <div className="quick-actions">
                      <button className="action-btn primary" onClick={() => setActiveView('dashboard')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Go to Chat
                      </button>
                      <button className="action-btn secondary" onClick={() => setActiveView('files')}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                        Files
                      </button>
                      <button className="action-btn danger" onClick={() => setShowDeleteModal(true)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        Delete Project
                      </button>
                    </div>
                    <div className="messages-section">
                      <h3 className="section-heading">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Recent Messages
                      </h3>
                      {recentMessages.length === 0 ? (
                        <div className="no-messages">No messages yet</div>
                      ) : (
                        <div className="messages-list">
                          {recentMessages.map((msg) => (
                            <div key={msg.id} className={`message-item ${msg.role}`}>
                              <div className="message-avatar">{msg.role === 'user' ? 'U' : 'AI'}</div>
                              <div className="message-content">
                                <div className="message-header">
                                  <span className="message-role">{msg.role === 'user' ? 'User' : 'AI'}</span>
                                  <span className="message-time">{timeAgo(msg.created_at)}</span>
                                </div>
                                <p className="message-text">{msg.content.length > 120 ? msg.content.slice(0, 120) + '...' : msg.content}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                  <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                      <h3 className="modal-title">Delete Project</h3>
                      <p className="modal-desc">
                        Are you sure you want to delete <strong>"{activeProjectData?.name}"</strong>?<br />This action cannot be undone.
                      </p>
                      <div className="modal-actions">
                        <button className="modal-btn secondary" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>Cancel</button>
                        <button className="modal-btn danger" onClick={deleteProject} disabled={isDeleting}>{isDeleting ? 'Deleting...' : 'Yes, Delete'}</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
          </>
        )}

        {activeView === 'files' && (
          <div className="files-container">
            {/* Files Header */}
            <div className="files-header">
              <div className="files-count">
                {files.length} dosya
              </div>
              <button 
                className="upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !activeProject}
              >
                {uploading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                    Yükleniyor...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Dosya Yükle
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={uploading}
              />
            </div>

            {/* Files Content */}
            {filesLoading ? (
              <div className="files-loading">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Dosyalar yükleniyor...
              </div>
            ) : files.length === 0 ? (
              <EmptyState 
                icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                  <polyline points="14 2 14 8 20 8"/>
                </svg>}
                title="Henüz dosya yüklenmedi"
                description="Dosya yüklemek için yukarıdaki butonu kullanın"
              />
            ) : (
              <div className="files-table-container">
                <table className="files-table">
                  <thead>
                    <tr>
                      <th>İsim</th>
                      <th>Boyut</th>
                      <th>Tür</th>
                      <th>Tarih</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file, index) => (
                      <tr 
                        key={file.key} 
                        className="file-row"
                        onClick={() => window.open(file.url, '_blank')}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <td className="file-name-cell">
                          <div className="file-icon">
                            {file.type.startsWith('image/') ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="2">
                                <rect x="3" y="3" width="18" height="18" rx="2"/>
                                <circle cx="8.5" cy="8.5" r="1.5"/>
                                <path d="M21 15l-5-5L5 21"/>
                              </svg>
                            ) : file.type.startsWith('video/') ? (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="2">
                                <polygon points="5 3 19 12 5 21 5 3"/>
                              </svg>
                            ) : (
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                                <polyline points="14 2 14 8 20 8"/>
                              </svg>
                            )}
                          </div>
                          <span className="file-name">{file.name}</span>
                        </td>
                        <td className="file-size">{formatFileSize(file.size)}</td>
                        <td className="file-type">{formatFileType(file.type)}</td>
                        <td className="file-date">{new Date(file.created_at).toLocaleDateString('tr-TR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeView === 'agents' && (
          <div className="agents-view">
            {/* Header */}
            <div className="agents-header">
              <h2 className="agents-title">Agents</h2>
              <button className="new-agent-btn" onClick={() => setShowAgentForm(true)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Agent
              </button>
            </div>

            {/* New Agent Form */}
            {showAgentForm && (
              <div className="agent-form">
                <div className="agent-form-header">
                  <h3>Create New Agent</h3>
                </div>
                <div className="agent-form-body">
                  <div className="agent-form-field">
                    <label className="agent-form-label">Agent Name *</label>
                    <input
                      type="text"
                      className="agent-form-input"
                      placeholder="e.g., Research Assistant"
                      value={newAgent.name}
                      onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                      autoFocus
                    />
                  </div>
                  <div className="agent-form-field">
                    <label className="agent-form-label">Model</label>
                    <select
                      className="agent-form-select"
                      value={newAgent.model}
                      onChange={(e) => setNewAgent({ ...newAgent, model: e.target.value as Agent['model'] })}
                    >
                      <option value="kimi">Kimi K2.5</option>
                      <option value="sonnet">Sonnet 4.5</option>
                      <option value="opus">Opus 4.6</option>
                      <option value="gpt4o">GPT-4o</option>
                    </select>
                  </div>
                  <div className="agent-form-field">
                    <label className="agent-form-label">Description</label>
                    <textarea
                      className="agent-form-textarea"
                      placeholder="Optional description..."
                      value={newAgent.description}
                      onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                </div>
                <div className="agent-form-actions">
                  <button className="agent-form-btn secondary" onClick={() => setShowAgentForm(false)}>Cancel</button>
                  <button
                    className="agent-form-btn primary"
                    onClick={createAgent}
                    disabled={!newAgent.name.trim()}
                  >
                    Create
                  </button>
                </div>
              </div>
            )}

            {/* Agent List */}
            <div className="agent-list">
              {/* Main Agent (Betsy) - Always first */}
              <div className={`agent-card ${activeAgentId === 'main-agent' ? 'active' : ''}`}>
                <div className="agent-card-header">
                  <div className="agent-avatar-large cyan">B</div>
                  <div className="agent-info">
                    <div className="agent-name">Main Agent (Betsy)</div>
                    <div className="agent-model">Model: Kimi K2.5</div>
                  </div>
                  <span className="agent-status-badge active">Active</span>
                </div>
                <div className="agent-description">Default main agent</div>
                <div className="agent-card-actions">
                  <button className="agent-action-btn primary" onClick={() => openChat('main-agent')}>
                    Open Chat
                  </button>
                </div>
              </div>

              {/* User-created agents */}
              {agents.map((agent) => (
                <div key={agent.id} className={`agent-card ${activeAgentId === agent.id ? 'active' : ''}`}>
                  <div className="agent-card-header">
                    <div className="agent-avatar-large purple">{agent.name.charAt(0).toUpperCase()}</div>
                    <div className="agent-info">
                      <div className="agent-name">{agent.name}</div>
                      <div className="agent-model">Model: {MODEL_LABELS[agent.model]}</div>
                    </div>
                    <span className="agent-status-badge active">Active</span>
                  </div>
                  {agent.description && <div className="agent-description">{agent.description}</div>}
                  <div className="agent-card-actions">
                    <button className="agent-action-btn primary" onClick={() => openChat(agent.id)}>
                      Open Chat
                    </button>
                    <button className="agent-action-btn danger" onClick={() => deleteAgent(agent.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}

              {agents.length === 0 && (
                <div className="agents-empty">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
                    <path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"/>
                    <path d="M8.5 8.5v.01"/>
                    <path d="M16 15.5v.01"/>
                    <path d="M12 12v.01"/>
                    <path d="M11 17v.01"/>
                    <path d="M7 14v.01"/>
                  </svg>
                  <p>No custom agents yet</p>
                  <p className="agents-empty-hint">Click "New Agent" to create your first agent</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'reviews' && (
          <div className="reviews-container">
            {/* Reviews Header */}
            <div className="reviews-header">
              <div className="reviews-title">
                {reviewsLoading ? (
                  <span className="reviews-loading">Yükleniyor...</span>
                ) : (
                  <>
                    <span>{reviews.filter(r => r.status === 'pending').length} review bekliyor</span>
                    <span className="reviews-subtitle">
                      {reviews.filter(r => r.status === 'approved').length} onaylandı · {reviews.filter(r => r.status === 'rejected').length} düzeltilecek
                    </span>
                  </>
                )}
              </div>
              {/* Filter Buttons */}
              <div className="reviews-filter">
                {(['all', 'pending', 'approved', 'rejected'] as ReviewFilter[]).map((filter) => (
                  <button
                    key={filter}
                    className={`filter-btn ${reviewFilter === filter ? 'active' : ''}`}
                    onClick={() => setReviewFilter(filter)}
                  >
                    {filter === 'all' && 'Tümü'}
                    {filter === 'pending' && 'Bekliyor'}
                    {filter === 'approved' && 'Onaylanan'}
                    {filter === 'rejected' && 'Düzeltilen'}
                  </button>
                ))}
              </div>
            </div>

            {/* Reviews List */}
            {reviewsLoading ? (
              <div className="reviews-loading-state">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="spin">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Review'lar yükleniyor...
              </div>
            ) : reviews.length === 0 ? (
              <EmptyState 
                icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="1.5">
                  <path d="M9 11l3 3L22 4"/>
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                </svg>}
                title={reviewFilter === 'all' ? "Review bekleyen görev yok" : "Bu filtreye uygun review yok"}
                description={reviewFilter === 'all' ? "Tüm review'lar tamamlandı" : "Farklı bir filtre deneyin"}
              />
            ) : (
              <div className="reviews-list">
                {reviews.map((review) => {
                  const statusInfo = getStatusBadgeInfo(review.status)
                  const typeInfo = getTypeBadgeInfo(review.type)
                  return (
                    <div key={review.id} className={`review-card ${review.status}`}>
                      <div className="review-card-header">
                        <div className="review-card-titles">
                          <div className="review-card-title-row">
                            <h3 className="review-card-title">{review.title}</h3>
                            <span className={`type-badge ${typeInfo.className}`}>{typeInfo.text}</span>
                            <span className={`status-badge ${statusInfo.className}`}>{statusInfo.text}</span>
                          </div>
                          <p className="review-card-description">{review.description}</p>
                          <div className="review-card-meta">
                            <span className="meta-agent">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                <circle cx="12" cy="7" r="4"/>
                              </svg>
                              {review.agent}
                            </span>
                            <span className="meta-project">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                              </svg>
                              {review.project}
                            </span>
                            <span className="meta-time">{timeAgo(review.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Diff Display */}
                      {review.diff && (
                        <div className="review-diff">
                          <div className="diff-header">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="16 18 22 12 16 6"/>
                              <polyline points="8 6 2 12 8 18"/>
                            </svg>
                            Kod Değişiklikleri
                          </div>
                          <div className="diff-content">
                            {parseDiff(review.diff).map((line) => (
                              <div 
                                key={line.index} 
                                className={`diff-line ${line.type === 'removed' ? 'diff-line-removed' : line.type === 'added' ? 'diff-line-added' : 'diff-line-neutral'}`}
                              >
                                <span className="diff-line-marker">
                                  {line.type === 'removed' ? '-' : line.type === 'added' ? '+' : ' '}
                                </span>
                                <span className="diff-line-content">{line.content || ' '}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {review.status === 'pending' && (
                        <div className="review-card-actions">
                          <button 
                            className="review-btn approve"
                            onClick={() => updateReviewStatus(review.id, 'approved')}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                            Onayla
                          </button>
                          <button 
                            className="review-btn reject"
                            onClick={() => updateReviewStatus(review.id, 'rejected')}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                            Düzelt
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .panel {
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .main-header {
          padding: 12px 20px; border-bottom: 1px solid var(--glass-border);
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .main-header-left { display: flex; align-items: center; gap: 14px; }
        .panel-title { 
          font-size: 11px; font-weight: 600; letter-spacing: 1.2px;
          text-transform: uppercase; color: var(--text-tertiary);
        }
        .toolbar-btns { display: flex; gap: 6px; }
        .toolbar-btn {
          width: 32px; height: 32px; border-radius: 6px;
          border: 1px solid var(--glass-border); background: transparent;
          color: var(--text-tertiary); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s ease;
        }
        .toolbar-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); border-color: var(--glass-border-hover); }
        .today-view { padding: 24px; overflow-y: auto; flex: 1; }
        .welcome-section { margin-bottom: 28px; }
        .welcome-greeting { font-size: 24px; font-weight: 700; margin-bottom: 4px; }
        .welcome-greeting span {
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .welcome-summary { font-size: 13px; color: var(--text-secondary); }
        .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .stat-card {
          background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border);
          border-radius: 12px; padding: 14px 16px;
        }
        .stat-value { font-size: 22px; font-weight: 700; margin-bottom: 2px; }
        .stat-value.gradient {
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .stat-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.5px; }
        .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .section-title { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
        .section-action {
          font-size: 11px; color: var(--accent-cyan); cursor: pointer;
          border: none; background: none; padding: 4px 8px;
        }
        .project-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
        .project-card {
          background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border);
          border-radius: 12px; padding: 16px;
          cursor: pointer; transition: all 0.2s ease;
        }
        .project-card:hover { border-color: var(--glass-border-hover); background: rgba(0,0,0,0.3); transform: translateY(-1px); }
        .project-card.active { border-color: var(--accent-cyan); background: rgba(0,212,255,0.05); }
        .project-card-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
        .project-card-name { font-size: 14px; font-weight: 600; }
        .project-card-client { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
        .project-card-status {
          font-size: 9px; padding: 3px 8px; border-radius: 10px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
          flex-shrink: 0;
        }
        .status-active { background: rgba(34,197,94,0.15); color: var(--accent-green); }
        .status-review { background: rgba(245,158,11,0.15); color: var(--accent-amber); }
        .status-planning { background: rgba(59,130,246,0.15); color: var(--accent-blue); }
        .project-card-progress { margin-bottom: 12px; }
        .progress-bar-bg { width: 100%; height: 4px; border-radius: 2px; background: rgba(255,255,255,0.06); }
        .progress-bar-fill { height: 100%; border-radius: 2px; background: linear-gradient(90deg, var(--accent-cyan), var(--accent-purple)); transition: width 0.6s ease; }
        .progress-label { display: flex; justify-content: space-between; margin-top: 6px; }
        .progress-text { font-size: 10px; color: var(--text-tertiary); }
        .project-card-footer { display: flex; align-items: center; justify-content: space-between; }
        .agent-avatars { display: flex; }
        .agent-avatar {
          width: 22px; height: 22px; border-radius: 50%; border: 2px solid #12122a;
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 600; margin-left: -6px;
        }
        .agent-avatar:first-child { margin-left: 0; }
        .agent-avatar.cyan { background: linear-gradient(135deg, var(--accent-cyan), #0ea5e9); }
        .agent-avatar.purple { background: linear-gradient(135deg, var(--accent-purple), #7c3aed); }
        .agent-avatar.pink { background: linear-gradient(135deg, var(--accent-pink), #f43f5e); }
        .agent-avatar.green { background: linear-gradient(135deg, var(--accent-green), #16a34a); }
        .project-card-time { font-size: 10px; color: var(--text-tertiary); }
        .review-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 28px; }
        .review-item {
          display: flex; align-items: center; gap: 14px;
          background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border);
          border-radius: 12px; padding: 12px 16px;
          cursor: pointer; transition: all 0.15s ease;
        }
        .review-item:hover { border-color: var(--glass-border-hover); }
        .review-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .review-icon.code { background: rgba(168,85,247,0.15); }
        .review-icon.asset { background: rgba(0,212,255,0.15); }
        .review-info { flex: 1; min-width: 0; }
        .review-title { font-size: 13px; font-weight: 500; }
        .review-meta { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
        .review-priority { font-size: 9px; padding: 2px 7px; border-radius: 8px; font-weight: 600; text-transform: uppercase; }
        .priority-urgent { background: rgba(239,68,68,0.15); color: var(--accent-red); }
        .priority-normal { background: rgba(245,158,11,0.15); color: var(--accent-amber); }
        @media (max-width: 1024px) {
          .project-cards { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .project-cards { grid-template-columns: 1fr; }
          .stats-row { grid-template-columns: repeat(2, 1fr); }
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          text-align: center;
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 48px;
        }
        .empty-state-icon {
          margin-bottom: 20px;
          opacity: 0.8;
        }
        .empty-state-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 8px;
        }
        .empty-state-desc {
          font-size: 14px;
          color: var(--text-tertiary);
        }
        .agents-view { padding: 8px 0; }
        .agents-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 0 4px;
        }
        .agents-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .new-agent-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .new-agent-btn:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .agent-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .agent-card {
          background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border);
          border-radius: 16px; padding: 20px;
          transition: all 0.2s ease;
        }
        .agent-card:hover { border-color: var(--glass-border-hover); background: rgba(0,0,0,0.3); }
        .agent-card.active { border-color: var(--accent-cyan); background: rgba(0,212,255,0.05); }
        .agent-card-header { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
        .agent-avatar-large {
          width: 48px; height: 48px; border-radius: 12px;
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 700; flex-shrink: 0;
        }
        .agent-avatar-large.cyan { background: linear-gradient(135deg, var(--accent-cyan), #0ea5e9); }
        .agent-avatar-large.purple { background: linear-gradient(135deg, var(--accent-purple), #7c3aed); }
        .agent-avatar-large.pink { background: linear-gradient(135deg, var(--accent-pink), #f43f5e); }
        .agent-avatar-large.green { background: linear-gradient(135deg, var(--accent-green), #16a34a); }
        .agent-info { flex: 1; min-width: 0; }
        .agent-name { font-size: 15px; font-weight: 600; }
        .agent-model { font-size: 12px; color: var(--text-secondary); margin-top: 2px; }
        .agent-role { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
        .agent-status-badge {
          font-size: 9px; padding: 4px 10px; border-radius: 10px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
          flex-shrink: 0;
        }
        .agent-status-badge.active { background: rgba(34,197,94,0.15); color: var(--accent-green); }
        .agent-status-badge.pending { background: rgba(148,163,184,0.15); color: var(--text-tertiary); }
        .agent-description { font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 16px; }
        .agent-card-actions {
          display: flex;
          gap: 8px;
        }
        .agent-action-btn {
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
        }
        .agent-action-btn.primary {
          background: var(--accent-cyan);
          color: #000;
        }
        .agent-action-btn.primary:hover {
          opacity: 0.9;
        }
        .agent-action-btn.danger {
          background: rgba(239,68,68,0.15);
          color: var(--accent-red);
          border: 1px solid rgba(239,68,68,0.3);
        }
        .agent-action-btn.danger:hover {
          background: rgba(239,68,68,0.25);
        }
        .agents-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px;
          color: var(--text-tertiary);
          text-align: center;
        }
        .agents-empty p { margin: 4px 0; }
        .agents-empty-hint {
          font-size: 12px;
          color: var(--text-secondary);
        }
        /* Agent Form */
        .agent-form {
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
        }
        .agent-form-header {
          margin-bottom: 16px;
        }
        .agent-form-header h3 {
          font-size: 14px;
          font-weight: 600;
          margin: 0;
        }
        .agent-form-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 16px;
        }
        .agent-form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .agent-form-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .agent-form-input,
        .agent-form-select,
        .agent-form-textarea {
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 10px 12px;
          color: var(--text-primary);
          font-size: 13px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .agent-form-input:focus,
        .agent-form-select:focus,
        .agent-form-textarea:focus {
          border-color: var(--accent-cyan);
        }
        .agent-form-textarea {
          resize: vertical;
          min-height: 60px;
        }
        .agent-form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
        }
        .agent-form-btn {
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
          border: none;
        }
        .agent-form-btn.primary {
          background: var(--accent-cyan);
          color: #000;
        }
        .agent-form-btn.primary:hover:not(:disabled) {
          opacity: 0.9;
        }
        .agent-form-btn.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .agent-form-btn.secondary {
          background: rgba(255,255,255,0.06);
          color: var(--text-secondary);
          border: 1px solid var(--glass-border);
        }
        .agent-form-btn.secondary:hover {
          background: rgba(255,255,255,0.1);
          color: var(--text-primary);
        }
        @media (max-width: 768px) {
          .agent-card-actions { flex-wrap: wrap; }
        }

        /* Files View Styles */
        .files-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .files-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 0 4px;
        }
        .files-count {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .upload-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .upload-btn:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .upload-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .files-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          height: 200px;
          color: var(--text-secondary);
          font-size: 14px;
        }
        .files-table-container {
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          overflow: hidden;
        }
        .files-table {
          width: 100%;
          border-collapse: collapse;
        }
        .files-table th {
          text-align: left;
          padding: 12px 16px;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 1px solid var(--glass-border);
          background: rgba(0,0,0,0.15);
        }
        .files-table td {
          padding: 14px 16px;
          font-size: 13px;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--glass-border);
        }
        .file-row {
          cursor: pointer;
          transition: all 0.15s ease;
          animation: fadeInUp 0.3s ease forwards;
          opacity: 0;
        }
        .file-row:hover {
          background: rgba(255,255,255,0.03);
        }
        .file-row:last-child td {
          border-bottom: none;
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .file-name-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .file-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .file-name {
          font-weight: 500;
          color: var(--text-primary);
        }
        .file-size {
          white-space: nowrap;
        }
        .file-type {
          white-space: nowrap;
        }
        .file-date {
          white-space: nowrap;
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Workspace Detail Styles */
        .workspace-detail {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .workspace-header {
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px solid var(--glass-border);
        }
        .project-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: color 0.2s ease;
        }
        .project-title:hover {
          color: var(--accent-cyan);
        }
        .project-title:hover .edit-icon {
          opacity: 1;
        }
        .edit-icon {
          opacity: 0;
          transition: opacity 0.2s ease;
          color: var(--text-tertiary);
        }
        .name-edit {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
        }
        .name-input {
          font-size: 28px;
          font-weight: 700;
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--accent-cyan);
          border-radius: 8px;
          padding: 8px 16px;
          color: var(--text-primary);
          outline: none;
          flex: 1;
          max-width: 500px;
        }
        .saving-indicator {
          font-size: 12px;
          color: var(--accent-cyan);
        }
        .project-meta {
          display: flex;
          gap: 20px;
          flex-wrap: wrap;
        }
        .meta-item {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .meta-item svg {
          color: var(--text-tertiary);
        }

        /* Quick Actions */
        .quick-actions {
          display: flex;
          gap: 12px;
          margin-bottom: 32px;
          flex-wrap: wrap;
        }
        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .action-btn.primary {
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          color: white;
          border: none;
        }
        .action-btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
        }
        .action-btn.secondary {
          background: rgba(255,255,255,0.05);
          color: var(--text-primary);
          border: 1px solid var(--glass-border);
        }
        .action-btn.secondary:hover {
          background: rgba(255,255,255,0.1);
          border-color: var(--glass-border-hover);
        }
        .action-btn.danger {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-red);
          border: 1px solid rgba(239, 68, 68, 0.3);
          margin-left: auto;
        }
        .action-btn.danger:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
        }

        /* Messages Section */
        .messages-section {
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 20px;
        }
        .section-heading {
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
        }
        .section-heading svg {
          color: var(--accent-cyan);
        }
        .no-messages {
          text-align: center;
          padding: 40px;
          color: var(--text-tertiary);
          font-size: 14px;
        }
        .messages-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .message-item {
          display: flex;
          gap: 12px;
          padding: 14px;
          background: rgba(255,255,255,0.03);
          border-radius: 10px;
          border: 1px solid var(--glass-border);
          transition: all 0.15s ease;
        }
        .message-item:hover {
          background: rgba(255,255,255,0.05);
          border-color: var(--glass-border-hover);
        }
        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .message-item.user .message-avatar {
          background: linear-gradient(135deg, var(--accent-cyan), #0ea5e9);
          color: white;
        }
        .message-item.assistant .message-avatar {
          background: linear-gradient(135deg, var(--accent-purple), #7c3aed);
          color: white;
        }
        .message-content {
          flex: 1;
          min-width: 0;
        }
        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .message-role {
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .message-item.user .message-role {
          color: var(--accent-cyan);
        }
        .message-item.assistant .message-role {
          color: var(--accent-purple);
        }
        .message-time {
          font-size: 11px;
          color: var(--text-tertiary);
        }
        .message-text {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
          overflow-wrap: break-word;
        }

        /* Modal */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease;
        }
        .modal-content {
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 28px;
          max-width: 400px;
          width: 90%;
          animation: slideUp 0.2s ease;
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .modal-title {
          font-size: 18px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: var(--text-primary);
        }
        .modal-desc {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0 0 24px 0;
          line-height: 1.6;
        }
        .modal-desc strong {
          color: var(--text-primary);
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }
        .modal-btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        .modal-btn.secondary {
          background: rgba(255,255,255,0.05);
          color: var(--text-secondary);
        }
        .modal-btn.secondary:hover {
          background: rgba(255,255,255,0.1);
        }
        .modal-btn.danger {
          background: var(--accent-red);
          color: white;
        }
        .modal-btn.danger:hover:not(:disabled) {
          background: #dc2626;
        }
        .modal-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .project-title {
            font-size: 22px;
          }
          .name-input {
            font-size: 22px;
          }
          .quick-actions {
            flex-direction: column;
          }
          .action-btn.danger {
            margin-left: 0;
          }
          .modal-actions {
            flex-direction: column-reverse;
          }
        }
        /* IDE View Styles */
        .ide-container {
          display: flex; flex-direction: column; height: 100%; overflow: hidden;
        }
        .ide-tabs {
          display: flex; gap: 0; padding: 0 16px;
          border-bottom: 1px solid var(--glass-border); background: rgba(0,0,0,0.2); flex-shrink: 0;
        }
        .ide-tab {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 18px; font-size: 13px; font-weight: 500;
          color: var(--text-secondary); background: transparent; border: none;
          border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.15s ease;
        }
        .ide-tab:hover { color: var(--text-primary); background: rgba(255,255,255,0.03); }
        .ide-tab.active { color: var(--accent-cyan); border-bottom-color: var(--accent-cyan); }
        .ide-badge {
          font-size: 10px; padding: 2px 6px; background: var(--accent-cyan);
          color: #000; border-radius: 10px; font-weight: 600;
        }
        .ide-code-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .code-selector {
          display: flex; gap: 8px; padding: 10px 16px;
          border-bottom: 1px solid var(--glass-border); overflow-x: auto; background: rgba(0,0,0,0.15); flex-shrink: 0;
        }
        .code-sel-btn {
          display: flex; align-items: center; gap: 8px; padding: 6px 10px;
          background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border);
          border-radius: 6px; cursor: pointer; transition: all 0.15s ease; white-space: nowrap; color: var(--text-primary);
        }
        .code-sel-btn:hover { background: rgba(255,255,255,0.06); border-color: var(--glass-border-hover); }
        .code-sel-btn.active { background: rgba(0,212,255,0.1); border-color: var(--accent-cyan); }
        .lang-tag {
          font-size: 10px; padding: 2px 6px; background: var(--accent-purple);
          color: white; border-radius: 4px; font-weight: 600; text-transform: uppercase;
        }
        .code-display { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .code-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px; background: rgba(0,0,0,0.3); border-bottom: 1px solid var(--glass-border); flex-shrink: 0;
        }
        .code-copy-btn {
          padding: 5px 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
          border-radius: 6px; color: var(--text-secondary); font-size: 12px; cursor: pointer; transition: all 0.15s ease;
        }
        .code-copy-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
        .code-pre {
          flex: 1; margin: 0; padding: 16px; background: rgba(0,0,0,0.4); overflow: auto;
          font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace; font-size: 13px; line-height: 1.6;
        }
        .code-pre code { color: #e0e0e0; }
        .ide-preview-panel { flex: 1; display: flex; flex-direction: column; padding: 12px; overflow: hidden; }
        .preview-toolbar { display: flex; gap: 8px; margin-bottom: 10px; flex-shrink: 0; }
        .preview-action-btn {
          padding: 7px 14px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border);
          border-radius: 6px; color: var(--text-secondary); font-size: 12px; cursor: pointer; transition: all 0.15s ease;
        }
        .preview-action-btn:hover { background: rgba(255,255,255,0.1); color: var(--text-primary); }
        .preview-frame-wrap {
          flex: 1; background: white; border-radius: 8px; overflow: hidden; border: 1px solid var(--glass-border);
        }
        .preview-iframe { width: 100%; height: 100%; border: none; background: white; }
        .fullscreen-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.9); backdrop-filter: blur(8px);
          display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px;
        }
        .fullscreen-box {
          width: 100%; height: 100%; max-width: 1400px; background: #1a1a2e;
          border-radius: 12px; overflow: hidden; display: flex; flex-direction: column; border: 1px solid var(--glass-border);
        }
        .fullscreen-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 20px; background: rgba(0,0,0,0.3); border-bottom: 1px solid var(--glass-border);
          font-size: 14px; font-weight: 600; color: var(--text-primary);
        }

        /* Milestones Styles */
        .milestones-container {
          padding: 8px 0;
          max-width: 800px;
        }
        .milestones-header {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 20px;
        }
        .milestone-add-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 18px;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .milestone-add-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
        }
        .milestone-form {
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .milestone-input {
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
        }
        .milestone-input:focus {
          border-color: var(--accent-cyan);
        }
        .milestone-textarea {
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
          resize: vertical;
          font-family: inherit;
        }
        .milestone-textarea:focus {
          border-color: var(--accent-cyan);
        }
        .milestone-form-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .milestone-date-input {
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 10px 14px;
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
          color-scheme: dark;
        }
        .milestone-date-input:focus {
          border-color: var(--accent-cyan);
        }
        .milestone-form-actions {
          display: flex;
          gap: 8px;
          margin-left: auto;
        }
        .milestone-btn {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        .milestone-btn.primary {
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          color: white;
        }
        .milestone-btn.secondary {
          background: rgba(255,255,255,0.05);
          color: var(--text-secondary);
          border: 1px solid var(--glass-border);
        }
        .milestone-btn:hover {
          opacity: 0.9;
        }
        .milestone-timeline {
          position: relative;
          padding-left: 24px;
        }
        .milestone-timeline::before {
          content: '';
          position: absolute;
          left: 8px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: rgba(255,255,255,0.1);
        }
        .milestone-card {
          position: relative;
          margin-bottom: 16px;
        }
        .milestone-dot {
          position: absolute;
          left: -20px;
          top: 12px;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 2px solid var(--accent-cyan);
          background: var(--glass-bg);
          z-index: 1;
        }
        .milestone-dot.completed {
          background: var(--accent-green);
          border-color: var(--accent-green);
        }
        .milestone-dot.in-progress {
          background: var(--accent-amber);
          border-color: var(--accent-amber);
        }
        .milestone-card-inner {
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 16px;
          transition: all 0.2s ease;
        }
        .milestone-card-inner:hover {
          border-color: var(--glass-border-hover);
        }
        .milestone-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .milestone-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          color: var(--text-primary);
        }
        .milestone-title:hover {
          color: var(--accent-cyan);
        }
        .milestone-title:hover .edit-icon {
          opacity: 1;
        }
        .milestone-title-input {
          font-size: 16px;
          font-weight: 600;
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--accent-cyan);
          border-radius: 6px;
          padding: 4px 8px;
          color: var(--text-primary);
          outline: none;
          flex: 1;
        }
        .milestone-delete-btn {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 6px;
          color: var(--accent-red);
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .milestone-delete-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.5);
        }
        .milestone-status-badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s ease;
          margin-bottom: 10px;
        }
        .milestone-status-badge:hover {
          opacity: 0.8;
        }
        .milestone-description {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0 0 10px 0;
          line-height: 1.5;
        }
        .milestone-due-date {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: var(--text-tertiary);
          margin-bottom: 12px;
        }
        .milestone-tasks {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .milestone-task {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          padding: 8px 10px;
        }
        .milestone-task-checkbox {
          width: 16px;
          height: 16px;
          accent-color: var(--accent-green);
          cursor: pointer;
        }
        .milestone-task-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 13px;
          outline: none;
        }
        .milestone-task-input.done {
          text-decoration: line-through;
          color: var(--text-tertiary);
        }
        .milestone-task-input.new {
          color: var(--text-secondary);
        }
        .milestone-task-input.new::placeholder {
          color: var(--text-tertiary);
        }
        .milestone-task-delete {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .milestone-task:hover .milestone-task-delete {
          opacity: 1;
        }
        .milestone-task-delete:hover {
          color: var(--accent-red);
        }
        .milestone-task-add {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.02);
          border: 1px dashed var(--glass-border);
          border-radius: 8px;
          padding: 8px 10px;
        }
        .milestone-task-add-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: none;
          border: none;
          color: var(--accent-cyan);
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          padding: 2px 6px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        .milestone-task-add-btn:hover {
          background: rgba(0, 212, 255, 0.1);
        }
        @media (max-width: 640px) {
          .milestone-form-row {
            flex-direction: column;
            align-items: stretch;
          }
          .milestone-form-actions {
            margin-left: 0;
            justify-content: flex-end;
          }
          .milestone-task-delete {
            opacity: 1;
          }
        }

        /* Reviews View Styles */
        .reviews-container { padding: 8px 0; }
        .reviews-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
        }
        .reviews-title {
          display: flex; flex-direction: column; gap: 4px;
        }
        .reviews-title span:first-child {
          font-size: 18px; font-weight: 600; color: var(--text-primary);
        }
        .reviews-subtitle {
          font-size: 13px; color: var(--text-secondary);
        }
        .reviews-loading { font-size: 18px; font-weight: 600; color: var(--text-secondary); }
        .reviews-filter {
          display: flex; gap: 8px; flex-wrap: wrap;
        }
        .filter-btn {
          padding: 8px 16px; border-radius: 8px;
          font-size: 13px; font-weight: 500; cursor: pointer;
          background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border);
          color: var(--text-secondary); transition: all 0.15s ease;
        }
        .filter-btn:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
        .filter-btn.active {
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          color: white; border-color: transparent;
        }
        .reviews-loading-state {
          display: flex; align-items: center; justify-content: center;
          gap: 12px; height: 200px; color: var(--text-secondary); font-size: 14px;
        }
        .reviews-list {
          display: flex; flex-direction: column; gap: 16px;
        }
        .review-card {
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: 16px; padding: 20px;
          transition: all 0.2s ease;
        }
        .review-card:hover { border-color: var(--glass-border-hover); }
        .review-card.approved { border-color: rgba(34,197,94,0.3); }
        .review-card.rejected { border-color: rgba(239,68,68,0.3); }
        .review-card-header { margin-bottom: 16px; }
        .review-card-titles { display: flex; flex-direction: column; gap: 8px; }
        .review-card-title-row {
          display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        }
        .review-card-title {
          font-size: 16px; font-weight: 600; margin: 0; color: var(--text-primary);
        }
        .type-badge {
          font-size: 10px; padding: 3px 8px; border-radius: 6px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .type-badge-code { background: rgba(168,85,247,0.15); color: #a855f7; }
        .type-badge-feature { background: rgba(0,212,255,0.15); color: #00d4ff; }
        .type-badge-design { background: rgba(236,72,153,0.15); color: #ec4899; }
        .type-badge-decision { background: rgba(245,158,11,0.15); color: #f59e0b; }
        .status-badge {
          font-size: 10px; padding: 3px 8px; border-radius: 6px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
        }
        .status-badge-pending { background: rgba(245,158,11,0.15); color: #f59e0b; }
        .status-badge-approved { background: rgba(34,197,94,0.15); color: #22c55e; }
        .status-badge-rejected { background: rgba(239,68,68,0.15); color: #ef4444; }
        .review-card-description {
          font-size: 14px; color: var(--text-secondary); margin: 0;
        }
        .review-card-meta {
          display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
          font-size: 12px; color: var(--text-tertiary);
        }
        .meta-agent, .meta-project {
          display: flex; align-items: center; gap: 6px;
        }
        .meta-time {
          font-size: 11px; color: var(--text-tertiary);
        }
        .review-diff {
          background: rgba(0,0,0,0.4);
          border: 1px solid var(--glass-border);
          border-radius: 10px; margin-bottom: 16px; overflow: hidden;
        }
        .diff-header {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 14px; background: rgba(0,0,0,0.3);
          border-bottom: 1px solid var(--glass-border);
          font-size: 12px; font-weight: 600; color: var(--text-secondary);
        }
        .diff-content {
          padding: 12px 14px; font-family: 'SF Mono', Monaco, Inconsolata, 'Roboto Mono', monospace;
          font-size: 12px; line-height: 1.6; overflow-x: auto;
        }
        .diff-line {
          display: flex; gap: 8px; padding: 2px 0;
          white-space: pre-wrap; word-break: break-all;
        }
        .diff-line-marker {
          width: 16px; flex-shrink: 0; text-align: center;
          color: var(--text-tertiary); user-select: none;
        }
        .diff-line-content { flex: 1; }
        .diff-line-removed {
          color: #f87171;
          background: rgba(248,113,113,0.1);
          border-radius: 3px; padding: 1px 4px;
        }
        .diff-line-added {
          color: #4ade80;
          background: rgba(74,222,128,0.1);
          border-radius: 3px; padding: 1px 4px;
        }
        .diff-line-neutral {
          color: var(--text-secondary);
        }
        .review-card-actions {
          display: flex; gap: 12px;
        }
        .review-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 10px 20px; border-radius: 8px;
          font-size: 13px; font-weight: 600; cursor: pointer;
          transition: all 0.15s ease; border: none;
        }
        .review-btn.approve {
          background: linear-gradient(135deg, #22c55e, #16a34a);
          color: white;
        }
        .review-btn.approve:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(34,197,94,0.3);
        }
        .review-btn.reject {
          background: rgba(245,158,11,0.15);
          color: #f59e0b;
          border: 1px solid rgba(245,158,11,0.3);
        }
        .review-btn.reject:hover {
          background: rgba(245,158,11,0.25);
          border-color: rgba(245,158,11,0.5);
        }
        @media (max-width: 640px) {
          .reviews-header { flex-direction: column; align-items: flex-start; }
          .reviews-filter { width: 100%; }
          .filter-btn { flex: 1; }
          .review-card-actions { flex-direction: column; }
          .review-btn { width: 100%; justify-content: center; }
        }

        /* Swarm Panel Styles */
        .swarm-panel {
          background: rgba(0,0,0,0.2);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .swarm-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }
        .swarm-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .swarm-title svg {
          color: var(--accent-cyan);
        }
        .swarm-badge {
          background: var(--accent-cyan);
          color: #000;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 700;
        }
        .swarm-subtitle {
          font-size: 12px;
          color: var(--text-tertiary);
        }
        .swarm-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 32px;
          color: var(--text-tertiary);
          font-size: 13px;
        }
        .swarm-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .swarm-task {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          transition: all 0.15s ease;
        }
        .swarm-task:hover {
          background: rgba(255,255,255,0.05);
          border-color: var(--glass-border-hover);
        }
        .swarm-task.running {
          border-color: var(--accent-cyan);
          background: rgba(0,212,255,0.05);
        }
        .swarm-task.completed {
          border-color: rgba(34,197,94,0.3);
        }
        .swarm-task.error {
          border-color: rgba(239,68,68,0.3);
        }
        .swarm-task-icon {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .swarm-task-info {
          flex: 1;
          min-width: 0;
        }
        .swarm-task-name {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          margin-bottom: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .swarm-task-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 11px;
        }
        .swarm-task-model {
          color: var(--accent-purple);
          font-weight: 500;
        }
        .swarm-task-status {
          padding: 2px 8px;
          border-radius: 6px;
          font-weight: 600;
          text-transform: uppercase;
          font-size: 9px;
        }
        .swarm-task-status.running {
          background: rgba(0,212,255,0.15);
          color: var(--accent-cyan);
        }
        .swarm-task-status.completed {
          background: rgba(34,197,94,0.15);
          color: var(--accent-green);
        }
        .swarm-task-status.error {
          background: rgba(239,68,68,0.15);
          color: var(--accent-red);
        }
        .swarm-task-time {
          color: var(--text-tertiary);
        }
        .swarm-more {
          text-align: center;
          font-size: 12px;
          color: var(--text-tertiary);
          padding: 8px;
        }

        /* Agent Task Button */
        .agent-task-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 10px;
          margin-top: 12px;
          background: rgba(0,212,255,0.1);
          border: 1px solid var(--glass-border);
          border-radius: 8px;
          color: var(--accent-cyan);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .agent-task-btn:hover {
          background: rgba(0,212,255,0.2);
          border-color: var(--accent-cyan);
        }

        /* Task Modal Styles */
        .task-modal {
          background: var(--glass-bg);
          backdrop-filter: var(--glass-blur);
          -webkit-backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          max-width: 500px;
          width: 90%;
          animation: slideUp 0.2s ease;
        }
        .task-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 20px 0;
        }
        .task-modal-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: var(--text-primary);
        }
        .task-modal-agent {
          color: var(--accent-cyan);
        }
        .task-modal-close {
          background: none;
          border: none;
          color: var(--text-tertiary);
          font-size: 18px;
          cursor: pointer;
          padding: 4px;
          transition: color 0.2s ease;
        }
        .task-modal-close:hover {
          color: var(--text-primary);
        }
        .task-modal-body {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .task-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .task-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .task-textarea {
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          padding: 12px 14px;
          color: var(--text-primary);
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          min-height: 100px;
          outline: none;
        }
        .task-textarea:focus {
          border-color: var(--accent-cyan);
        }
        .task-select {
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--glass-border);
          border-radius: 10px;
          padding: 12px 14px;
          color: var(--text-primary);
          font-size: 14px;
          outline: none;
          cursor: pointer;
        }
        .task-select:focus {
          border-color: var(--accent-cyan);
        }
        .task-modal-actions {
          display: flex;
          gap: 12px;
          padding: 0 20px 20px;
          justify-content: flex-end;
        }
        .task-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
        }
        .task-btn.secondary {
          background: rgba(255,255,255,0.05);
          color: var(--text-secondary);
          border: 1px solid var(--glass-border);
        }
        .task-btn.secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.1);
        }
        .task-btn.primary {
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          color: white;
        }
        .task-btn.primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 212, 255, 0.3);
        }
        .task-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </main>
  )
}
