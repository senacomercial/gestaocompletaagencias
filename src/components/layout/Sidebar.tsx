'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Kanban,
  FolderKanban,
  DollarSign,
  MessageCircle,
  Bot,
  Camera,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'
import type { Session } from 'next-auth'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  badgeKey?: 'whatsapp'
}

interface NavGroup {
  label?: string
  items: NavItem[]
}

// ─── Configuração da navegação ────────────────────────────────────────────────

const navGroups: NavGroup[] = [
  {
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Gestão',
    items: [
      { href: '/crm',        label: 'CRM',        icon: Kanban },
      { href: '/projetos',   label: 'Projetos',   icon: FolderKanban },
      { href: '/financeiro', label: 'Financeiro', icon: DollarSign },
      { href: '/whatsapp',   label: 'WhatsApp',   icon: MessageCircle, badgeKey: 'whatsapp' },
    ],
  },
  {
    label: 'Serviços IA',
    items: [
      { href: '/foto-ia', label: 'FotoIA', icon: Camera },
      { href: '/squad',   label: 'Squad IA', icon: Bot },
    ],
  },
]

const bottomItems: NavItem[] = [
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

// ─── NavLink ─────────────────────────────────────────────────────────────────

function NavLink({
  item,
  isActive,
  collapsed,
  badge,
}: {
  item: NavItem
  isActive: boolean
  collapsed: boolean
  badge?: number
}) {
  const Icon = item.icon

  const linkEl = (
    <Link
      href={item.href}
      className={cn(
        'relative flex items-center gap-2.5 w-full px-3 rounded-lg text-sm transition-all duration-150',
        collapsed ? 'h-10 justify-center px-0' : 'h-9',
        isActive
          ? 'bg-gold-400/10 text-gold-400'
          : 'text-muted-foreground hover:bg-surface-2 hover:text-foreground'
      )}
    >
      {/* Indicador de ativo: pill à esquerda */}
      {isActive && !collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gold-400 rounded-r-full" />
      )}
      {isActive && collapsed && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-gold-400 rounded-r-full" />
      )}

      <Icon
        className={cn(
          'w-4 h-4 flex-shrink-0 transition-colors',
          isActive && 'drop-shadow-[0_0_5px_rgba(212,175,55,0.5)]'
        )}
      />

      {!collapsed && (
        <span className="truncate font-medium text-[13px]">{item.label}</span>
      )}

      {/* Badge de notificação */}
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            'flex items-center justify-center rounded-full bg-emerald-500 text-white font-bold',
            collapsed
              ? 'absolute top-0.5 right-0.5 h-4 min-w-[16px] text-[9px] px-1'
              : 'ml-auto h-5 min-w-[20px] text-[10px] px-1.5'
          )}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {item.label}
          {badge !== undefined && badge > 0 && ` (${badge})`}
        </TooltipContent>
      </Tooltip>
    )
  }

  return linkEl
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

interface SidebarProps {
  session: Session
}

export function Sidebar({ session }: SidebarProps) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  const unreadCounts = useUnreadMessages((s) => s.counts)
  const totalUnread = Object.values(unreadCounts).reduce((acc, v) => acc + v, 0)

  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved !== null) setCollapsed(saved === 'true')
  }, [])

  const toggle = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebar-collapsed', String(next))
  }

  if (!mounted) return null

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'relative flex flex-col h-full bg-surface-1 border-r border-surface-3 transition-all duration-300 ease-in-out',
          collapsed ? 'w-[60px]' : 'w-[232px]'
        )}
      >
        {/* ── Logo ── */}
        <div
          className={cn(
            'flex items-center h-14 border-b border-surface-3 flex-shrink-0 px-3',
            collapsed ? 'justify-center' : 'gap-3'
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-400 to-bronze-400 flex items-center justify-center shadow-gold-sm flex-shrink-0">
            <span className="text-surface-base font-black text-sm tracking-tight">G</span>
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="font-bold text-[13px] text-foreground leading-none truncate">Gestão</p>
              <p className="text-[10px] text-gold-400/70 leading-none mt-0.5">de Agências</p>
            </div>
          )}
        </div>

        {/* ── Navegação ── */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4 scrollbar-none">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {/* Label do grupo */}
              {group.label && !collapsed && (
                <p className="section-label px-3 mb-1.5">{group.label}</p>
              )}
              {group.label && collapsed && (
                <div className="mx-3 mb-1.5 h-px bg-surface-3" />
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    isActive={isActive(item.href)}
                    collapsed={collapsed}
                    badge={item.badgeKey === 'whatsapp' ? totalUnread : undefined}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Rodapé: configurações + usuário ── */}
        <div className="border-t border-surface-3 px-2 py-3 space-y-0.5 flex-shrink-0">
          {bottomItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              isActive={isActive(item.href)}
              collapsed={collapsed}
            />
          ))}

          {/* Separador */}
          <div className="h-px bg-surface-3 mx-1 my-2" />

          {/* Bloco do usuário */}
          <div
            className={cn(
              'flex items-center rounded-lg px-2 py-2 gap-2 cursor-default select-none',
              collapsed && 'justify-center px-0'
            )}
          >
            <Avatar className="w-7 h-7 flex-shrink-0">
              <AvatarFallback className="text-[10px] bg-gold-400/10 text-gold-400 border border-gold-400/20 font-semibold">
                {getInitials(session.user.name || 'U')}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-foreground truncate leading-none">
                  {session.user.name}
                </p>
                <p className="text-[10px] text-muted-foreground truncate leading-none mt-0.5">
                  {session.user.organizacaoNome}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Botão colapsar ── */}
        <button
          onClick={toggle}
          className="absolute -right-3 top-[52px] flex items-center justify-center w-6 h-6 rounded-full bg-surface-1 border border-surface-3 text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-all duration-150 z-10 shadow-card"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronLeft  className="w-3 h-3" />
          }
        </button>
      </aside>
    </TooltipProvider>
  )
}
