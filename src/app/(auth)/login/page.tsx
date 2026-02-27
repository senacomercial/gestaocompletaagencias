'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Kanban, FolderKanban, Bot, TrendingUp } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
  organizacaoSlug: z.string().optional(),
})

type LoginForm = z.infer<typeof loginSchema>

const features = [
  {
    icon: Kanban,
    title: 'CRM com Pipeline Kanban',
    desc: 'Arraste leads entre etapas, negocie via WhatsApp integrado',
  },
  {
    icon: FolderKanban,
    title: 'Projetos & Sprints',
    desc: 'Organize tarefas por sprint com progresso em tempo real',
  },
  {
    icon: TrendingUp,
    title: 'Financeiro Completo',
    desc: 'Contratos, lançamentos, MRR e análise de inadimplência',
  },
  {
    icon: Bot,
    title: 'Squad de Agentes IA',
    desc: 'Automatize processos com agentes inteligentes da sua equipe',
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setErro(null)
    const result = await signIn('credentials', { ...data, redirect: false })
    if (result?.error) {
      setErro('Email ou senha incorretos. Verifique suas credenciais.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface-base flex">

      {/* ── Painel esquerdo — Marca ── */}
      <div className="hidden lg:flex flex-col w-[480px] xl:w-[540px] bg-surface-1 border-r border-surface-3 p-12 relative overflow-hidden flex-shrink-0">

        {/* Decoração de fundo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gold-400/5 blur-3xl" />
          <div className="absolute -bottom-40 -right-20 w-80 h-80 rounded-full bg-bronze-400/5 blur-3xl" />
          {/* Circles decorativos */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-surface-3/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-surface-3/30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] rounded-full border border-surface-3/20" />
        </div>

        {/* Logo */}
        <div className="relative z-10 mb-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold-400 to-bronze-400 flex items-center justify-center shadow-gold-sm">
              <span className="text-surface-base font-black text-base tracking-tight">G</span>
            </div>
            <div>
              <p className="font-bold text-sm text-foreground leading-none">Gestão de Agências</p>
              <p className="text-[11px] text-gold-400/80 leading-none mt-0.5">Plataforma Completa</p>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 mb-12">
          <h1 className="text-4xl font-black text-foreground leading-tight mb-4">
            Sua agência<br />
            <span className="bg-gradient-to-r from-gold-400 to-bronze-400 bg-clip-text text-transparent">
              em um só lugar
            </span>
          </h1>
          <p className="text-muted-foreground text-base leading-relaxed max-w-xs">
            Do primeiro contato ao contrato assinado — CRM, projetos, finanças e IA integrados.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-5 flex-1">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-gold-400/10 border border-gold-400/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-gold-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-none">{title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Rodapé do painel */}
        <div className="relative z-10 pt-10 border-t border-surface-3">
          <div className="flex items-center gap-3">
            {/* Avatares empilhados */}
            <div className="flex -space-x-2">
              {['A', 'J', 'M'].map((l) => (
                <div
                  key={l}
                  className="w-7 h-7 rounded-full bg-gradient-to-br from-surface-3 to-surface-4 border-2 border-surface-1 flex items-center justify-center text-[10px] font-bold text-foreground"
                >
                  {l}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Equipe conectada e produtiva
            </p>
          </div>
        </div>
      </div>

      {/* ── Painel direito — Formulário ── */}
      <div className="flex-1 flex items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex items-center justify-center gap-2 mb-10 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold-400 to-bronze-400 flex items-center justify-center">
              <span className="text-surface-base font-black text-sm">G</span>
            </div>
            <span className="font-bold text-foreground">Gestão de Agências</span>
          </div>

          {/* Header do form */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Bem-vindo de volta</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Faça login para continuar na plataforma
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Email
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="seu@email.com"
                className="input-agency"
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-xs text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Senha
              </label>
              <input
                {...register('senha')}
                type="password"
                placeholder="••••••••"
                className="input-agency"
                autoComplete="current-password"
              />
              {errors.senha && (
                <p className="text-xs text-destructive mt-1">{errors.senha.message}</p>
              )}
            </div>

            {/* Erro de autenticação */}
            {erro && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 animate-scale-in">
                <p className="text-destructive text-sm">{erro}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-50 h-11 text-sm font-semibold mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar na plataforma'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Sistema de uso exclusivo · {new Date().getFullYear()} Gestão de Agências
          </p>
        </div>
      </div>
    </div>
  )
}
