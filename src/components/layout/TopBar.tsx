'use client'

import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { Bell, LogOut, User, Menu, Search } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { getInitials } from '@/lib/utils'
import type { Session } from 'next-auth'

interface TopBarProps {
  session: Session
  onMobileMenuToggle?: () => void
}

const roleLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'info' }> = {
  ADMIN:       { label: 'Admin',       variant: 'default'   },
  GESTOR:      { label: 'Gestor',      variant: 'info'      },
  OPERACIONAL: { label: 'Operacional', variant: 'secondary' },
}

// Mapa de rota → label legível
const pageLabels: Record<string, string> = {
  '/dashboard':                 'Dashboard',
  '/crm':                       'CRM',
  '/projetos':                  'Projetos',
  '/financeiro':                'Financeiro',
  '/whatsapp':                  'WhatsApp',
  '/squad':                     'Squad IA',
  '/squad/integracoes':         'Integrações IA',
  '/foto-ia':                   'FotoIA',
  '/foto-ia/pedidos':           'Pedidos FotoIA',
  '/foto-ia/configuracoes':     'Configurações FotoIA',
  '/configuracoes':             'Configurações',
  '/configuracoes/funis':       'Funis de Vendas',
  '/configuracoes/presets':     'Presets de Tarefas',
}

function getPageLabel(pathname: string): string {
  if (pageLabels[pathname]) return pageLabels[pathname]
  // Prefix match (ex: /projetos/[id])
  for (const [path, label] of Object.entries(pageLabels)) {
    if (pathname.startsWith(path + '/')) return label
  }
  return ''
}

export function TopBar({ session, onMobileMenuToggle }: TopBarProps) {
  const pathname = usePathname()
  const pageLabel = getPageLabel(pathname)
  const role = roleLabels[session.user.role] ?? { label: session.user.role, variant: 'secondary' }

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-surface-1 border-b border-surface-3 flex-shrink-0">

      {/* ── Esquerda: menu mobile + título ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {pageLabel && (
          <h2 className="text-sm font-semibold text-foreground hidden sm:block">
            {pageLabel}
          </h2>
        )}
      </div>

      {/* ── Direita: busca + notificações + usuário ── */}
      <div className="flex items-center gap-1.5">

        {/* Botão de busca (placeholder estético) */}
        <button className="hidden md:flex items-center gap-2 px-3 h-8 rounded-lg bg-surface-2 border border-surface-3 text-muted-foreground hover:border-gold-400/30 hover:text-foreground transition-all text-xs group">
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Buscar...</span>
          <kbd className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-surface-3 font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Notificações */}
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors">
          <Bell className="w-4 h-4" />
        </button>

        {/* Menu do usuário */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-2 transition-colors ml-1">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-[10px] bg-gold-400/10 text-gold-400 border border-gold-400/20 font-semibold">
                  {getInitials(session.user.name || 'U')}
                </AvatarFallback>
              </Avatar>
              <span className="hidden sm:block text-[13px] font-medium text-foreground max-w-[100px] truncate">
                {session.user.name?.split(' ')[0]}
              </span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="space-y-1">
                <p className="text-sm font-semibold leading-none">{session.user.name}</p>
                <p className="text-xs text-muted-foreground truncate leading-none">
                  {session.user.email}
                </p>
                <div className="pt-1">
                  <Badge variant={role.variant as any} className="text-xs">
                    {role.label}
                  </Badge>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              <User className="w-4 h-4" />
              Meu Perfil
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              onClick={() => signOut({ callbackUrl: '/login' })}
            >
              <LogOut className="w-4 h-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
