'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Copy, Check, Eye, EyeOff, ExternalLink, Code2, Webhook } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="flex-shrink-0 p-1.5 rounded-md hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  )
}

function CodeBlock({ code, lang = 'json' }: { code: string; lang?: string }) {
  return (
    <pre className="bg-surface-base rounded-lg p-4 text-xs text-foreground overflow-x-auto border border-surface-3">
      <code>{code}</code>
    </pre>
  )
}

export default function IntegracoesPage() {
  const [showKey, setShowKey] = useState(false)
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.exemplo.com'
  const webhookUrl = `${baseUrl}/api/aios/webhook`
  const agentesUrl = `${baseUrl}/api/aios/agentes`
  const execucoesUrl = `${baseUrl}/api/aios/execucoes`
  const apiKey = '••••••••••••••••••••••••••••••••'

  const exampleWebhookPayload = JSON.stringify({
    evento: 'execucao:concluida',
    execucaoId: 'clxxxxxxxxxxxxx',
    output: 'Tarefa finalizada com sucesso',
    mensagem: null,
    nivel: null,
  }, null, 2)

  const exampleListAgentes = `curl -X GET \\
  "${agentesUrl}" \\
  -H "x-aios-key: SEU_AIOS_API_KEY" \\
  -H "x-organizacao-id: SEU_ORGANIZACAO_ID"`

  const exampleCreateExec = `curl -X POST \\
  "${execucoesUrl}" \\
  -H "x-aios-key: SEU_AIOS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agenteId": "clxxxxxxxxxxxxx",
    "organizacaoId": "SEU_ORGANIZACAO_ID",
    "comando": "Gerar relatório mensal"
  }'`

  const exampleWebhookUpdate = `curl -X POST \\
  "${webhookUrl}" \\
  -H "x-aios-key: SEU_AIOS_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '${exampleWebhookPayload}'`

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-6">
      <div>
        <Link href="/squad" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4 w-fit">
          <ArrowLeft className="w-3.5 h-3.5" /> Squad IA
        </Link>
        <h1 className="text-base font-semibold text-foreground">Integrações AIOS</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure seu sistema externo de agentes para se comunicar com esta plataforma
        </p>
      </div>

      {/* Credenciais */}
      <div className="bg-surface-1 border border-surface-3 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Code2 className="w-4 h-4 text-gold-400" />
          <h2 className="text-sm font-medium text-foreground">Credenciais de Acesso</h2>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Webhook URL (POST — eventos dos agentes)</p>
            <div className="flex items-center gap-2 bg-surface-2 rounded-md px-3 py-2 border border-surface-3">
              <code className="flex-1 text-xs text-gold-400 break-all">{webhookUrl}</code>
              <CopyButton value={webhookUrl} />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">AIOS API Key (header: x-aios-key)</p>
            <div className="flex items-center gap-2 bg-surface-2 rounded-md px-3 py-2 border border-surface-3">
              <code className="flex-1 text-xs text-foreground font-mono">
                {showKey ? (process.env.NEXT_PUBLIC_AIOS_API_KEY ?? 'Configure AIOS_API_KEY no .env') : apiKey}
              </code>
              <button
                onClick={() => setShowKey((s) => !s)}
                className="p-1.5 rounded-md hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <CopyButton value={process.env.NEXT_PUBLIC_AIOS_API_KEY ?? ''} />
            </div>
            <p className="text-[10px] text-muted-foreground">
              Defina <code className="bg-surface-2 px-1 rounded">AIOS_API_KEY</code> no seu arquivo <code className="bg-surface-2 px-1 rounded">.env</code>
            </p>
          </div>
        </div>
      </div>

      {/* Endpoints */}
      <div className="bg-surface-1 border border-surface-3 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-gold-400" />
          <h2 className="text-sm font-medium text-foreground">Endpoints Disponíveis</h2>
        </div>

        <div className="space-y-4">
          {/* Listar agentes */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold">GET</span>
              <code className="text-xs text-foreground">/api/aios/agentes</code>
            </div>
            <p className="text-xs text-muted-foreground">
              Lista todos os agentes da organização. Requer header <code className="bg-surface-2 px-1 rounded">x-organizacao-id</code>.
            </p>
            <CodeBlock code={exampleListAgentes} lang="bash" />
          </div>

          <div className="border-t border-surface-3" />

          {/* Criar execução */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">POST</span>
              <code className="text-xs text-foreground">/api/aios/execucoes</code>
            </div>
            <p className="text-xs text-muted-foreground">
              Cria uma nova execução para um agente. Retorna <code className="bg-surface-2 px-1 rounded">execucaoId</code>.
            </p>
            <CodeBlock code={exampleCreateExec} lang="bash" />
          </div>

          <div className="border-t border-surface-3" />

          {/* Webhook */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">POST</span>
              <code className="text-xs text-foreground">/api/aios/webhook</code>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Recebe eventos do agente durante a execução. Eventos suportados:
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { evento: 'execucao:iniciada', desc: 'Execução começou' },
                { evento: 'execucao:log', desc: 'Log de progresso' },
                { evento: 'execucao:concluida', desc: 'Finalizada com sucesso' },
                { evento: 'execucao:falha', desc: 'Erro durante execução' },
              ].map(({ evento, desc }) => (
                <div key={evento} className="bg-surface-2 rounded-md p-2">
                  <code className="text-gold-400">{evento}</code>
                  <p className="text-muted-foreground text-[10px] mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
            <CodeBlock code={exampleWebhookUpdate} lang="bash" />
          </div>
        </div>
      </div>

      {/* Fluxo de integração */}
      <div className="bg-surface-1 border border-surface-3 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-medium text-foreground">Fluxo de Integração</h2>
        <ol className="space-y-2">
          {[
            'Configure AIOS_API_KEY em ambas as aplicações (esta e o seu orquestrador externo)',
            'Seu orquestrador chama GET /api/aios/agentes para listar agentes disponíveis',
            'Esta plataforma cria uma Execucao via POST /api/execucoes (UI) ou POST /api/aios/execucoes (API)',
            'Seu orquestrador detecta a execução pendente e a processa',
            'Durante a execução, POST /api/aios/webhook com eventos de progresso',
            'Ao concluir, envie execucao:concluida — o agente volta para DISPONIVEL automaticamente',
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-xs text-muted-foreground">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gold-400/20 text-gold-400 flex items-center justify-center text-[10px] font-bold mt-0.5">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
