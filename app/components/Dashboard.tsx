'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import Sidebar from './Sidebar'
import MainWorkspace from './MainWorkspace'
import ChatPanel from './ChatPanel'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const [activeProject, setActiveProject] = useState('ai-agent-dashboard')

  if (status === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0a0a14 0%, #12122a 40%, #0f1a2e 70%, #0a0f1a 100%)' }}>
        <div style={{ color: 'var(--text-secondary)' }}>Yükleniyor...</div>
      </div>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  return (
    <div 
      className="grid h-screen"
      style={{ 
        gridTemplateColumns: '260px 1fr 380px',
        position: 'relative',
        zIndex: 1 
      }}
    >
      <Sidebar 
        activeProject={activeProject} 
        setActiveProject={setActiveProject}
        user={session.user}
      />
      <MainWorkspace />
      <ChatPanel projectId={activeProject} />
    </div>
  )
}
