import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import SignInButton from './SignInButton'

export default async function SignInPage() {
  const session = await getServerSession(authOptions)
  
  if (session) {
    redirect('/')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f0f1a] via-[#1a1a2e] to-[#16213e]">
      <div className="bg-[rgba(20,20,30,0.8)] backdrop-blur-[40px] border border-[rgba(255,255,255,0.1)] rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gradient-to-r from-[#00d4ff] to-[#a855f7] flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-[#00d4ff] to-[#a855f7] bg-clip-text text-transparent">
            Master Studio
          </h1>
          <p className="text-white/60 mt-2">AI Agent Dashboard</p>
        </div>

        <SignInButton />

        <p className="text-center text-white/40 text-sm mt-6">
          GitHub hesabınla giriş yap
        </p>
      </div>
    </div>
  )
}
