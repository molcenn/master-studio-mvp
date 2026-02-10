'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'

export default function SignInForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      password,
      redirect: false,
      callbackUrl,
    })

    if (result?.error) {
      setError('Yanlış şifre')
      setLoading(false)
    } else {
      window.location.href = callbackUrl
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1628 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '20px',
        padding: '48px',
        width: '380px',
        textAlign: 'center' as const,
      }}>
        <h1 style={{
          color: '#fff',
          fontSize: '24px',
          fontWeight: 600,
          marginBottom: '8px',
        }}>Master Studio</h1>
        <p style={{
          color: 'rgba(255,255,255,0.5)',
          fontSize: '14px',
          marginBottom: '32px',
        }}>AI Agent Dashboard</p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifre"
            autoFocus
            style={{
              width: '100%',
              padding: '14px 16px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              outline: 'none',
              marginBottom: '16px',
              boxSizing: 'border-box' as const,
            }}
          />
          {error && (
            <p style={{ color: '#ff6b6b', fontSize: '14px', marginBottom: '12px' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              background: 'linear-gradient(135deg, #00d4ff, #a855f7)',
              border: 'none',
              borderRadius: '12px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  )
}
