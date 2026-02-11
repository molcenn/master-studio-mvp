'use client'

import { useState, useEffect } from 'react'

interface Project {
  id: string
  name: string
  created_at: string
}

type ViewType = 'dashboard' | 'workspace' | 'files' | 'agents' | 'reviews'

interface SidebarProps {
  activeProject: string
  setActiveProject: (id: string) => void
  user?: {
    name?: string | null
    email?: string | null
    image?: string | null
  }
  activeView: ViewType
  setActiveView: (view: ViewType) => void
}

const PROJECT_COLORS = ['#00d4ff', '#a855f7', '#ec4899', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6']

const skills = [
  { 
    category: 'Productivity', 
    items: [
      { name: 'Notion', active: true, color: '#00d4ff' },
      { name: 'Apple Notes', active: true, color: '#f59e0b' },
      { name: 'Google Calendar', active: false, color: '#22c55e' },
    ]
  },
  { 
    category: 'Dev', 
    items: [
      { name: 'GitHub', active: true, color: '#a855f7' },
      { name: 'Figma API', active: true, color: '#3b82f6' },
      { name: 'DALL·E', active: true, color: '#22c55e' },
    ]
  },
  { 
    category: 'Media', 
    items: [
      { name: 'OpenAI Image Gen', active: true, color: '#ec4899' },
      { name: 'OpenAI Whisper', active: false, color: '#f59e0b' },
      { name: 'TTS / Voice', active: true, color: '#00d4ff' },
    ]
  },
  { 
    category: 'Communication', 
    items: [
      { name: 'Slack', active: false, color: '#a855f7' },
      { name: 'Telegram', active: true, color: '#3b82f6' },
      { name: 'Email', active: false, color: '#22c55e' },
    ]
  },
]

export default function Sidebar({ activeProject, setActiveProject, user, activeView, setActiveView }: SidebarProps) {
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [activeSkill, setActiveSkill] = useState<string | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showNewProjectModal, setShowNewProjectModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // Fetch projects from API
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      setProjects(data.projects || [])
    } catch (err) {
      console.error('Error fetching projects:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const createProject = async () => {
    if (!newProjectName.trim()) return
    
    setIsCreating(true)
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName.trim() }),
      })
      
      if (!res.ok) throw new Error('Failed to create project')
      
      const data = await res.json()
      setProjects([...projects, data.project])
      setActiveProject(data.project.id)
      setNewProjectName('')
      setShowNewProjectModal(false)
    } catch (err) {
      console.error('Error creating project:', err)
      alert('Failed to create project')
    } finally {
      setIsCreating(false)
    }
  }

  const getProjectColor = (index: number) => PROJECT_COLORS[index % PROJECT_COLORS.length]

  const deleteProject = async (projectId: string) => {
    if (!confirm('Delete this project?')) return
    
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })
      
      if (!res.ok) throw new Error('Failed to delete project')
      
      setProjects(projects.filter(p => p.id !== projectId))
      
      // If deleted project was active, switch to default
      if (activeProject === projectId) {
        const remaining = projects.filter(p => p.id !== projectId)
        if (remaining.length > 0) {
          setActiveProject(remaining[0].id)
        } else {
          setActiveProject('00000000-0000-0000-0000-000000000001')
        }
      }
    } catch (err) {
      console.error('Error deleting project:', err)
      alert('Failed to delete project')
    }
  }

  return (
    <aside className="panel sidebar" style={{ borderRight: '1px solid var(--glass-border)' }}>
      {/* Logo */}
      <div className="panel-header">
        <div className="logo">
          <div className="logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="3" fill="white"/>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="white" strokeWidth="1.5" opacity="0.7"/>
              <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1" opacity="0.3"/>
            </svg>
          </div>
          Master Studio
        </div>
      </div>

      <div className="panel-content">
        {/* Navigation */}
        <div style={{ padding: '12px 14px' }}>
          <div 
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="7" height="7" rx="1.5"/>
              <rect x="14" y="3" width="7" height="7" rx="1.5"/>
              <rect x="3" y="14" width="7" height="7" rx="1.5"/>
              <rect x="14" y="14" width="7" height="7" rx="1.5"/>
            </svg>
            Dashboard
          </div>
          <div 
            className={`nav-item ${activeView === 'workspace' ? 'active' : ''}`}
            onClick={() => setActiveView('workspace')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <line x1="12" y1="3" x2="12" y2="21"/>
            </svg>
            Workspace
          </div>
          <div 
            className={`nav-item ${activeView === 'files' ? 'active' : ''}`}
            onClick={() => setActiveView('files')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Files
          </div>
          <div 
            className={`nav-item ${activeView === 'agents' ? 'active' : ''}`}
            onClick={() => setActiveView('agents')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
              <circle cx="4.93" cy="4.93" r="1.5"/>
              <circle cx="19.07" cy="4.93" r="1.5"/>
              <circle cx="19.07" cy="19.07" r="1.5"/>
            </svg>
            Agents
            <span className="nav-badge purple">4</span>
          </div>
          <div 
            className={`nav-item ${activeView === 'reviews' ? 'active' : ''}`}
            onClick={() => setActiveView('reviews')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Reviews
            <span className="nav-badge red">3</span>
          </div>
        </div>

        {/* Skills */}
        <div className="skills-section">
          <div className="skills-header" onClick={() => setSkillsOpen(!skillsOpen)}>
            <div className="skills-header-left">
              <svg 
                className={`skills-toggle-icon ${!skillsOpen ? 'collapsed' : ''}`} 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2"
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              <span className="skills-header-title">Skills</span>
            </div>
            <span className="skills-count">12</span>
          </div>
          <div className={`skills-body ${!skillsOpen ? 'collapsed' : ''}`}>
            {skills.map((category) => (
              <div key={category.category}>
                <div className="skills-category-title">{category.category}</div>
                <div className="skills-list">
                  {category.items.map((skill) => (
                    <div key={skill.name} className="skill-item">
                      <div className="skill-dot" style={{ background: skill.color }}></div>
                      <span className="skill-name">{skill.name}</span>
                      <button 
                        className={`skill-toggle ${skill.active ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          // Toggle would go here
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projects */}
        <div style={{ padding: '12px 14px' }}>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: '8px', padding: '0 8px' }}>
            Projects
          </div>
          {isLoading ? (
            <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-tertiary)' }}>Loading...</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {projects.map((project, index) => (
                <div
                  key={project.id}
                  onClick={() => {
                    setActiveProject(project.id)
                    setActiveView('workspace')
                  }}
                  className={`project-item ${activeProject === project.id ? 'active' : ''}`}
                >
                  <div className="project-dot" style={{ background: getProjectColor(index) }}></div>
                  <span className="project-item-name">{project.name}</span>
                  <button
                    className="project-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteProject(project.id)
                    }}
                    title="Delete project"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <button 
            className="new-project-btn" 
            style={{ marginTop: '10px' }}
            onClick={() => setShowNewProjectModal(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Project
          </button>
        </div>

        {/* New Project Modal */}
        {showNewProjectModal && (
          <div className="modal-overlay" onClick={() => setShowNewProjectModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>New Project</h3>
                <button className="modal-close" onClick={() => setShowNewProjectModal(false)}>×</button>
              </div>
              <div className="modal-body">
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project name..."
                  className="modal-input"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && createProject()}
                />
              </div>
              <div className="modal-footer">
                <button 
                  className="modal-btn secondary" 
                  onClick={() => setShowNewProjectModal(false)}
                  disabled={isCreating}
                >
                  Cancel
                </button>
                <button 
                  className="modal-btn primary" 
                  onClick={createProject}
                  disabled={!newProjectName.trim() || isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      {user && (
        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {user.image ? (
            <img src={user.image} alt={user.name || ''} style={{ width: '28px', height: '28px', borderRadius: '50%' }} />
          ) : (
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div>
            <div style={{ fontSize: '12px', fontWeight: 500 }}>{user.name}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{user.email}</div>
          </div>
        </div>
      )}

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
        .panel-header {
          padding: 14px 18px;
          border-bottom: 1px solid var(--glass-border);
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
        }
        .panel-content { flex: 1; overflow-y: auto; }
        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 16px;
          font-weight: 700;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .logo-icon {
          width: 30px; height: 30px;
          border-radius: 8px;
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .nav-item {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 12px; border-radius: 8px;
          cursor: pointer; transition: all 0.15s ease;
          font-size: 13px; color: var(--text-secondary);
          position: relative;
        }
        .nav-item:hover { background: rgba(255,255,255,0.04); color: var(--text-primary); }
        .nav-item.active {
          background: linear-gradient(135deg, rgba(0,212,255,0.1), rgba(168,85,247,0.1));
          color: var(--text-primary);
        }
        .nav-item.active::before {
          content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
          width: 3px; height: 20px; border-radius: 0 3px 3px 0;
          background: linear-gradient(180deg, var(--accent-cyan), var(--accent-purple));
        }
        .nav-icon { width: 18px; height: 18px; opacity: 0.6; flex-shrink: 0; }
        .nav-item.active .nav-icon { opacity: 1; }
        .nav-badge {
          margin-left: auto; min-width: 18px; height: 18px;
          border-radius: 9px; font-size: 10px; font-weight: 600;
          display: flex; align-items: center; justify-content: center;
          padding: 0 5px;
        }
        .nav-badge.red { background: var(--accent-red); color: white; }
        .nav-badge.purple { background: rgba(168,85,247,0.2); color: var(--accent-purple); }
        .skills-section { padding: 0 14px 12px; }
        .skills-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 8px; margin-bottom: 8px; cursor: pointer;
          user-select: none;
        }
        .skills-header-left { display: flex; align-items: center; gap: 6px; }
        .skills-header-title {
          font-size: 10px; font-weight: 600; letter-spacing: 1.2px;
          text-transform: uppercase; color: var(--text-tertiary);
        }
        .skills-toggle-icon {
          width: 14px; height: 14px; color: var(--text-tertiary);
          transition: transform 0.25s ease;
        }
        .skills-toggle-icon.collapsed { transform: rotate(-90deg); }
        .skills-count {
          font-size: 9px; color: var(--text-tertiary);
          background: rgba(255,255,255,0.05); padding: 1px 6px;
          border-radius: 8px;
        }
        .skills-body {
          display: flex; flex-direction: column; gap: 10px;
          overflow: hidden; transition: max-height 0.35s ease, opacity 0.25s ease;
          max-height: 600px; opacity: 1;
        }
        .skills-body.collapsed { max-height: 0; opacity: 0; pointer-events: none; }
        .skills-category-title {
          font-size: 9px; font-weight: 600; letter-spacing: 0.8px;
          text-transform: uppercase; color: var(--text-tertiary);
          padding: 4px 8px 2px; opacity: 0.7;
        }
        .skills-list { display: flex; flex-direction: column; gap: 1px; }
        .skill-item {
          display: flex; align-items: center; gap: 8px;
          padding: 5px 8px; border-radius: 6px;
          transition: background 0.12s ease;
        }
        .skill-item:hover { background: rgba(255,255,255,0.03); }
        .skill-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .skill-name { font-size: 12px; color: var(--text-secondary); flex: 1; }
        .skill-toggle {
          position: relative; width: 28px; height: 16px;
          background: rgba(255,255,255,0.08); border-radius: 8px;
          cursor: pointer; transition: background 0.2s ease;
          flex-shrink: 0; border: none; padding: 0;
        }
        .skill-toggle::after {
          content: ''; position: absolute;
          top: 2px; left: 2px; width: 12px; height: 12px;
          border-radius: 50%; background: rgba(255,255,255,0.3);
          transition: all 0.2s ease;
        }
        .skill-toggle.active {
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
        }
        .skill-toggle.active::after {
          left: 14px; background: white;
        }
        .project-item {
          display: flex; align-items: center; gap: 10px;
          padding: 8px 12px; border-radius: 8px;
          cursor: pointer; transition: all 0.15s ease;
        }
        .project-item:hover { background: rgba(255,255,255,0.04); }
        .project-item.active { background: rgba(0,212,255,0.08); }
        .project-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .project-item-name { font-size: 13px; color: var(--text-secondary); flex: 1; }
        .project-item.active .project-item-name { color: var(--text-primary); }
        .project-delete-btn {
          opacity: 0;
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
        }
        .project-item:hover .project-delete-btn { opacity: 1; }
        .project-delete-btn:hover { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .new-project-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 8px 12px; border-radius: 8px;
          border: 1px dashed rgba(255,255,255,0.1); background: transparent;
          color: var(--text-tertiary); cursor: pointer; font-size: 12px;
          transition: all 0.15s ease; width: 100%;
        }
        .new-project-btn:hover { border-color: var(--accent-cyan); color: var(--accent-cyan); }
        .modal-overlay {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: var(--glass-bg); backdrop-filter: var(--glass-blur);
          border: 1px solid var(--glass-border); border-radius: 12px;
          width: 90%; max-width: 400px; padding: 20px;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 16px;
        }
        .modal-header h3 {
          font-size: 16px; font-weight: 600; margin: 0;
        }
        .modal-close {
          background: none; border: none; color: var(--text-tertiary);
          font-size: 24px; cursor: pointer; padding: 0; width: 28px; height: 28px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 6px; transition: all 0.15s ease;
        }
        .modal-close:hover { background: rgba(255,255,255,0.05); color: var(--text-primary); }
        .modal-input {
          width: 100%; padding: 10px 14px; border-radius: 8px;
          border: 1px solid var(--glass-border); background: rgba(0,0,0,0.25);
          color: var(--text-primary); font-size: 14px; outline: none;
        }
        .modal-input:focus { border-color: rgba(0,212,255,0.3); }
        .modal-footer {
          display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px;
        }
        .modal-btn {
          padding: 8px 16px; border-radius: 8px; font-size: 13px;
          cursor: pointer; transition: all 0.15s ease; border: none;
        }
        .modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .modal-btn.secondary {
          background: rgba(255,255,255,0.05); color: var(--text-secondary);
        }
        .modal-btn.secondary:hover:not(:disabled) {
          background: rgba(255,255,255,0.1); color: var(--text-primary);
        }
        .modal-btn.primary {
          background: linear-gradient(135deg, var(--accent-cyan), var(--accent-purple));
          color: white;
        }
        .modal-btn.primary:hover:not(:disabled) { opacity: 0.9; }
      `}</style>
    </aside>
  )
}
