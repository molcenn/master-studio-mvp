'use client'

import { Suspense } from 'react'
import SignInForm from './SignInForm'

export default function SignIn() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0a0a1a 0%, #1a0a2e 50%, #0a1628 100%)',
        color: '#fff',
      }}>
        Yükleniyor...
      </div>
    }>
      <SignInForm />
    </Suspense>
  )
}
