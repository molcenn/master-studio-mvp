import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './components/Providers'

export const metadata: Metadata = {
  title: 'Master Studio — AI Agent Dashboard',
  description: 'AI Agent Dashboard MVP',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
