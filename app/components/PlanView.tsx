'use client'

import { useState, useEffect } from 'react'

interface PlanViewProps {
  projectId: string
}

function renderPlanMarkdown(text: string): string {
  return text
    .replace(/^### (.+)$/gm, '<h3 style="font-size:15px;font-weight:600;color:var(--text-primary);margin:20px 0 8px;padding-bottom:4px;border-bottom:1px solid var(--glass-border)">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:17px;font-weight:700;color:var(--accent-cyan);margin:24px 0 10px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-size:22px;font-weight:800;color:var(--text-primary);margin:0 0 16px;background:linear-gradient(135deg,var(--accent-cyan),var(--accent-purple));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">$1</h1>')
    .replace(/^- \[x\] (.+)$/gm, '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px"><span style="color:#4ade80">✓</span><span style="color:var(--text-tertiary);text-decoration:line-through">$1</span></div>')
    .replace(/^- \[ \] (.+)$/gm, '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:13px"><span style="width:14px;height:14px;border:1.5px solid var(--text-tertiary);border-radius:3px;display:inline-block;flex-shrink:0"></span><span style="color:var(--text-secondary)">$1</span></div>')
    .replace(/^- (.+)$/gm, '<div style="display:flex;align-items:flex-start;gap:8px;padding:3px 0;font-size:13px"><span style="color:var(--accent-cyan);margin-top:2px">•</span><span style="color:var(--text-secondary)">$1</span></div>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong style="color:var(--text-primary)">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,212,255,0.08);color:var(--accent-cyan);padding:1px 5px;border-radius:3px;font-size:12px">$1</code>')
    .replace(/\| (.+) \|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim())
      return '<div style="display:flex;gap:16px;padding:4px 0;font-size:12px;color:var(--text-secondary)">' + 
        cells.map(c => `<span style="flex:1">${c.trim()}</span>`).join('') + '</div>'
    })
    .replace(/^\|[-|]+\|$/gm, '')
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--glass-border);margin:16px 0"/>')
    .replace(/💰/g, '<span style="font-size:14px">💰</span>')
    .replace(/\n\n/g, '<div style="height:8px"></div>')
    .replace(/\n/g, '<br/>')
}

export default function PlanView({ projectId }: PlanViewProps) {
  const [planContent, setPlanContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')

  useEffect(() => {
    fetchPlan()
  }, [projectId])

  const fetchPlan = async () => {
    setIsLoading(true)
    try {
      // Fetch messages that contain plan content (type=plan or long markdown content from agent)
      const res = await fetch(`/api/chat?projectId=${projectId}&type=plan`)
      if (res.ok) {
        const data = await res.json()
        // Look for plan-type messages or the longest agent message with markdown headers
        const planMsg = data.messages?.find((m: any) => m.type === 'plan') ||
          data.messages?.filter((m: any) => m.role === 'assistant' && m.content?.includes('# '))
            .sort((a: any, b: any) => b.content.length - a.content.length)[0]
        
        if (planMsg) {
          setPlanContent(planMsg.content)
          setEditContent(planMsg.content)
        }
      }
    } catch (err) {
      console.error('Error fetching plan:', err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)' }}>
        Loading plan...
      </div>
    )
  }

  if (!planContent && !isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '12px', color: 'var(--text-tertiary)' }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>
        <div style={{ fontSize: '14px' }}>No plan yet</div>
        <div style={{ fontSize: '12px', maxWidth: '240px', textAlign: 'center' }}>
          Ask the agent to create a project plan, or write one yourself.
        </div>
        <button
          onClick={() => setIsEditing(true)}
          style={{
            marginTop: '8px', padding: '8px 16px', borderRadius: '8px',
            background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))',
            color: 'white', border: 'none', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Write Plan
        </button>
      </div>
    )
  }

  if (isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Edit Plan (Markdown)</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => { setIsEditing(false); setEditContent(planContent) }}
              style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                // Save plan as a message
                try {
                  await fetch('/api/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ projectId, content: editContent, role: 'assistant', type: 'plan' })
                  })
                  setPlanContent(editContent)
                  setIsEditing(false)
                } catch (err) {
                  console.error('Error saving plan:', err)
                }
              }}
              style={{ padding: '5px 12px', borderRadius: '6px', background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', color: 'white', border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
            >
              Save
            </button>
          </div>
        </div>
        <textarea
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          style={{
            flex: 1, padding: '14px', borderRadius: '8px',
            background: 'rgba(0,0,0,0.3)', border: '1px solid var(--glass-border)',
            color: 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6',
            fontFamily: "'SF Mono', Monaco, monospace", resize: 'none',
            outline: 'none'
          }}
          placeholder="Write your plan in Markdown..."
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Project Plan</span>
        <button
          onClick={() => { setEditContent(planContent); setIsEditing(true) }}
          style={{ padding: '5px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          Edit
        </button>
      </div>
      <div
        style={{ flex: 1, overflow: 'auto', lineHeight: '1.7' }}
        dangerouslySetInnerHTML={{ __html: renderPlanMarkdown(planContent) }}
      />
    </div>
  )
}
