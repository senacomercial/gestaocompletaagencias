import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 dias
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        senha: { label: 'Senha', type: 'password' },
        organizacaoSlug: { label: 'Organização', type: 'text' },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials?.senha) {
          throw new Error('Email e senha são obrigatórios')
        }

        // Busca usuário com organização
        const usuario = await prisma.usuario.findFirst({
          where: {
            email: credentials.email,
            ativo: true,
            organizacao: credentials.organizacaoSlug
              ? { slug: credentials.organizacaoSlug }
              : undefined,
          },
          include: {
            organizacao: true,
          },
        })

        if (!usuario) {
          throw new Error('Credenciais inválidas')
        }

        const senhaCorreta = await bcrypt.compare(credentials.senha, usuario.senha)
        if (!senhaCorreta) {
          throw new Error('Credenciais inválidas')
        }

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          role: usuario.role,
          organizacaoId: usuario.organizacaoId,
          organizacaoSlug: usuario.organizacao.slug,
          organizacaoNome: usuario.organizacao.nome,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.organizacaoId = (user as any).organizacaoId
        token.organizacaoSlug = (user as any).organizacaoSlug
        token.organizacaoNome = (user as any).organizacaoNome
      }
      return token
    },

    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.organizacaoId = token.organizacaoId as string
        session.user.organizacaoSlug = token.organizacaoSlug as string
        session.user.organizacaoNome = token.organizacaoNome as string
      }
      return session
    },
  },
}
