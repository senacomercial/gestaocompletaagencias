'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { Camera, CheckCircle2, XCircle, ZoomIn, Loader2, AlertCircle, Sparkles } from 'lucide-react'

interface Imagem {
  id: string
  url: string
  urlPublica: string | null
  tipo: string
  rodada: number
  aprovada: boolean
}

interface GaleriaData {
  pedidoId: string
  status: string
  tipoFoto: string
  lead: { nome: string; empresa: string | null }
  imagens: Imagem[]
  tokenGaleria: string
}

const TIPO_LABELS: Record<string, string> = {
  RETRATO_PROFISSIONAL: 'Retrato Profissional',
  FOTO_PRODUTO: 'Foto de Produto',
  FOTO_CORPORATIVA: 'Foto Corporativa',
  BANNER_REDES_SOCIAIS: 'Banner Redes Sociais',
  FOTO_PERFIL: 'Foto de Perfil',
  CUSTOM: 'Personalizado',
}

export default function GaleriaPage() {
  const params = useParams()
  const token = params.token as string
  const [data, setData] = useState<GaleriaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [zoomImg, setZoomImg] = useState<string | null>(null)
  const [observacoes, setObservacoes] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<'aprovado' | 'revisao' | null>(null)

  const fetchGaleria = useCallback(async () => {
    try {
      const r = await fetch(`/api/foto-ia/galeria/${token}`)
      if (!r.ok) {
        const err = await r.json()
        setError(err.error ?? 'Galeria não disponível')
        setLoading(false)
        return
      }
      const d = await r.json()
      setData(d)
    } catch {
      setError('Erro ao carregar galeria')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { fetchGaleria() }, [fetchGaleria])

  async function handleAprovar(aprovado: boolean) {
    if (!data) return
    setEnviando(true)
    try {
      const r = await fetch(`/api/foto-ia/aprovar/${data.pedidoId}?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aprovado, observacoes: observacoes || undefined }),
      })
      if (r.ok) {
        setResultado(aprovado ? 'aprovado' : 'revisao')
      }
    } catch {
      // ignore
    } finally {
      setEnviando(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#D4AF37]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-4 p-4">
        <div className="p-3 rounded-full bg-red-500/10">
          <AlertCircle size={28} className="text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Galeria indisponível</h1>
        <p className="text-gray-400 text-sm text-center max-w-sm">{error}</p>
      </div>
    )
  }

  if (resultado) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center gap-6 p-4">
        {resultado === 'aprovado' ? (
          <>
            <div className="p-4 rounded-full bg-green-500/10">
              <CheckCircle2 size={40} className="text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white text-center">Fotos Aprovadas! 🎉</h1>
            <p className="text-gray-400 text-sm text-center max-w-sm">
              Obrigado! Suas fotos foram aprovadas com sucesso. Em breve você receberá os arquivos finais.
            </p>
          </>
        ) : (
          <>
            <div className="p-4 rounded-full bg-amber-500/10">
              <Sparkles size={40} className="text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold text-white text-center">Revisão Solicitada</h1>
            <p className="text-gray-400 text-sm text-center max-w-sm">
              Recebemos seus comentários. Vamos refazer as fotos com os ajustes solicitados e enviar um novo link em breve.
            </p>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Header */}
      <header className="border-b border-white/5 py-5 px-4">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10">
            <Camera size={20} className="text-violet-400" />
          </div>
          <div>
            <h1 className="font-bold text-white">FotoIA — Galeria de Aprovação</h1>
            <p className="text-sm text-gray-400">
              {data?.lead.nome} · {TIPO_LABELS[data?.tipoFoto ?? ''] ?? data?.tipoFoto}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Instruções */}
        <div className="bg-white/5 rounded-xl p-4 border border-white/10">
          <p className="text-sm text-gray-300">
            <span className="font-semibold text-white">Como funciona:</span> Veja as fotos abaixo.
            Se gostar, clique em <span className="text-green-400 font-medium">&quot;Aprovar estas fotos&quot;</span>.
            Se quiser ajustes, descreva o que precisa ser mudado e clique em <span className="text-amber-400 font-medium">&quot;Solicitar Ajustes&quot;</span>.
          </p>
        </div>

        {/* Grid de imagens */}
        {!data?.imagens.length ? (
          <div className="flex flex-col items-center py-16 text-gray-400 gap-3">
            <Camera size={36} className="opacity-30" />
            <p>Nenhuma imagem disponível</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {data.imagens.map(img => (
              <div
                key={img.id}
                className="relative group rounded-xl overflow-hidden bg-white/5 aspect-square cursor-pointer border border-white/10 hover:border-white/30 transition-colors"
                onClick={() => setZoomImg(img.urlPublica ?? img.url)}
              >
                <img
                  src={img.urlPublica ?? img.url}
                  alt={`Foto ${img.tipo}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Área de aprovação */}
        {data?.status === 'AGUARDANDO_APROVACAO' && (
          <div className="bg-white/5 rounded-xl p-6 border border-white/10 space-y-5">
            <h2 className="font-semibold text-white">Sua Resposta</h2>

            <div>
              <label className="text-sm text-gray-400 block mb-1.5">
                Comentários ou ajustes solicitados (opcional)
              </label>
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Ex: Por favor, torne o fundo mais claro e melhore a iluminação..."
                rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-[#D4AF37]/50 resize-none"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleAprovar(true)}
                disabled={enviando}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-green-500 hover:bg-green-400 text-white font-semibold text-sm transition-colors disabled:opacity-60"
              >
                {enviando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                Aprovar estas fotos
              </button>
              <button
                onClick={() => handleAprovar(false)}
                disabled={enviando || !observacoes.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-amber-400 font-semibold text-sm transition-colors disabled:opacity-40"
              >
                {enviando ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
                Solicitar Ajustes
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Zoom modal */}
      {zoomImg && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setZoomImg(null)}
        >
          <img
            src={zoomImg}
            alt="zoom"
            className="max-w-full max-h-full rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
