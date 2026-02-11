'use client'

import { useState, useEffect } from 'react'

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

type ViewType = 'dashboard' | 'workspace' | 'files' | 'milestones' | 'agents' | 'reviews'

interface MainWorkspaceProps {
  activeProject: string
  activeView: ViewType
  setActiveProject: (id: string) => void
}

const PROJECT_COLORS = ['#00d4ff', '#a855f7', '#ec4899', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6']
const STATUS_VARIANTS = ['Aktif', 'Review', 'Planlama'] as const

function getProjectColor(index: number) {
  return PROJECT_COLORS[index % PROJECT_COLORS.length]
}

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
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

export default function MainWorkspace({ activeProject, activeView, setActiveProject }: MainWorkspaceProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectData, setActiveProjectData] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

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

  // Get active project display data
  const displayProject = activeProjectData || projects.find(p => p.id === activeProject)

  // View title mapping
  const viewTitles: Record<ViewType, string> = {
    dashboard: displayProject ? displayProject.name : 'Dashboard',
    workspace: 'Workspace',
    files: 'Files',
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
                        onClick={() => setActiveProject(project.id)}
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
          <EmptyState 
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="12" y1="3" x2="12" y2="21"/>
            </svg>}
            title="Proje çalışma alanı"
            description="Bir proje seçin"
          />
        )}

        {activeView === 'files' && (
          <EmptyState 
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" strokeWidth="1.5">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>}
            title="Henüz dosya yüklenmedi"
            description="Dosyalarınız burada görünecek"
          />
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
          <EmptyState 
            icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--accent-purple)" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
              <circle cx="4.93" cy="4.93" r="1.5"/>
              <circle cx="19.07" cy="4.93" r="1.5"/>
              <circle cx="19.07" cy="19.07" r="1.5"/>
            </svg>}
            title="Agent yönetimi"
            description="Aktif agent'larınız burada görünecek"
          />
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
      `}</style>
    </main>
  )
}
