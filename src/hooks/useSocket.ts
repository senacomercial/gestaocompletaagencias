'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'

let globalSocket: Socket | null = null
let globalOrgId: string | null = null

/**
 * Hook para conectar ao servidor Socket.io.
 * Mantém uma conexão única compartilhada por organização.
 * Re-emite join:org automaticamente ao reconectar.
 */
export function useSocket() {
  const { data: session } = useSession()
  const socketRef = useRef<Socket | null>(null)
  const orgId = session?.user?.organizacaoId

  useEffect(() => {
    if (!orgId) return

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'

    if (!globalSocket || !globalSocket.connected) {
      globalSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
      })
    }

    socketRef.current = globalSocket
    globalOrgId = orgId

    // Entrar na sala da organização
    const joinOrg = () => {
      globalSocket?.emit('join:org', { organizacaoId: orgId })
    }

    // Entrar imediatamente se já conectado, ou aguardar conexão
    if (globalSocket.connected) {
      joinOrg()
    } else {
      globalSocket.once('connect', joinOrg)
    }

    // Re-emitir join:org a cada reconexão
    globalSocket.on('connect', joinOrg)

    return () => {
      globalSocket?.off('connect', joinOrg)
    }
  }, [orgId])

  const emit = useCallback(
    (event: string, data?: unknown) => {
      if (!globalSocket?.connected) {
        console.warn(`[useSocket] emit "${event}" ignorado — socket desconectado`)
        return
      }
      globalSocket.emit(event, data)
    },
    []
  )

  const on = useCallback(
    (event: string, handler: (...args: unknown[]) => void) => {
      const sock = socketRef.current
      sock?.on(event, handler)
      return () => {
        sock?.off(event, handler)
      }
    },
    []
  )

  return { socket: socketRef.current, emit, on }
}
