import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Master Studio',
      credentials: {
        password: { label: 'Şifre', type: 'password' }
      },
      async authorize(credentials) {
        // Basit şifre koruması - sadece Murat erişir
        if (credentials?.password === process.env.STUDIO_PASSWORD) {
          return { id: '1', name: 'Murat', email: 'murat@studio.local' }
        }
        return null
      }
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 gün
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}
