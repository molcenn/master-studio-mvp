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

type ViewType = 'dashboard' | 'workspace' | 'files' | 'milestones' | 'agents' | 'reviews'

interface MainWorkspaceProps {
  activeProject: string
  activeView: ViewType
  setActiveProject: (id: string) => void
  setActiveView: (view: ViewType) => void
}

const PROJECT_COLORS = ['#00d4ff', '#a855f7', '#ec4899', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6']
const STATUS_VARIANTS = ['Aktif', 'Review', 'Planlama'] as const

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
    case 'Aktif': return 'status-active'
    case 'Review': return 'status-review'
    case 'Planlama': return 'status-planning'
    default: return 'status-active'
  }
}

function getProgressFromStatus(status: string) {
  switch (status) {
    case 'Aktif': return 75
    case 'Review': return 90
    case 'Planlama': return 25
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

  if (diffMins < 60) return `${diffMins} dk önce`
  if (diffHours < 24) return `${diffHours} saat önce`
  if (diffDays === 1) return '1 gün önce'
  return `${diffDays} gün önce`
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
    }
  }, [activeView, activeProject])

  // Fetch files when viewing files tab
  useEffect(() => {
    if (activeView === 'files' && activeProject) {
      fetchFiles()
    }
  }, [activeView, activeProject])

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
    if (!activeProject || activeProject === DEFAULT_PROJECT_ID) return
    try {
      const res = await fetch(`/api/chat?projectId=${activeProject}`)
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

  // Get active project display data
  const displayProject = activeProjectData || projects.find(p => p.id === activeProject)

  // View title mapping
  const viewTitles: Record<ViewType, string> = {
    dashboard: displayProject ? displayProject.name : 'Dashboard',
    workspace: 'Workspace',
    files: displayProject ? `${displayProject.name} — Dosyalar` : 'Files',
    milestones: 'Milestones',
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
                Yükleniyor...
              </div>
            ) : (
              <>
                {/* Welcome */}
                <div className="welcome-section">
                  <div className="welcome-greeting">Günaydın, <span>Murat</span> ✦</div>
                  <div className="welcome-summary">
                    {stats?.projectCount || 0} aktif proje · {stats?.activeAgents || 0} agent çalışıyor · {stats?.pendingReviews || 0} review bekliyor
                  </div>
                </div>

                {/* Stats */}
                <div className="stats-row">
                  <div className="stat-card">
                    <div className="stat-value gradient">{stats?.projectCount || 0}</div>
                    <div className="stat-label">Aktif Proje</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--accent-green)' }}>{stats?.activeAgents || 0}</div>
                    <div className="stat-label">Çalışan Agent</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--accent-amber)' }}>{stats?.pendingReviews || 0}</div>
                    <div className="stat-label">Bekleyen Review</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{stats?.todayMessageCount || 0}</div>
                    <div className="stat-label">Bugünkü Mesaj</div>
                  </div>
                </div>

                {/* Active Projects */}
                <div className="section-header">
                  <span className="section-title">Aktif Projeler</span>
                  <button className="section-action">Tümünü Gör →</button>
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
                            <div className="project-card-client">{messageCount} mesaj</div>
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
                  <span className="section-title">Bekleyen Review'lar</span>
                  <button className="section-action">Tümünü Gör →</button>
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
                      <div className="review-meta">coding-agent · Agent Dashboard · 10 dk önce</div>
                    </div>
                    <span className="review-priority priority-urgent">Acil</span>
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
                      <div className="review-meta">dalle-agent · Lansman Videosu · 1 saat önce</div>
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
            {!activeProject || activeProject === DEFAULT_PROJECT_ID ? (
              <EmptyState 
                icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <line x1="12" y1="3" x2="12" y2="21"/>
                </svg>}
                title="Proje çalışma alanı"
                description="Bir proje seçin"
              />
            ) : (
              <div className="workspace-detail">
                {/* Project Header */}
                <div className="workspace-header">
                  {isEditingName ? (
                    <div className="name-edit">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') updateProjectName()
                          if (e.key === 'Escape') {
                            setIsEditingName(false)
                            setEditName(activeProjectData?.name || '')
                          }
                        }}
                        onBlur={() => {
                          if (editName.trim() !== activeProjectData?.name) {
                            updateProjectName()
                          } else {
                            setIsEditingName(false)
                          }
                        }}
                        autoFocus
                        className="name-input"
                      />
                      {isSaving && <span className="saving-indicator">Kaydediliyor...</span>}
                    </div>
                  ) : (
                    <h1 
                      className="project-title"
                      onClick={() => {
                        setEditName(activeProjectData?.name || '')
                        setIsEditingName(true)
                      }}
                      title="Düzenlemek için tıklayın"
                    >
                      {activeProjectData?.name || 'Yükleniyor...'}
                      <svg className="edit-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </h1>
                  )}
                  
                  {/* Project Meta */}
                  <div className="project-meta">
                    <span className="meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                        <line x1="16" y1="2" x2="16" y2="6"/>
                        <line x1="8" y1="2" x2="8" y2="6"/>
                        <line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {activeProjectData?.created_at 
                        ? new Date(activeProjectData.created_at).toLocaleDateString('tr-TR', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })
                        : '-'
                      }
                    </span>
                    <span className="meta-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      {activeProjectData?.messages?.[0]?.count || 0} mesaj
                    </span>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="quick-actions">
                  <button 
                    className="action-btn primary"
                    onClick={() => setActiveView('dashboard')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Chat'e Git
                  </button>
                  <button 
                    className="action-btn secondary"
                    onClick={() => setActiveView('files')}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    Dosyalar
                  </button>
                  <button 
                    className="action-btn danger"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Projeyi Sil
                  </button>
                </div>

                {/* Recent Messages */}
                <div className="messages-section">
                  <h3 className="section-heading">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    Son Mesajlar
                  </h3>
                  {recentMessages.length === 0 ? (
                    <div className="no-messages">Henüz mesaj yok</div>
                  ) : (
                    <div className="messages-list">
                      {recentMessages.map((msg) => (
                        <div key={msg.id} className={`message-item ${msg.role}`}>
                          <div className="message-avatar">
                            {msg.role === 'user' ? 'U' : 'AI'}
                          </div>
                          <div className="message-content">
                            <div className="message-header">
                              <span className="message-role">
                                {msg.role === 'user' ? 'Kullanıcı' : 'AI'}
                              </span>
                              <span className="message-time">
                                {timeAgo(msg.created_at)}
                              </span>
                            </div>
                            <p className="message-text">
                              {msg.content.length > 120 
                                ? msg.content.slice(0, 120) + '...' 
                                : msg.content
                              }
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Delete Confirmation Modal */}
                {showDeleteModal && (
                  <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                      <h3 className="modal-title">Projeyi Sil</h3>
                      <p className="modal-desc">
                        <strong>"{activeProjectData?.name}"</strong> projesini silmek istediğinize emin misiniz?
                        <br />Bu işlem geri alınamaz.
                      </p>
                      <div className="modal-actions">
                        <button 
                          className="modal-btn secondary"
                          onClick={() => setShowDeleteModal(false)}
                          disabled={isDeleting}
                        >
                          İptal
                        </button>
                        <button 
                          className="modal-btn danger"
                          onClick={deleteProject}
                          disabled={isDeleting}
                        >
                          {isDeleting ? 'Siliniyor...' : 'Evet, Sil'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
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

        {activeView === 'milestones' && (
          <EmptyState 
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="1.5">
              <path d="M12 20V10"/>
              <path d="M18 20V4"/>
              <path d="M6 20v-4"/>
            </svg>}
            title="Henüz milestone yok"
            description="Proje milestone'ları burada görünecek"
          />
        )}

        {activeView === 'agents' && (
          <div className="agents-view">
            <div className="section-header">
              <span className="section-title">AI Agent'larım</span>
              <button className="section-action">Yenile ↻</button>
            </div>
            <div className="agents-grid">
              {/* Kimi K2.5 */}
              <div className="agent-card">
                <div className="agent-card-header">
                  <div className="agent-avatar-large cyan">K</div>
                  <div className="agent-info">
                    <div className="agent-name">Kimi K2.5</div>
                    <div className="agent-role">Ana Model</div>
                  </div>
                  <span className="agent-status-badge active">Aktif</span>
                </div>
                <div className="agent-description">Günlük görevler, hızlı yanıt, genel amaçlı üretim</div>
              </div>

              {/* Claude Opus */}
              <div className="agent-card">
                <div className="agent-card-header">
                  <div className="agent-avatar-large purple">O</div>
                  <div className="agent-info">
                    <div className="agent-name">Claude Opus</div>
                    <div className="agent-role">Derin Analiz</div>
                  </div>
                  <span className="agent-status-badge pending">Beklemede</span>
                </div>
                <div className="agent-description">Kod review, mimari kararlar, karmaşık analizler</div>
              </div>

              {/* Claude Sonnet */}
              <div className="agent-card">
                <div className="agent-card-header">
                  <div className="agent-avatar-large pink">S</div>
                  <div className="agent-info">
                    <div className="agent-name">Claude Sonnet</div>
                    <div className="agent-role">UI/UX Geliştirme</div>
                  </div>
                  <span className="agent-status-badge pending">Beklemede</span>
                </div>
                <div className="agent-description">Component yazma, UI geliştirme, tasarım işleri</div>
              </div>

              {/* DALL-E */}
              <div className="agent-card">
                <div className="agent-card-header">
                  <div className="agent-avatar-large green">D</div>
                  <div className="agent-info">
                    <div className="agent-name">DALL-E</div>
                    <div className="agent-role">Görsel Üretimi</div>
                  </div>
                  <span className="agent-status-badge pending">Beklemede</span>
                </div>
                <div className="agent-description">Image generation, görsel içerik üretimi</div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'reviews' && (
          <EmptyState 
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-green)" strokeWidth="1.5">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>}
            title="Review bekleyen görev yok"
            description="Tüm review'lar tamamlandı"
          />
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
        .agents-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
        .agent-card {
          background: rgba(0,0,0,0.2); border: 1px solid var(--glass-border);
          border-radius: 16px; padding: 20px;
          transition: all 0.2s ease;
        }
        .agent-card:hover { border-color: var(--glass-border-hover); background: rgba(0,0,0,0.3); transform: translateY(-2px); }
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
        .agent-role { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
        .agent-status-badge {
          font-size: 9px; padding: 4px 10px; border-radius: 10px;
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
          flex-shrink: 0;
        }
        .agent-status-badge.active { background: rgba(34,197,94,0.15); color: var(--accent-green); }
        .agent-status-badge.pending { background: rgba(148,163,184,0.15); color: var(--text-tertiary); }
        .agent-description { font-size: 12px; color: var(--text-secondary); line-height: 1.5; }
        @media (max-width: 768px) {
          .agents-grid { grid-template-columns: 1fr; }
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
      `}</style>
    </main>
  )
}
