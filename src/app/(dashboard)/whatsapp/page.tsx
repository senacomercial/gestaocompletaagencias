'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSocket } from '@/hooks/useSocket'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { Wifi, WifiOff, RefreshCw, MessageSquare, Users, ExternalLink } from 'lucide-react'
import Link from 'next/link'

type WaStatus = 'disconnected' | 'connecting' | 'qr' | 'connected'

interface WaStats {
  naoIdentificadas: number
  totalMensagens: number
}

export default function WhatsAppPage() {
  const { data: session } = useSession()
  const { emit, on } = useSocket()
  const organizacaoId = session?.user?.organizacaoId

  const [status, setStatus] = useState<WaStatus>('disconnected')
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [telefone, setTelefone] = useState<string | null>(null)
  const [stats, setStats] = useState<WaStats | null>(null)

  // Buscar stats de mensagens
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/mensagens/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch {
      // silently ignore
    }
  }, [])

  useEffect(() => {
    if (!organizacaoId) return

    // Registrar listeners de Socket.io
    const offQr = on('wa:qr', ((data: { qr: string }) => {
      setQrCode(data.qr)
      setStatus('qr')
    }) as (...args: unknown[]) => void)

    const offConnected = on('wa:connected', ((data: { telefone: string }) => {
      setStatus('connected')
      setQrCode(null)
      setTelefone(data.telefone)
      toast.success('WhatsApp conectado com sucesso!')
      fetchStats()
    }) as (...args: unknown[]) => void)

    const offDisconnected = on('wa:disconnected', (() => {
      setStatus('disconnected')
      setQrCode(null)
      setTelefone(null)
      toast.info('WhatsApp desconectado')
    }) as (...args: unknown[]) => void)

    const offError = on('wa:error', ((data: { message: string }) => {
      toast.error(data.message)
    }) as (...args: unknown[]) => void)

    fetchStats()

    return () => {
      offQr?.()
      offConnected?.()
      offDisconnected?.()
      offError?.()
    }
  }, [organizacaoId, on, fetchStats])

  const handleConnect = () => {
    if (!organizacaoId) return
    setStatus('connecting')
    setQrCode(null)
    emit('wa:connect', { organizacaoId })
    toast.info('Gerando QR Code...')
  }

  const handleDisconnect = () => {
    if (!organizacaoId) return
    emit('wa:disconnect', { organizacaoId })
  }

  const handleReset = () => {
    if (!organizacaoId) return
    setStatus('connecting')
    setQrCode(null)
    emit('wa:reset', { organizacaoId })
    toast.info('Resetando sessão e gerando novo QR Code...')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">WhatsApp</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Conecte seu WhatsApp para receber e enviar mensagens diretamente do CRM
        </p>
      </div>

      {/* Status Card */}
      <div className="rounded-xl border border-surface-3 bg-surface-1 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {status === 'connected' ? (
              <div className="flex items-center gap-2 text-emerald-400">
                <Wifi className="h-5 w-5" />
                <span className="font-medium">Conectado</span>
              </div>
            ) : status === 'connecting' || status === 'qr' ? (
              <div className="flex items-center gap-2 text-amber-400">
                <RefreshCw className="h-5 w-5 animate-spin" />
                <span className="font-medium">
                  {status === 'qr' ? 'Aguardando leitura do QR Code' : 'Conectando...'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <WifiOff className="h-5 w-5" />
                <span className="font-medium">Desconectado</span>
              </div>
            )}
            {telefone && (
              <span className="text-sm text-muted-foreground">+{telefone}</span>
            )}
          </div>

          <div className="flex gap-2">
            {status === 'connected' ? (
              <>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Trocar conta
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                  Desconectar
                </Button>
              </>
            ) : (
              <>
                {(status === 'qr' || status === 'connecting') && (
                  <Button variant="outline" size="sm" onClick={handleReset}>
                    Novo QR Code
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleConnect}
                  disabled={status === 'connecting' || status === 'qr'}
                >
                  {status === 'qr' ? 'Escaneie o QR Code' : 'Conectar WhatsApp'}
                </Button>
              </>
            )}
          </div>
        </div>

        {/* QR Code */}
        {status === 'qr' && qrCode && (
          <div className="mt-6 flex flex-col items-center gap-4">
            <div className="rounded-xl border border-surface-3 bg-white p-4">
              <QrCodeDisplay value={qrCode} />
            </div>
            <div className="text-center text-sm text-muted-foreground max-w-xs">
              Abra o WhatsApp no seu celular → Menu → Aparelhos conectados → Conectar um aparelho
            </div>
          </div>
        )}

        {/* Loading skeleton while connecting */}
        {status === 'connecting' && !qrCode && (
          <div className="mt-6 flex justify-center">
            <Skeleton className="h-48 w-48 rounded-xl" />
          </div>
        )}
      </div>

      {/* Stats */}
      {status === 'connected' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-surface-3 bg-surface-1 p-4 flex items-center gap-4">
            <div className="rounded-lg bg-gold-500/10 p-2">
              <MessageSquare className="h-5 w-5 text-gold-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Mensagens não lidas</p>
              <p className="text-2xl font-bold">{stats?.totalMensagens ?? 0}</p>
            </div>
          </div>

          <Link
            href="/whatsapp/nao-identificadas"
            className="rounded-xl border border-surface-3 bg-surface-1 p-4 flex items-center justify-between hover:border-gold-500/40 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Users className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Contatos não identificados</p>
                <p className="text-2xl font-bold">{stats?.naoIdentificadas ?? 0}</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      )}

      {/* Instructions */}
      {status === 'disconnected' && (
        <div className="rounded-xl border border-surface-3 bg-surface-1 p-6 space-y-3">
          <h3 className="font-medium text-foreground">Como funciona?</h3>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Clique em &quot;Conectar WhatsApp&quot;</li>
            <li>Um QR Code será gerado na tela</li>
            <li>Abra o WhatsApp no seu celular</li>
            <li>Acesse Menu → Aparelhos conectados → Conectar um aparelho</li>
            <li>Aponte a câmera para o QR Code</li>
            <li>Pronto! Mensagens chegarão diretamente no CRM</li>
          </ol>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// QR Code usando canvas (sem dep extra)
// =============================================================================

function QrCodeDisplay({ value }: { value: string }) {
  // Se o value for uma URL de data (base64) ou string raw, renderizar via img ou canvas
  // O Baileys emite a string raw do QR. Usaremos a lib qrcode do servidor.
  // Por simplicidade, mostramos via API de geração de imagem online.
  // Em produção real, usar: npm install qrcode + canvas no servidor
  const encoded = encodeURIComponent(value)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`}
      alt="QR Code WhatsApp"
      width={200}
      height={200}
      className="block"
    />
  )
}
