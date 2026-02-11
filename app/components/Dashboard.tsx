'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Sidebar from './Sidebar'
import MainWorkspace from './MainWorkspace'
import ChatPanel from './ChatPanel'

type ViewType = 'dashboard' | 'workspace' | 'files' | 'agents' | 'reviews'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [activeProject, setActiveProject] = useState('00000000-0000-0000-0000-000000000001')
  const [activeView, setActiveView] = useState<ViewType>('dashboard')
  const [chatWidth, setChatWidth] = useState(380)

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #12122a 40%, #0f1a2e 70%, #0a0f1a 100%)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div 
      className="h-screen"
      style={{ 
        display: 'grid',
        gridTemplateColumns: `260px 1fr 4px ${chatWidth}px`,
        position: 'relative',
        zIndex: 1 
      }}
    >
      <Sidebar 
        activeProject={activeProject} 
        setActiveProject={setActiveProject}
        user={session.user}
        activeView={activeView}
        setActiveView={setActiveView}
      />
      <MainWorkspace 
        activeProject={activeProject}
        activeView={activeView}
        setActiveProject={setActiveProject}
        setActiveView={setActiveView}
      />
      <div 
        style={{
          cursor: 'col-resize',
          background: 'transparent',
          transition: 'background 0.15s ease',
          zIndex: 10,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--accent-cyan)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        onMouseDown={(e) => {
          e.preventDefault()
          e.currentTarget.style.background = 'var(--accent-cyan)'
          const startX = e.clientX
          const startWidth = chatWidth
          const onMouseMove = (ev: MouseEvent) => {
            const diff = startX - ev.clientX
            const newWidth = Math.min(700, Math.max(300, startWidth + diff))
            setChatWidth(newWidth)
          }
          const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
          }
          document.addEventListener('mousemove', onMouseMove)
          document.addEventListener('mouseup', onMouseUp)
        }}
      />
      <ChatPanel 
        projectId={activeProject} 
        onHtmlDetected={() => {
          setActiveView('workspace')
        }}
      />
    </div>
  )
}
