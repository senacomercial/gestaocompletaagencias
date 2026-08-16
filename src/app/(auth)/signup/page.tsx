'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Kanban, FolderKanban, Bot, TrendingUp, ChevronRight } from 'lucide-react'

const signupSchema = z.object({
  nome: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  confirmarSenha: z.string().min(8, 'Confirmação de senha obrigatória'),
  tipoOrganizacao: z.enum(['existente', 'nova'], {
    errorMap: () => ({ message: 'Selecione uma opção' }),
  }),
  organizacao: z.string().optional(),
  novaOrganizacao: z.string().optional(),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: 'As senhas não conferem',
  path: ['confirmarSenha'],
}).refine((data) => {
  if (data.tipoOrganizacao === 'existente') {
    return !!data.organizacao && data.organizacao.length > 0
  }
  if (data.tipoOrganizacao === 'nova') {
    return !!data.novaOrganizacao && data.novaOrganizacao.length >= 3
  }
  return false
}, {
  message: 'Selecione ou crie uma organização',
  path: ['organizacao'],
})

type SignupForm = z.infer<typeof signupSchema>

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

export default function SignupPage() {
  const router = useRouter()
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [step, setStep] = useState(1) // Step 1: Tipo de org, Step 2: Dados
  const [organizacoes, setOrganizacoes] = useState<Array<{ slug: string; nome: string }>>([])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    trigger,
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
    defaultValues: {
      tipoOrganizacao: 'nova',
    },
  })

  const tipoOrganizacao = watch('tipoOrganizacao')

  // Carregar organizações existentes quando monta o componente
  useEffect(() => {
    async function carregarOrganizacoes() {
      try {
        const res = await fetch('/api/organizacoes')
        if (res.ok) {
          const data = await res.json()
          setOrganizacoes(data)
        }
      } catch (err) {
        console.error('Erro ao carregar organizações:', err)
      }
    }
    carregarOrganizacoes()
  }, [])

  async function onSubmit(data: SignupForm) {
    setErro(null)
    setSucesso(false)

    try {
      const payload = {
        nome: data.nome,
        email: data.email,
        senha: data.senha,
        confirmarSenha: data.confirmarSenha,
        organizacao: data.tipoOrganizacao === 'existente' ? data.organizacao : undefined,
        novaOrganizacao: data.tipoOrganizacao === 'nova'
          ? { nome: data.novaOrganizacao }
          : undefined,
      }

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const resultado = await res.json()

      if (!res.ok) {
        setErro(resultado.erro || 'Erro ao criar conta')
        return
      }

      setSucesso(true)

      // Aguardar 2 segundos e redirecionar para login
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      setErro('Erro ao conectar com o servidor. Tente novamente.')
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-surface-base flex">
      {/* ── Painel esquerdo — Marca ── */}
      <div className="hidden lg:flex flex-col w-[480px] xl:w-[540px] bg-surface-1 border-r border-surface-3 p-12 relative overflow-hidden flex-shrink-0">
        {/* Decoração de fundo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-gold-400/5 blur-3xl" />
          <div className="absolute -bottom-40 -right-20 w-80 h-80 rounded-full bg-bronze-400/5 blur-3xl" />
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
            <h2 className="text-2xl font-bold text-foreground">Criar conta</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Comece sua jornada na plataforma
            </p>
          </div>

          {/* Indicador de progresso */}
          <div className="flex gap-2 mb-8">
            <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 1 ? 'bg-gold-400' : 'bg-surface-3'}`} />
            <div className={`flex-1 h-1 rounded-full transition-colors ${step >= 2 ? 'bg-gold-400' : 'bg-surface-3'}`} />
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* STEP 1: Tipo de Organização */}
            {step === 1 && (
              <>
                <div>
                  <label className="text-sm font-medium text-foreground mb-3 block">
                    Como você quer começar?
                  </label>
                  <div className="space-y-2">
                    {/* Opção: Nova Organização */}
                    <label className="flex items-center gap-3 p-4 border-2 border-surface-3 rounded-lg cursor-pointer hover:border-gold-400/50 transition-colors has-[:checked]:border-gold-400 has-[:checked]:bg-gold-400/5">
                      <input
                        type="radio"
                        value="nova"
                        {...register('tipoOrganizacao')}
                        className="w-4 h-4 accent-gold-400"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">Criar nova organização</p>
                        <p className="text-xs text-muted-foreground">Você será o primeiro admin</p>
                      </div>
                    </label>

                    {/* Opção: Organização Existente */}
                    {organizacoes.length > 0 && (
                      <label className="flex items-center gap-3 p-4 border-2 border-surface-3 rounded-lg cursor-pointer hover:border-gold-400/50 transition-colors has-[:checked]:border-gold-400 has-[:checked]:bg-gold-400/5">
                        <input
                          type="radio"
                          value="existente"
                          {...register('tipoOrganizacao')}
                          className="w-4 h-4 accent-gold-400"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-foreground">Entrar em organização existente</p>
                          <p className="text-xs text-muted-foreground">Você será adicionado como operacional</p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                {/* Seleção de Organização Existente (se aplicável) */}
                {tipoOrganizacao === 'existente' && organizacoes.length > 0 && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-sm font-medium text-foreground">
                      Selecione a organização
                    </label>
                    <select
                      {...register('organizacao')}
                      className="input-agency"
                    >
                      <option value="">-- Escolha uma organização --</option>
                      {organizacoes.map((org) => (
                        <option key={org.slug} value={org.slug}>
                          {org.nome}
                        </option>
                      ))}
                    </select>
                    {errors.organizacao && (
                      <p className="text-xs text-destructive mt-1">{errors.organizacao.message}</p>
                    )}
                  </div>
                )}

                {/* Input: Nova Organização */}
                {tipoOrganizacao === 'nova' && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-sm font-medium text-foreground">
                      Nome da organização
                    </label>
                    <input
                      {...register('novaOrganizacao')}
                      type="text"
                      placeholder="Sua Agência Digital"
                      className="input-agency"
                    />
                    {errors.novaOrganizacao && (
                      <p className="text-xs text-destructive mt-1">{errors.novaOrganizacao.message}</p>
                    )}
                  </div>
                )}

                {/* Botão Próximo */}
                <button
                  type="button"
                  onClick={async () => {
                    const isValid = await trigger(['tipoOrganizacao', 'organizacao', 'novaOrganizacao'])
                    if (isValid) {
                      setStep(2)
                    }
                  }}
                  className="btn-gold w-full flex items-center justify-center gap-2 h-11 text-sm font-semibold mt-8"
                >
                  Próximo
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* STEP 2: Dados Pessoais */}
            {step === 2 && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Nome Completo</label>
                  <input
                    {...register('nome')}
                    type="text"
                    placeholder="João Silva"
                    className="input-agency"
                    autoComplete="name"
                  />
                  {errors.nome && (
                    <p className="text-xs text-destructive mt-1">{errors.nome.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Email</label>
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
                  <label className="text-sm font-medium text-foreground">Senha</label>
                  <input
                    {...register('senha')}
                    type="password"
                    placeholder="••••••••"
                    className="input-agency"
                    autoComplete="new-password"
                  />
                  {errors.senha && (
                    <p className="text-xs text-destructive mt-1">{errors.senha.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Confirmar Senha</label>
                  <input
                    {...register('confirmarSenha')}
                    type="password"
                    placeholder="••••••••"
                    className="input-agency"
                    autoComplete="new-password"
                  />
                  {errors.confirmarSenha && (
                    <p className="text-xs text-destructive mt-1">{errors.confirmarSenha.message}</p>
                  )}
                </div>

                {/* Mensagens de erro/sucesso */}
                {erro && (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-3 animate-scale-in">
                    <p className="text-destructive text-sm">{erro}</p>
                  </div>
                )}

                {sucesso && (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 animate-scale-in">
                    <p className="text-green-500 text-sm">Cadastro realizado! Redirecionando para login...</p>
                  </div>
                )}

                {/* Botões de ação */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="btn-secondary flex-1 h-11 text-sm font-semibold"
                    disabled={isSubmitting}
                  >
                    Voltar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-gold flex-1 flex items-center justify-center gap-2 disabled:opacity-50 h-11 text-sm font-semibold"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      'Criar Conta'
                    )}
                  </button>
                </div>
              </>
            )}
          </form>

          {/* Link para login */}
          <p className="text-center text-xs text-muted-foreground mt-8">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-gold-400 hover:text-gold-300 font-semibold transition-colors">
              Faça login
            </Link>
          </p>

          <p className="text-center text-xs text-muted-foreground mt-3">
            Sistema de uso exclusivo · {new Date().getFullYear()} Gestão de Agências
          </p>
        </div>
      </div>
    </div>
  )
}
