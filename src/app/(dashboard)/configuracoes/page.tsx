import Link from 'next/link'
import { GitBranch, ClipboardList, ChevronRight } from 'lucide-react'

const items = [
  {
    href: '/configuracoes/funis',
    icon: GitBranch,
    label: 'Funis de Vendas',
    desc: 'Gerencie funis e etapas do pipeline CRM',
  },
  {
    href: '/configuracoes/presets',
    icon: ClipboardList,
    label: 'Presets de Tarefas',
    desc: 'Templates de tarefas para aplicar em projetos',
  },
]

export const metadata = { title: 'Configurações' }

export default function ConfiguracoesPage() {
  return (
    <div className="max-w-xl mx-auto px-6 py-6 space-y-4">
      <div>
        <h1 className="text-base font-semibold text-foreground">Configurações</h1>
        <p className="text-xs text-muted-foreground">Gerencie as configurações da plataforma</p>
      </div>

      <div className="space-y-2">
        {items.map(({ href, icon: Icon, label, desc }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-4 px-4 py-3 bg-surface-1 border border-surface-3 rounded-lg hover:border-gold-400/30 hover:bg-surface-2/50 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-gold-400/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4.5 h-4.5 text-gold-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}
