import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // Rota acessível mas sem organização → redirecionar para login
    const token = req.nextauth.token
    if (!token?.organizacaoId) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
)

export const config = {
  matcher: [
    /*
     * Protege todas as rotas EXCETO:
     * - /login
     * - /api/auth/* (NextAuth internals)
     * - /api/aios/webhook (webhook de agentes externos)
     * - /_next/static (static files)
     * - /_next/image (image optimization)
     * - /favicon.ico
     */
    '/((?!login|api/auth|api/aios/webhook|_next/static|_next/image|favicon.ico).*)',
  ],
}
