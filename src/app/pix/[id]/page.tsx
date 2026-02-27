'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Copy, Loader2, AlertCircle, RefreshCw } from 'lucide-react'

interface PixData {
  status: string
  valor: number
  pixCopiaECola: string | null
  qrCodeBase64: string | null
  leadNome: string
  tipoFoto: string
  pago: boolean
}

const TIPO_LABELS: Record<string, string> = {
  RETRATO_PROFISSIONAL: 'Retrato Profissional',
  FOTO_PRODUTO: 'Foto de Produto',
  FOTO_CORPORATIVA: 'Foto Corporativa',
  BANNER_REDES_SOCIAIS: 'Banner Redes Sociais',
  FOTO_PERFIL: 'Foto de Perfil',
  CUSTOM: 'Personalizado',
}

export default function PixPage() {
  const params = useParams()
  const id = params.id as string
  const [data, setData] = useState<PixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [copiado, setCopiado] = useState(false)
  const [verificando, setVerificando] = useState(false)

  const fetchPix = useCallback(async () => {
    try {
      const r = await fetch(`/api/foto-ia/pix/${id}`)
      if (!r.ok) { setLoading(false); return }
      const d = await r.json()
      setData(d)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchPix() }, [fetchPix])

  // Verificar pagamento a cada 15 segundos automaticamente
  useEffect(() => {
    if (!data || data.pago) return
    const interval = setInterval(async () => {
      const r = await fetch(`/api/foto-ia/pix/${id}`)
      if (r.ok) {
        const d = await r.json()
        setData(d)
      }
    }, 15000)
    return () => clearInterval(interval)
  }, [id, data])

  async function copiarPix() {
    if (!data?.pixCopiaECola) return
    await navigator.clipboard.writeText(data.pixCopiaECola)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 3000)
  }

  async function verificarManual() {
    setVerificando(true)
    await fetchPix()
    setVerificando(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#D4AF37]" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 p-4">
        <AlertCircle size={32} className="text-red-400" />
        <p className="text-gray-400">Cobrança não encontrada</p>
      </div>
    )
  }

  if (data.pago) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 p-4">
        <div className="p-4 rounded-full bg-green-500/10">
          <CheckCircle2 size={48} className="text-green-400" />
        </div>
        <h1 className="text-2xl font-bold text-white text-center">Pagamento Confirmado! 🎉</h1>
        <p className="text-gray-400 text-sm text-center max-w-sm">
          Ótimo, {data.leadNome}! Seu pagamento foi confirmado e já estamos produzindo suas fotos.
          Em breve você receberá o link para aprovação.
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <div className="max-w-md mx-auto px-4 py-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 flex items-center justify-center mx-auto">
            <span className="text-2xl">💛</span>
          </div>
          <h1 className="text-xl font-bold text-white">Pagamento via PIX</h1>
          <p className="text-sm text-gray-400">
            {TIPO_LABELS[data.tipoFoto] ?? data.tipoFoto}
          </p>
        </div>

        {/* Valor */}
        <div className="text-center py-4 bg-white/5 rounded-2xl border border-white/10">
          <p className="text-sm text-gray-400 mb-1">Valor a pagar</p>
          <p className="text-4xl font-bold text-[#D4AF37]">
            {data.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </p>
        </div>

        {/* QR Code */}
        {data.qrCodeBase64 ? (
          <div className="flex flex-col items-center gap-4">
            <p className="text-sm text-gray-400 text-center">Escaneie o QR Code com o app do seu banco</p>
            <div className="bg-white p-4 rounded-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${data.qrCodeBase64}`}
                alt="QR Code PIX"
                className="w-52 h-52"
              />
            </div>
          </div>
        ) : (
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 text-center">
            <p className="text-sm text-gray-400">QR Code não disponível. Use o código abaixo.</p>
          </div>
        )}

        {/* Copia e Cola */}
        {data.pixCopiaECola && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400 text-center">Ou copie o código PIX</p>
            <div className="flex gap-2">
              <div className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-gray-300 truncate font-mono">
                {data.pixCopiaECola}
              </div>
              <button
                onClick={copiarPix}
                className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  copiado
                    ? 'bg-green-500 text-white'
                    : 'bg-[#D4AF37] text-black hover:bg-[#c9a832]'
                }`}
              >
                {copiado ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2">
          <p className="text-xs font-semibold text-white">Como pagar:</p>
          <ol className="text-xs text-gray-400 space-y-1 list-decimal list-inside">
            <li>Abra o app do seu banco</li>
            <li>Vá em PIX → Pagar</li>
            <li>Escaneie o QR Code ou cole o código copiado</li>
            <li>Confirme o pagamento</li>
          </ol>
        </div>

        {/* Verificar status */}
        <button
          onClick={verificarManual}
          disabled={verificando}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 text-sm text-gray-300 hover:bg-white/15 transition-colors disabled:opacity-60"
        >
          {verificando ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {verificando ? 'Verificando...' : 'Já paguei — verificar'}
        </button>

        <p className="text-center text-xs text-gray-600">
          O pagamento é verificado automaticamente. Esta página atualiza sozinha.
        </p>
      </div>
    </div>
  )
}
