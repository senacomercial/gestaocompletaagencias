'use client'

import { Settings, Camera, DollarSign, Sparkles, MessageSquare, Info } from 'lucide-react'

const TIPOS_FOTO = [
  { key: 'RETRATO_PROFISSIONAL', label: 'Retrato Profissional', preco: 97, qtd: 5 },
  { key: 'FOTO_PRODUTO', label: 'Foto de Produto', preco: 147, qtd: 10 },
  { key: 'FOTO_CORPORATIVA', label: 'Foto Corporativa', preco: 197, qtd: 8 },
  { key: 'BANNER_REDES_SOCIAIS', label: 'Banner Redes Sociais', preco: 127, qtd: 5 },
  { key: 'FOTO_PERFIL', label: 'Foto de Perfil', preco: 67, qtd: 3 },
]

export default function FotoIAConfiguracoes() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-surface-2 border border-surface-3">
          <Settings size={20} className="text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Configurações FotoIA</h1>
          <p className="text-sm text-muted-foreground">Preços, prompts de IA e templates de mensagem</p>
        </div>
      </div>

      {/* Aviso de configuração */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
        <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm text-blue-300 font-medium">Configuração via arquivo</p>
          <p className="text-xs text-blue-400/80 mt-0.5">
            As configurações abaixo são gerenciadas pelo arquivo{' '}
            <code className="bg-blue-500/20 px-1 py-0.5 rounded text-xs">squads/foto-ia-squad/data/precos.yaml</code>.
            Em breve será possível editar diretamente por aqui.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabela de Preços */}
        <div className="card-agency p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign size={16} className="text-gold-400" />
            <h2 className="font-semibold text-foreground">Tabela de Preços</h2>
          </div>
          <div className="space-y-2">
            {TIPOS_FOTO.map(tipo => (
              <div key={tipo.key} className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{tipo.label}</p>
                  <p className="text-xs text-muted-foreground">{tipo.qtd} fotos incluídas</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gold-400">R$ {tipo.preco.toFixed(2).replace('.', ',')}</p>
                  <p className="text-xs text-muted-foreground">por pedido</p>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2 border border-amber-500/20">
              <div>
                <p className="text-sm font-medium text-amber-400">Revisão Extra</p>
                <p className="text-xs text-muted-foreground">Após 2 revisões inclusas</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-amber-400">R$ 47,00</p>
                <p className="text-xs text-muted-foreground">por rodada</p>
              </div>
            </div>
          </div>
        </div>

        {/* Integrações */}
        <div className="space-y-4">
          {/* API de Imagens */}
          <div className="card-agency p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={16} className="text-violet-400" />
              <h2 className="font-semibold text-foreground">API de Geração de Imagens</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Replicate</p>
                  <p className="text-xs text-muted-foreground">Modelo: stability-ai/sdxl</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Configurar chave
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure a variável de ambiente{' '}
                <code className="bg-surface-2 px-1 py-0.5 rounded">REPLICATE_API_TOKEN</code>{' '}
                no arquivo <code className="bg-surface-2 px-1 py-0.5 rounded">.env</code>
              </p>
            </div>
          </div>

          {/* Gateway de Pagamento */}
          <div className="card-agency p-5">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={16} className="text-gold-400" />
              <h2 className="font-semibold text-foreground">Gateway de Pagamento</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-2">
                <div>
                  <p className="text-sm font-medium text-foreground">Asaas</p>
                  <p className="text-xs text-muted-foreground">PIX, Cartão e Boleto</p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Configurar chave
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Configure{' '}
                <code className="bg-surface-2 px-1 py-0.5 rounded">ASAAS_API_KEY</code>{' '}
                e{' '}
                <code className="bg-surface-2 px-1 py-0.5 rounded">ASAAS_WEBHOOK_SECRET</code>{' '}
                no arquivo <code className="bg-surface-2 px-1 py-0.5 rounded">.env</code>
              </p>
            </div>
          </div>

          {/* Templates WhatsApp */}
          <div className="card-agency p-5">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-green-400" />
              <h2 className="font-semibold text-foreground">Templates WhatsApp</h2>
            </div>
            <div className="space-y-1.5">
              {[
                'Saudação inicial',
                'Proposta comercial',
                'Follow-up 1 (24h)',
                'Follow-up 2 (48h)',
                'Link de pagamento',
                'Em produção',
                'Aguardando aprovação',
                'Entrega final',
              ].map(t => (
                <div key={t} className="flex items-center gap-2 p-2 rounded text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400/60" />
                  {t}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Edite os templates em{' '}
              <code className="bg-surface-2 px-1 py-0.5 rounded">squads/foto-ia-squad/templates/</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
