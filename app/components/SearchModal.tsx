'use client'

import { useState, useEffect, useRef, useMemo } from 'react'

interface Project {
  id: string
  name: string
  description?: string
  created_at: string
  status?: string
  progress?: number
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  projects: Project[]
  onSelectProject: (id: string) => void
  onNavigate: (view: string) => void
}

interface SearchResult {
  type: 'project' | 'navigation' | 'action'
  id: string
  title: string
  subtitle?: string
  icon: React.ReactNode
  action: () => void
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  )},
  { id: 'workspace', label: 'Workspace', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/>
    </svg>
  )},
  { id: 'files', label: 'Files', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )},
  { id: 'calendar', label: 'Calendar', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )},
  { id: 'settings', label: 'Settings', icon: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9"/>
    </svg>
  )},
]

export default function SearchModal({ isOpen, onClose, projects, onSelectProject, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Build results
  const results = useMemo<SearchResult[]>(() => {
    const q = query.toLowerCase().trim()
    const items: SearchResult[] = []

    // Navigation items
    NAV_ITEMS.forEach(nav => {
      if (!q || nav.label.toLowerCase().includes(q) || nav.id.includes(q)) {
        items.push({
          type: 'navigation',
          id: `nav-${nav.id}`,
          title: nav.label,
          subtitle: 'Navigate',
          icon: nav.icon,
          action: () => onNavigate(nav.id),
        })
      }
    })

    // Projects
    projects.forEach(project => {
      if (!q || project.name.toLowerCase().includes(q) || project.description?.toLowerCase().includes(q)) {
        items.push({
          type: 'project',
          id: `project-${project.id}`,
          title: project.name,
          subtitle: project.description || `Created ${new Date(project.created_at).toLocaleDateString()}`,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          ),
          action: () => onSelectProject(project.id),
        })
      }
    })

    // Quick actions
    const actions = [
      { id: 'theme-toggle', label: 'Toggle Theme', desc: 'Switch between dark and light mode', action: () => {
        const current = localStorage.getItem('master-studio-settings')
        const settings = current ? JSON.parse(current) : { theme: 'dark' }
        const newTheme = settings.theme === 'dark' ? 'light' : 'dark'
        settings.theme = newTheme
        localStorage.setItem('master-studio-settings', JSON.stringify(settings))
        if (newTheme === 'light') {
          document.documentElement.classList.add('light')
          document.documentElement.classList.remove('dark')
        } else {
          document.documentElement.classList.add('dark')
          document.documentElement.classList.remove('light')
        }
        onClose()
      }},
    ]
    
    actions.forEach(act => {
      if (!q || act.label.toLowerCase().includes(q) || act.desc.toLowerCase().includes(q)) {
        items.push({
          type: 'action',
          id: act.id,
          title: act.label,
          subtitle: act.desc,
          icon: (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ),
          action: act.action,
        })
      }
    })

    return items
  }, [query, projects, onNavigate, onSelectProject, onClose])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        results[selectedIndex].action()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex])

  // Scroll selected item into view
  useEffect(() => {
    if (!resultsRef.current) return
    const items = resultsRef.current.querySelectorAll('[data-result-item]')
    if (items[selectedIndex]) {
      items[selectedIndex].scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  if (!isOpen) return null

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'navigation': return 'Page'
      case 'project': return 'Project'
      case 'action': return 'Action'
      default: return type
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'navigation': return 'var(--accent-cyan)'
      case 'project': return 'var(--accent-purple)'
      case 'action': return 'var(--accent-amber)'
      default: return 'var(--text-tertiary)'
    }
  }

  return (
    <div className="search-overlay" onClick={onClose}>
      <div className="search-container" onClick={e => e.stopPropagation()}>
        {/* Search Input */}
        <div className="search-input-wrapper">
          <svg className="search-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search projects, pages, actions..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
          />
          <div className="search-shortcut">
            <kbd>ESC</kbd>
          </div>
        </div>

        {/* Results */}
        <div className="search-results" ref={resultsRef}>
          {results.length === 0 ? (
            <div className="search-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5">
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span>No results for &quot;{query}&quot;</span>
            </div>
          ) : (
            results.map((result, index) => (
              <div
                key={result.id}
                data-result-item
                className={`search-result-item ${index === selectedIndex ? 'selected' : ''}`}
                onClick={() => result.action()}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="search-result-icon" style={{ color: getTypeColor(result.type) }}>
                  {result.icon}
                </div>
                <div className="search-result-info">
                  <div className="search-result-title">{result.title}</div>
                  {result.subtitle && (
                    <div className="search-result-subtitle">{result.subtitle}</div>
                  )}
                </div>
                <span 
                  className="search-result-type"
                  style={{ 
                    color: getTypeColor(result.type),
                    background: `${getTypeColor(result.type)}15`,
                    border: `1px solid ${getTypeColor(result.type)}30`,
                  }}
                >
                  {getTypeLabel(result.type)}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="search-footer">
          <div className="search-footer-hints">
            <span><kbd>↑↓</kbd> Navigate</span>
            <span><kbd>↵</kbd> Select</span>
            <span><kbd>ESC</kbd> Close</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .search-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0,0,0,0.6);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 15vh;
          z-index: 1100;
          animation: fadeIn 0.15s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .search-container {
          width: 90%;
          max-width: 580px;
          background: rgba(18, 18, 42, 0.95);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid var(--glass-border);
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset;
          animation: slideDown 0.2s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-12px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .search-input-wrapper {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-bottom: 1px solid var(--glass-border);
        }
        .search-input-icon {
          color: var(--text-tertiary);
          flex-shrink: 0;
        }
        .search-input {
          flex: 1;
          background: none;
          border: none;
          outline: none;
          color: var(--text-primary);
          font-size: 15px;
          font-family: inherit;
        }
        .search-input::placeholder {
          color: var(--text-tertiary);
        }
        .search-shortcut {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .search-shortcut kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 24px;
          height: 22px;
          padding: 0 6px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 5px;
          font-size: 10px;
          font-family: inherit;
          color: var(--text-tertiary);
        }
        .search-results {
          max-height: 360px;
          overflow-y: auto;
          padding: 8px;
        }
        .search-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 40px 20px;
          color: var(--text-tertiary);
          font-size: 13px;
        }
        .search-result-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.1s ease;
        }
        .search-result-item:hover,
        .search-result-item.selected {
          background: rgba(255,255,255,0.05);
        }
        .search-result-item.selected {
          background: linear-gradient(135deg, rgba(0,212,255,0.08), rgba(168,85,247,0.08));
          border: 1px solid rgba(0,212,255,0.15);
          margin: -1px;
        }
        .search-result-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .search-result-info {
          flex: 1;
          min-width: 0;
        }
        .search-result-title {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .search-result-subtitle {
          font-size: 11px;
          color: var(--text-tertiary);
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .search-result-type {
          font-size: 9px;
          font-weight: 600;
          padding: 3px 8px;
          border-radius: 6px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          flex-shrink: 0;
        }
        .search-footer {
          padding: 10px 20px;
          border-top: 1px solid var(--glass-border);
          background: rgba(0,0,0,0.15);
        }
        .search-footer-hints {
          display: flex;
          gap: 16px;
          font-size: 11px;
          color: var(--text-tertiary);
        }
        .search-footer-hints kbd {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          font-size: 9px;
          font-family: inherit;
          color: var(--text-tertiary);
          margin-right: 4px;
        }
      `}</style>
    </div>
  )
}
