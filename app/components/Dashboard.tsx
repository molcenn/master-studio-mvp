'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Sidebar from './Sidebar'
import MainWorkspace from './MainWorkspace'
import ChatPanel from './ChatPanel'

type ViewType = 'dashboard' | 'workspace' | 'files' | 'calendar' | 'settings'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [activeProject, setActiveProject] = useState('00000000-0000-0000-0000-000000000001')
  const [activeView, setActiveView] = useState<ViewType>('dashboard')
  const [chatWidth, setChatWidth] = useState(380)

  // Simple password protection - bypass auth with query param
  const isDev = true // TODO: Set to false in production, use password protection
  
  if (!isDev && status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #12122a 40%, #0f1a2e 70%, #0a0f1a 100%)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Loading...</div>
      </div>
    )
  }

  if (!isDev && !session) {
    redirect('/auth/signin')
  }

  // Mock user for dev mode
  const currentUser = session?.user || { name: 'Murat', email: 'dev@localhost', image: null }

  // Header data (mock)
  const headerData = {
    date: new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    weather: { temp: '12°C', condition: 'Partly Cloudy', city: 'Istanbul' },
    rates: { usd: '36.42', eur: '38.15', btc: '97,245' },
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div 
      className="h-screen"
      style={{ 
        display: 'grid',
        gridTemplateRows: '40px 1fr',
        position: 'relative',
        zIndex: 1 
      }}
    >
      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(20, 20, 30, 0.4)',
        backdropFilter: 'blur(40px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{headerData.date}</span>
          <span>🌡️ {headerData.weather.temp} • {headerData.weather.city}</span>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <span>$ {headerData.rates.usd}</span>
          <span>€ {headerData.rates.eur}</span>
          <span>₿ {headerData.rates.btc}</span>
          <span style={{ fontWeight: 500, color: 'var(--accent-cyan)' }}>{headerData.time}</span>
        </div>
      </div>
      
      {/* Main Content */}
      <div 
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
        user={currentUser}
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
