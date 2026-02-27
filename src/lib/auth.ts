import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'

export { authOptions }

/**
 * Helper para obter a sessão do servidor com tipagem correta.
 * Use em Server Components, API Routes e Server Actions.
 */
export async function getSession() {
  return getServerSession(authOptions)
}

/**
 * Helper para obter a sessão autenticada. Lança erro se não autenticado.
 * Garante que organizacaoId sempre vem da sessão (nunca do body/params).
 */
export async function requireAuth() {
  const session = await getSession()
  if (!session?.user?.organizacaoId) {
    throw new Error('Não autenticado')
  }
  return session
}
