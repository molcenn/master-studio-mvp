'use client'

import { useState, useEffect, useRef } from 'react'

interface QuickSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  anchorRef: { current: HTMLButtonElement | null }
  onOpenFullSettings: () => void
}

export default function QuickSettingsModal({ isOpen, onClose, anchorRef, onOpenFullSettings }: QuickSettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')
  const [compactMode, setCompactMode] = useState(false)

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('master-studio-settings')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setTheme(parsed.theme || 'dark')
        setCompactMode(parsed.compactMode || false)
      } catch {}
    }
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handleClick = (e: MouseEvent) => {
      if (
        modalRef.current && !modalRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onClose, anchorRef])

  if (!isOpen) return null

  const updateTheme = (newTheme: 'dark' | 'light' | 'system') => {
    setTheme(newTheme)
    const saved = localStorage.getItem('master-studio-settings')
    const settings = saved ? JSON.parse(saved) : {}
    settings.theme = newTheme
    localStorage.setItem('master-studio-settings', JSON.stringify(settings))
  }

  const toggleCompact = () => {
    const next = !compactMode
    setCompactMode(next)
    const saved = localStorage.getItem('master-studio-settings')
    const settings = saved ? JSON.parse(saved) : {}
    settings.compactMode = next
    localStorage.setItem('master-studio-settings', JSON.stringify(settings))
  }

  return (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        top: '56px',
        right: '400px',
        width: '240px',
        background: 'rgba(15, 15, 30, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '12px',
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', padding: '0 4px' }}>
        Quick Settings
      </div>

      {/* Theme */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', padding: '0 4px' }}>Theme</div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['dark', 'light', 'system'] as const).map((t) => (
            <button
              key={t}
              onClick={() => updateTheme(t)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: theme === t ? '1px solid var(--accent-cyan)' : '1px solid rgba(255,255,255,0.08)',
                background: theme === t ? 'rgba(0,212,255,0.1)' : 'rgba(255,255,255,0.03)',
                color: theme === t ? 'var(--accent-cyan)' : 'var(--text-tertiary)',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {t === 'dark' ? '🌙' : t === 'light' ? '☀️' : '💻'}
            </button>
          ))}
        </div>
      </div>

      {/* Compact Mode */}
      <div
        onClick={toggleCompact}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px',
          borderRadius: '6px',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
      >
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Compact Mode</span>
        <div
          style={{
            width: '32px',
            height: '18px',
            borderRadius: '9px',
            background: compactMode ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
            position: 'relative',
            transition: 'background 0.2s',
          }}
        >
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              background: 'white',
              position: 'absolute',
              top: '2px',
              left: compactMode ? '16px' : '2px',
              transition: 'left 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          />
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '8px 0' }} />

      {/* Full Settings Link */}
      <button
        onClick={onOpenFullSettings}
        style={{
          width: '100%',
          padding: '8px',
          borderRadius: '6px',
          border: 'none',
          background: 'rgba(255,255,255,0.03)',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'all 0.15s',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15H3a2 2 0 0 1 0-4h.09"/>
        </svg>
        All Settings
      </button>
    </div>
  )
}
