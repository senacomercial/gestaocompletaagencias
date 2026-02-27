# Sistema de Gestão Completa de Agências — Fullstack Architecture Document

> **Versão:** 1.0
> **Data:** 2026-02-22
> **Status:** Aprovado
> **Gerado por:** Aria / @architect (Synkra AIOS)
> **PRD:** docs/prd/prd.md v1.0

---

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-02-22 | 1.0 | Criação inicial da arquitetura full-stack | Aria / @architect |

---

## 1. Introduction

### 1.1 Starter Template

**N/A — Greenfield project.** Stack definida no PRD. Nenhum starter template externo — scaffolding manual para controle total sobre tokens Agency Gold, configurações de Baileys e estrutura de módulos.

### 1.2 Overview

Este documento descreve a arquitetura completa full-stack do **Sistema de Gestão Completa de Agências** — plataforma multi-tenant que unifica CRM com WhatsApp, gestão de projetos, financeiro e orquestração de agentes de IA em uma única interface dark-first com paleta Agency Gold.

O sistema é um **monolito modular Next.js 14** (App Router) com um **servidor Node.js dedicado** para Socket.io + Baileys rodando em paralelo. Todos os dados são isolados por `organizacaoId` (multi-tenancy por coluna). Deploy: Next.js na **Vercel**, Socket.io + PostgreSQL no **Railway**.

---

## 2. High Level Architecture

### 2.1 Technical Summary

Sistema web full-stack construído como monolito modular Next.js 14 (App Router), com servidor Node.js dedicado para Socket.io + Baileys rodando em processo separado. O frontend React consome APIs REST internas via route handlers do Next.js, enquanto eventos em tempo real (WhatsApp, Kanban live updates, status de agentes) trafegam pelo Socket.io. PostgreSQL centraliza todos os dados com isolamento multi-tenant por `organizacaoId`; Prisma ORM abstrai o acesso com type-safety total em TypeScript. Deploy com Next.js na Vercel e servidor Socket.io no Railway — separação necessária pois Baileys requer conexão TCP persistente incompatível com o modelo serverless da Vercel.

### 2.2 Platform & Infrastructure

**Selecionado: Vercel + Railway**

| Serviço | Plataforma | Justificativa |
|---------|-----------|---------------|
| Next.js App | Vercel | Deploy automático, edge CDN, preview por branch |
| Socket.io + Baileys | Railway | Container persistente, auto-restart, logs centralizados |
| PostgreSQL 16 | Railway (managed) | Mesmo provedor do Socket server, baixa latência |
| File Storage | Cloudinary | Upload de arquivos em detalhamentos de tarefas |
| Região | South America (São Paulo) | Latência mínima para usuários brasileiros |

### 2.3 Repository Structure

**Monorepo simples com npm workspaces** — sem Turborepo/Nx neste estágio (complexidade não justificada para o time inicial).

```
gestaocompletaagencias/    ← root (este repositório)
├── src/                   ← Next.js app (frontend + API routes)
├── server/                ← Socket.io + Baileys (processo separado)
├── prisma/                ← Schema, migrations, seed
└── docs/                  ← PRD, arquitetura, stories
```

### 2.4 High Level Architecture Diagram

```mermaid
graph TB
    subgraph Client["🌐 Browser (Cliente)"]
        UI["Next.js React App\n(shadcn/ui + Tailwind\nAgency Gold Theme)"]
        SCC["Socket.io Client\n(useSocket hook)"]
    end

    subgraph Vercel["☁️ Vercel (Next.js)"]
        NEXT["Next.js 14 Server\n(App Router)"]
        MW["Middleware\n(Auth Guard + Tenant)"]
        API["API Routes\n/api/*"]
    end

    subgraph Railway["🚂 Railway"]
        subgraph SocketServer["Socket.io Server (Node.js)"]
            SOCK["Socket.io\n(Event Hub)"]
            BAIL["Baileys\n(WhatsApp Session)"]
        end
        PG[("PostgreSQL 16\n(Multi-tenant)")]
    end

    subgraph External["🔌 Serviços Externos"]
        WA["WhatsApp\nServers"]
        CDN["Cloudinary\n(File Storage)"]
        SENTRY["Sentry\n(Error Tracking)"]
    end

    UI -->|"HTTPS/REST"| NEXT
    SCC <-->|"WebSocket"| SOCK
    NEXT --> MW
    MW --> API
    API -->|"Prisma ORM"| PG
    SOCK -->|"Prisma ORM"| PG
    SOCK <--> BAIL
    BAIL <-->|"XMPP/WebSocket"| WA
    API -->|"Upload"| CDN
    NEXT -->|"Error events"| SENTRY
    SOCK -->|"Error events"| SENTRY
```

### 2.5 Architectural Patterns

- **Modular Monolith:** Código organizado em módulos (crm, projetos, financeiro, whatsapp, squad) com fronteiras claras — extração como microserviço facilitada no futuro se necessário
- **Multi-tenant por Coluna:** Isolamento via `organizacaoId` em todos os models Prisma — mais simples que schemas separados, adequado para o volume esperado. `organizacaoId` extraído SEMPRE da session JWT, nunca do request body
- **React Server Components + Client Components:** RSC para data fetching inicial sem waterfall; Client Components apenas onde há interatividade (Kanban DnD, Chat, Slide-overs, Socket.io listeners)
- **Service Layer Pattern:** Funções de service em `src/lib/services/` encapsulam lógica Prisma — API routes apenas orquestram (validate → auth → service → response)
- **Event-Driven via Socket.io:** Eventos nomeados desacoplam produtores (Baileys, API routes) de consumidores (UI) — zero polling
- **Optimistic Updates:** UI atualiza imediatamente (ex: arrastar Kanban) com rollback automático em caso de erro de API — experiência fluida sem re-renders desnecessários
- **Zod Schema Validation:** Mesmo schema Zod reutilizado no frontend (React Hook Form resolver) e no backend (API route validation) — validação consistente em ambas as camadas

---

## 3. Tech Stack

| Category | Technology | Version | Purpose | Rationale |
|----------|-----------|---------|---------|-----------|
| Framework | Next.js | 14.2.x | Full-stack App Router | SSR, API routes, file-based routing em um projeto |
| Language | TypeScript | 5.4.x | Type safety end-to-end | Elimina erros de runtime, IntelliSense completo |
| ORM | Prisma | 5.14.x | Database access layer | Schema-first, migrations, type-safe queries |
| Database | PostgreSQL | 16 | Primary datastore | ACID, JSONB, full-text search, confiável |
| Auth | NextAuth.js | 4.24.x | Session + JWT | Credentials provider, session com org context |
| Realtime | Socket.io | 4.7.x | WebSocket event hub | Compatível com Baileys, rooms por org |
| WhatsApp | @whiskeysockets/baileys | 6.x | WA Business API | Mais madura e ativa, suporta QR + code |
| UI Components | shadcn/ui | Latest | Radix + Tailwind base | 100% customizável, dark theme nativo |
| CSS Framework | Tailwind CSS | 3.4.x | Utility-first styling | Dark mode, tokens custom Agency Gold |
| Drag & Drop | @dnd-kit/core | 6.x | Kanban drag-and-drop | Performático, acessível, sem jQuery |
| Forms | React Hook Form | 7.x | Form management | Performance, integração com Zod |
| Validation | Zod | 3.x | Schema validation | Compartilhado frontend + backend |
| Charts | Recharts | 2.x | Financial dashboard | Simples, responsivo, customizável |
| Icons | Lucide React | Latest | Icon system | Consistente com shadcn/ui |
| Dates | date-fns | 3.x | Date manipulation | Sprints, prazos, vencimentos |
| Rich Text | @tiptap/react | 2.x | Task detailing editor | Extensível, headless, dark mode fácil |
| HTTP Client | SWR | 2.x | Data fetching/caching | Stale-while-revalidate, optimistic updates |
| Passwords | bcryptjs | 2.x | Password hashing | Seguro, sem binários nativos |
| Testing | Vitest | 1.x | Unit + integration tests | Compatível com Vite, rápido |
| Testing | @testing-library/react | 14.x | Component testing | Best practices React testing |
| Monitoring | Sentry | 8.x | Error tracking | Frontend + backend em um SDK |
| CI/CD | GitHub Actions | — | Automated pipeline | Integrado ao GitHub, gratuito |
| Package Manager | npm | 10.x | Dependency management | Padrão, sem configuração extra |

---

## 4. Data Models

### 4.1 Enums

```typescript
// src/types/index.ts

export type Role = 'ADMIN' | 'GESTOR' | 'OPERACIONAL'
export type LeadStatus = 'ATIVO' | 'VENDA_REALIZADA' | 'PERDIDO'
export type TipoPagamento = 'RECORRENTE' | 'PARCELADO' | 'AVULSO'
export type StatusLancamento = 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'CANCELADO'
export type TipoLancamento = 'RECORRENTE' | 'UNICO'
export type StatusProjeto = 'ATIVO' | 'PAUSADO' | 'CONCLUIDO' | 'CANCELADO'
export type StatusTarefa = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'BLOQUEADA'
export type StatusAgente = 'DISPONIVEL' | 'EM_EXECUCAO' | 'INATIVO' | 'ERRO'
export type StatusExecucao = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDA' | 'FALHA'
export type NivelLog = 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS'
```

### 4.2 Core Interfaces

```typescript
// Organizacao & Usuario
interface Organizacao {
  id: string
  nome: string
  slug: string
  createdAt: Date
  usuarios: Usuario[]
}

interface Usuario {
  id: string
  nome: string
  email: string
  role: Role
  organizacaoId: string
  createdAt: Date
}

// CRM
interface Funil {
  id: string
  nome: string
  descricao?: string
  ordem: number
  organizacaoId: string
  etapas: EtapaFunil[]
}

interface EtapaFunil {
  id: string
  nome: string
  cor: string
  ordem: number
  isVendaRealizada: boolean
  funilId: string
}

interface Lead {
  id: string
  nome: string
  email?: string
  telefone?: string
  empresa?: string
  status: LeadStatus
  vgvTotal?: number
  recorrenciaMensal?: number
  dataConversao?: Date
  etapaId: string
  funilId: string
  organizacaoId: string
  tags: Tag[]
  mensagens: Mensagem[]
  createdAt: Date
  updatedAt: Date
}

interface Tag {
  id: string
  nome: string
  cor: string
  organizacaoId: string
}

interface Mensagem {
  id: string
  corpo: string
  fromMe: boolean
  timestamp: Date
  whatsappId: string
  telefoneContato: string
  lida: boolean
  leadId?: string
  organizacaoId: string
}

// Projetos & Tarefas
interface Projeto {
  id: string
  nome: string
  tipoServico: string
  status: StatusProjeto
  leadId: string
  organizacaoId: string
  sprints: Sprint[]
  tarefas: Tarefa[]
  contrato?: ContratoFinanceiro
  createdAt: Date
}

interface Sprint {
  id: string
  nome: string
  dataInicio: Date
  dataFim: Date
  projetoId: string
  tarefas: Tarefa[]
}

interface Tarefa {
  id: string
  titulo: string
  descricao?: string
  status: StatusTarefa
  prazo?: Date
  ordem: number
  projetoId: string
  sprintId?: string
  responsavelId?: string
  detalhamentos: Detalhamento[]
  createdAt: Date
  updatedAt: Date
}

interface Detalhamento {
  id: string
  conteudo: string
  tarefaId: string
  autorId: string
  createdAt: Date
}

// Financeiro
interface ContratoFinanceiro {
  id: string
  valorTotal: number
  recorrenciaMensal?: number
  tipoPagamento: TipoPagamento
  dataInicio: Date
  numeroParcelas?: number
  projetoId: string
  leadId: string
  organizacaoId: string
  lancamentos: Lancamento[]
  createdAt: Date
}

interface Lancamento {
  id: string
  descricao: string
  valor: number
  dataVencimento: Date
  dataPagamento?: Date
  status: StatusLancamento
  tipo: TipoLancamento
  contratoId: string
  organizacaoId: string
  createdAt: Date
}

// Presets
interface PresetServico {
  id: string
  nome: string
  organizacaoId: string
  tarefas: PresetTarefa[]
}

interface PresetTarefa {
  id: string
  titulo: string
  descricao?: string
  ordemPadrao: number
  presetServicoId: string
}

// Squad & Agentes
interface Squad {
  id: string
  nome: string
  descricao?: string
  avatar: string
  cor: string
  ativo: boolean
  organizacaoId: string
  agentes: Agente[]
}

interface Agente {
  id: string
  nome: string
  role: string
  icone: string
  descricao?: string
  status: StatusAgente
  configuracao: Record<string, unknown>
  squadId: string
  organizacaoId: string
  execucoes: Execucao[]
}

interface Execucao {
  id: string
  comando: string
  input?: Record<string, unknown>
  output?: string
  status: StatusExecucao
  iniciadoEm: Date
  concluidoEm?: Date
  duracaoMs?: number
  agenteId: string
  usuarioId: string
  organizacaoId: string
  logs: LogExecucao[]
}

interface LogExecucao {
  id: string
  nivel: NivelLog
  mensagem: string
  timestamp: Date
  execucaoId: string
}
```

---

## 5. API Specification

**Base URL:** `/api`
**Auth:** Todas as rotas requerem sessão válida (NextAuth). `organizacaoId` extraído da session.
**Formato de erro:**
```json
{ "error": { "code": "string", "message": "string", "details": {} } }
```

### 5.1 Auth
```
POST   /api/auth/[...nextauth]   NextAuth handler (login/logout/session)
GET    /api/auth/session          Session atual
```

### 5.2 Usuários & Organização
```
GET    /api/usuarios              Lista usuários da organização
POST   /api/usuarios              Criar usuário (ADMIN only)
PUT    /api/usuarios/[id]         Atualizar usuário
DELETE /api/usuarios/[id]         Desativar usuário
```

### 5.3 Funis & Etapas
```
GET    /api/funis                 Lista funis da organização
POST   /api/funis                 Criar funil
PUT    /api/funis/[id]            Atualizar funil
DELETE /api/funis/[id]            Excluir funil
GET    /api/funis/[id]/etapas     Lista etapas do funil
POST   /api/funis/[id]/etapas     Criar etapa
PUT    /api/etapas/[id]           Atualizar etapa
DELETE /api/etapas/[id]           Excluir etapa
PATCH  /api/etapas/reorder        Reordenar etapas (body: [{id, ordem}])
```

### 5.4 Leads
```
GET    /api/leads                 Lista leads (query: funilId, etapaId, status, tag)
POST   /api/leads                 Criar lead
GET    /api/leads/[id]            Detalhes do lead
PUT    /api/leads/[id]            Atualizar lead
DELETE /api/leads/[id]            Excluir lead
PATCH  /api/leads/[id]/etapa      Mover lead para etapa (body: {etapaId})
POST   /api/leads/[id]/tags       Adicionar tag ao lead
DELETE /api/leads/[id]/tags/[tagId] Remover tag do lead
```

### 5.5 Tags
```
GET    /api/tags                  Lista tags da organização
POST   /api/tags                  Criar tag
PUT    /api/tags/[id]             Atualizar tag
DELETE /api/tags/[id]             Excluir tag
```

### 5.6 Mensagens WhatsApp
```
GET    /api/mensagens             Lista mensagens (query: leadId, naoIdentificadas)
PATCH  /api/mensagens/[id]/vincular Vincular mensagem a lead (body: {leadId})
POST   /api/whatsapp/connect      Iniciar conexão WhatsApp
POST   /api/whatsapp/disconnect   Desconectar WhatsApp
GET    /api/whatsapp/status       Status da conexão
POST   /api/whatsapp/send         Enviar mensagem (body: {telefone, corpo})
```

### 5.7 Conversão (Lead → Venda)
```
POST   /api/conversao             Registrar venda — transação atômica:
                                  1. Atualiza Lead (status, vgv, dataConversao)
                                  2. Cria Projeto
                                  3. Cria ContratoFinanceiro
                                  4. Gera Lancamentos
```

### 5.8 Projetos
```
GET    /api/projetos              Lista projetos (query: status, tipoServico)
GET    /api/projetos/[id]         Detalhes do projeto com sprints e tarefas
PUT    /api/projetos/[id]         Atualizar projeto
PATCH  /api/projetos/[id]/status  Atualizar status do projeto
```

### 5.9 Sprints
```
GET    /api/projetos/[id]/sprints Lista sprints do projeto
POST   /api/projetos/[id]/sprints Criar sprint
PUT    /api/sprints/[id]          Atualizar sprint
DELETE /api/sprints/[id]          Excluir sprint
```

### 5.10 Tarefas
```
GET    /api/projetos/[id]/tarefas Lista tarefas do projeto
POST   /api/projetos/[id]/tarefas Criar tarefa
PUT    /api/tarefas/[id]          Atualizar tarefa
DELETE /api/tarefas/[id]          Excluir tarefa
PATCH  /api/tarefas/[id]/status   Atualizar status
PATCH  /api/tarefas/[id]/sprint   Mover para sprint (body: {sprintId})
PATCH  /api/tarefas/reorder       Reordenar tarefas
```

### 5.11 Detalhamentos
```
GET    /api/tarefas/[id]/detalhamentos  Lista detalhamentos da tarefa
POST   /api/tarefas/[id]/detalhamentos  Criar detalhamento
PUT    /api/detalhamentos/[id]          Atualizar detalhamento
DELETE /api/detalhamentos/[id]          Excluir detalhamento
```

### 5.12 Presets
```
GET    /api/presets               Lista presets de serviço
POST   /api/presets               Criar preset
PUT    /api/presets/[id]          Atualizar preset
DELETE /api/presets/[id]          Excluir preset
POST   /api/presets/[id]/aplicar  Aplicar preset ao projeto (body: {projetoId, tarefasIds?})
```

### 5.13 Financeiro
```
GET    /api/contratos             Lista contratos (query: status, clienteId)
POST   /api/contratos             Criar contrato manual
PUT    /api/contratos/[id]        Atualizar contrato
PATCH  /api/contratos/[id]/encerrar Encerrar contrato (body: {motivo})
GET    /api/lancamentos           Lista lançamentos (query: status, mes, contratoId)
POST   /api/lancamentos           Criar lançamento avulso
PUT    /api/lancamentos/[id]      Atualizar lançamento
PATCH  /api/lancamentos/[id]/pagar Marcar como pago (body: {dataPagamento, valorPago})
DELETE /api/lancamentos/[id]      Excluir lançamento PENDENTE
GET    /api/financeiro/dashboard  KPIs financeiros (VGV, MRR, inadimplência)
GET    /api/financeiro/export     Exportar lançamentos CSV
```

### 5.14 Squads & Agentes
```
GET    /api/squads                Lista squads
POST   /api/squads                Criar squad
PUT    /api/squads/[id]           Atualizar squad
GET    /api/agentes               Lista agentes
POST   /api/agentes               Criar agente
PUT    /api/agentes/[id]          Atualizar agente
PATCH  /api/agentes/[id]/status   Atualizar status do agente
POST   /api/execucoes             Iniciar execução (acionar agente)
GET    /api/execucoes             Lista execuções (query: agenteId, status)
PATCH  /api/execucoes/[id]/cancelar Cancelar execução
```

### 5.15 AIOS Integration (Webhooks)
```
POST   /api/aios/webhook          Receber eventos de agentes externos
GET    /api/aios/agentes          Lista agentes para agentes externos
POST   /api/aios/execucoes        Registrar execução de agente externo
```

### 5.16 Dashboard
```
GET    /api/dashboard/kpis        KPIs principais (VGV, MRR, leads ativos, tarefas hoje)
GET    /api/dashboard/atividade   Atividade recente
```

---

## 6. Project Structure

```
gestaocompletaagencias/
├── .github/
│   └── workflows/
│       ├── ci.yml                     # Lint + typecheck + test
│       └── deploy.yml                 # Deploy Vercel + Railway
│
├── docs/
│   ├── prd/
│   │   └── prd.md                     # PRD aprovado
│   ├── architecture/
│   │   └── fullstack-architecture.md  # Este documento
│   └── stories/                       # Stories por epic
│       ├── epics/
│       └── 1.1.story.md ... 7.5.story.md
│
├── prisma/
│   ├── schema.prisma                  # Schema completo (18 models)
│   ├── seed.ts                        # Seed de desenvolvimento
│   └── migrations/                    # Migrations geradas pelo Prisma
│
├── server/
│   └── socket-server.js               # Socket.io + Baileys (processo separado)
│
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx                 # Root layout (dark theme, fonts)
│   │   ├── globals.css                # CSS global + Tailwind imports
│   │   │
│   │   ├── (auth)/                    # Route group: não autenticado
│   │   │   └── login/
│   │   │       └── page.tsx           # Página de login
│   │   │
│   │   ├── (dashboard)/               # Route group: autenticado
│   │   │   ├── layout.tsx             # Layout com sidebar
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx           # Dashboard principal (KPIs)
│   │   │   ├── crm/
│   │   │   │   └── page.tsx           # Kanban multi-funil
│   │   │   ├── projetos/
│   │   │   │   ├── page.tsx           # Listagem de projetos
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx       # Detalhe do projeto (sprints + tarefas)
│   │   │   ├── financeiro/
│   │   │   │   └── page.tsx           # Contratos, lançamentos, dashboard
│   │   │   ├── whatsapp/
│   │   │   │   ├── page.tsx           # Conexão e conversas
│   │   │   │   └── nao-identificadas/
│   │   │   │       └── page.tsx       # Mensagens sem lead vinculado
│   │   │   ├── squad/
│   │   │   │   ├── page.tsx           # Dashboard de squads e agentes
│   │   │   │   └── integracoes/
│   │   │   │       └── page.tsx       # Configuração de webhooks AIOS
│   │   │   └── configuracoes/
│   │   │       ├── page.tsx           # Configurações gerais
│   │   │       ├── funis/
│   │   │       │   └── page.tsx       # CRUD de funis e etapas
│   │   │       ├── tags/
│   │   │       │   └── page.tsx       # Gerenciar tags
│   │   │       ├── presets/
│   │   │       │   └── page.tsx       # Presets de tarefas por serviço
│   │   │       └── usuarios/
│   │   │           └── page.tsx       # Gerenciar usuários
│   │   │
│   │   └── api/                       # API Routes
│   │       ├── auth/
│   │       │   └── [...nextauth]/
│   │       │       └── route.ts
│   │       ├── dashboard/
│   │       │   ├── kpis/route.ts
│   │       │   └── atividade/route.ts
│   │       ├── funis/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── etapas/route.ts
│   │       ├── etapas/
│   │       │   ├── [id]/route.ts
│   │       │   └── reorder/route.ts
│   │       ├── leads/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── etapa/route.ts
│   │       │       └── tags/
│   │       │           ├── route.ts
│   │       │           └── [tagId]/route.ts
│   │       ├── tags/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── mensagens/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── vincular/route.ts
│   │       ├── whatsapp/
│   │       │   ├── connect/route.ts
│   │       │   ├── disconnect/route.ts
│   │       │   ├── status/route.ts
│   │       │   └── send/route.ts
│   │       ├── conversao/
│   │       │   └── route.ts           # Transação atômica lead → venda
│   │       ├── projetos/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── sprints/route.ts
│   │       │       └── tarefas/route.ts
│   │       ├── sprints/
│   │       │   └── [id]/route.ts
│   │       ├── tarefas/
│   │       │   ├── reorder/route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── status/route.ts
│   │       │       ├── sprint/route.ts
│   │       │       └── detalhamentos/route.ts
│   │       ├── detalhamentos/
│   │       │   └── [id]/route.ts
│   │       ├── presets/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── aplicar/route.ts
│   │       ├── contratos/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── encerrar/route.ts
│   │       ├── lancamentos/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── pagar/route.ts
│   │       ├── financeiro/
│   │       │   ├── dashboard/route.ts
│   │       │   └── export/route.ts
│   │       ├── squads/
│   │       │   ├── route.ts
│   │       │   └── [id]/route.ts
│   │       ├── agentes/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── status/route.ts
│   │       ├── execucoes/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       └── cancelar/route.ts
│   │       └── aios/
│   │           ├── webhook/route.ts
│   │           ├── agentes/route.ts
│   │           └── execucoes/route.ts
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui (gerados via CLI)
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── input.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── sheet.tsx              # Slide-over base
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...
│   │   │
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx            # Sidebar navegação principal
│   │   │   ├── SidebarItem.tsx        # Item da sidebar com ícone
│   │   │   ├── TopBar.tsx             # Barra superior (user menu, notificações)
│   │   │   ├── DashboardLayout.tsx    # Layout wrapper autenticado
│   │   │   └── NotificationToast.tsx  # Toast de notificações
│   │   │
│   │   ├── crm/
│   │   │   ├── KanbanBoard.tsx        # Board principal (Client Component)
│   │   │   ├── KanbanColumn.tsx       # Coluna de etapa
│   │   │   ├── LeadCard.tsx           # Card de lead com DnD
│   │   │   ├── LeadSlideOver.tsx      # Slide-over de detalhes do lead
│   │   │   ├── LeadForm.tsx           # Formulário criar/editar lead
│   │   │   ├── TagBadge.tsx           # Badge de tag colorida
│   │   │   ├── TagInput.tsx           # Input com autocomplete de tags
│   │   │   ├── VendaModal.tsx         # Modal de registro de venda
│   │   │   └── FunilSelector.tsx      # Seletor de funil ativo
│   │   │
│   │   ├── projetos/
│   │   │   ├── ProjectCard.tsx        # Card de projeto na listagem
│   │   │   ├── ProjectGrid.tsx        # Grid de projetos
│   │   │   ├── SprintSection.tsx      # Seção de sprint com tarefas
│   │   │   ├── TarefaRow.tsx          # Linha de tarefa na lista
│   │   │   ├── TarefaSlideOver.tsx    # Slide-over de detalhes da tarefa
│   │   │   ├── DetalhamentoFeed.tsx   # Feed de detalhamentos
│   │   │   ├── DetalhamentoEditor.tsx # Editor rich text (TipTap)
│   │   │   ├── PresetModal.tsx        # Modal de aplicar preset
│   │   │   └── SprintProgress.tsx     # Barra de progresso do sprint
│   │   │
│   │   ├── financeiro/
│   │   │   ├── ContratoCard.tsx       # Card/row de contrato
│   │   │   ├── LancamentoRow.tsx      # Linha de lançamento
│   │   │   ├── PagarModal.tsx         # Modal marcar como pago
│   │   │   ├── FinanceiroDashboard.tsx # Dashboard com KPIs e gráficos
│   │   │   ├── RecebimentosChart.tsx  # Gráfico barras recebimentos
│   │   │   ├── MRRChart.tsx           # Gráfico linha MRR histórico
│   │   │   └── StatusDonutChart.tsx   # Donut status lançamentos
│   │   │
│   │   ├── whatsapp/
│   │   │   ├── QRCodeDisplay.tsx      # QR Code para conexão
│   │   │   ├── ChatWindow.tsx         # Janela de chat (Client Component)
│   │   │   ├── MessageBubble.tsx      # Bolha de mensagem
│   │   │   ├── ConversationList.tsx   # Lista de conversas
│   │   │   └── ConnectionStatus.tsx   # Status da conexão WA
│   │   │
│   │   └── squad/
│   │       ├── SquadCard.tsx          # Card de squad
│   │       ├── AgenteCard.tsx         # Card de agente com status
│   │       ├── AgenteSlideOver.tsx    # Slide-over do agente
│   │       ├── ExecucaoLog.tsx        # Log de execução em tempo real
│   │       ├── AcionarAgenteModal.tsx # Modal de acionar agente
│   │       └── ExecucoesPanel.tsx     # Painel de execuções ativas
│   │
│   ├── lib/
│   │   ├── prisma.ts                  # Prisma Client singleton
│   │   ├── auth.ts                    # NextAuth configuration
│   │   ├── auth-options.ts            # NextAuth options (credentials)
│   │   ├── socket.ts                  # Socket.io client singleton
│   │   ├── utils.ts                   # cn(), formatCurrency(), formatDate()
│   │   ├── validations/               # Zod schemas compartilhados
│   │   │   ├── lead.ts
│   │   │   ├── funil.ts
│   │   │   ├── tarefa.ts
│   │   │   ├── lancamento.ts
│   │   │   └── conversao.ts
│   │   └── services/                  # Service layer (Prisma queries)
│   │       ├── leads.ts
│   │       ├── funis.ts
│   │       ├── projetos.ts
│   │       ├── tarefas.ts
│   │       ├── contratos.ts
│   │       ├── lancamentos.ts
│   │       ├── mensagens.ts
│   │       ├── squads.ts
│   │       ├── execucoes.ts
│   │       └── conversao.ts           # Transação atômica de conversão
│   │
│   ├── hooks/
│   │   ├── useSocket.ts               # Hook para Socket.io connection
│   │   ├── useLeads.ts                # SWR hook para leads do funil
│   │   ├── useTarefas.ts              # SWR hook para tarefas do projeto
│   │   ├── useLancamentos.ts          # SWR hook para lançamentos
│   │   └── useAgentes.ts             # SWR hook para agentes + execuções
│   │
│   └── types/
│       └── index.ts                   # Interfaces TypeScript globais + next-auth types
│
├── middleware.ts                      # Auth middleware (proteção de rotas)
├── tailwind.config.ts                 # Tema Agency Gold + Bronze
├── tsconfig.json                      # Path alias @/* → src/*
├── next.config.ts                     # Configurações Next.js
├── package.json                       # Dependências
├── .env.example                       # Template de variáveis
└── .gitignore
```

---

## 7. Core Workflows

### 7.1 Fluxo de Autenticação

```mermaid
sequenceDiagram
    actor U as Usuário
    participant F as Frontend
    participant MW as Middleware
    participant API as NextAuth API
    participant DB as PostgreSQL

    U->>F: Acessa /dashboard
    F->>MW: Request
    MW->>MW: Verifica session JWT
    MW-->>F: Redirect /login (sem session)
    U->>F: Preenche email + senha
    F->>API: POST /api/auth/callback/credentials
    API->>DB: SELECT usuario WHERE email
    DB-->>API: Usuario encontrado
    API->>API: bcrypt.compare(senha, hash)
    API-->>F: Session JWT (userId, orgId, role)
    F->>MW: Request /dashboard com session
    MW->>MW: Session válida ✓
    MW-->>F: Acesso permitido
```

### 7.2 Fluxo de Conexão WhatsApp (QR Code)

```mermaid
sequenceDiagram
    actor A as Admin
    participant F as Frontend
    participant API as Next.js API
    participant SOCK as Socket.io Server
    participant BAIL as Baileys
    participant WA as WhatsApp

    A->>F: Clica "Conectar WhatsApp"
    F->>SOCK: emit('whatsapp:connect', {orgId})
    SOCK->>BAIL: makeWASocket({orgId})
    BAIL->>BAIL: Gera QR Code
    BAIL-->>SOCK: emit('qr', qrBase64)
    SOCK-->>F: emit('qr', qrBase64)
    F->>A: Exibe QR Code
    A->>WA: Escaneia com celular
    WA-->>BAIL: Autenticação confirmada
    BAIL-->>SOCK: emit('connection.update', OPEN)
    SOCK->>SOCK: Salva auth state em sessions/{orgId}/
    SOCK-->>F: emit('whatsapp:connected', {numero})
    F->>A: Badge "Conectado ✓"
```

### 7.3 Fluxo de Conversão Lead → Venda (Transação Atômica)

```mermaid
sequenceDiagram
    actor V as Vendedor
    participant F as Frontend
    participant API as /api/conversao
    participant DB as PostgreSQL
    participant SOCK as Socket.io

    V->>F: Arrasta lead para "Venda Realizada"
    F->>V: Abre VendaModal
    V->>F: Preenche VGV, tipo pagamento, data início
    F->>F: Preview cronograma de pagamentos
    V->>F: Confirma venda
    F->>API: POST /api/conversao {leadId, vgv, contrato...}
    API->>API: Zod validation
    API->>API: Auth check + org check
    API->>DB: BEGIN TRANSACTION
    DB->>DB: UPDATE Lead (status=VENDA_REALIZADA, vgvTotal, dataConversao)
    DB->>DB: INSERT Projeto (nome, tipoServico, leadId)
    DB->>DB: INSERT ContratoFinanceiro
    DB->>DB: INSERT Lancamentos (N registros conforme tipo)
    DB->>API: COMMIT
    API-->>F: 201 {projeto, contrato, lancamentos}
    F->>SOCK: emit('venda:realizada', {leadId, orgId})
    SOCK-->>F: Broadcast para outros usuários da org
    F->>V: Toast "🏆 Venda registrada!"
    F->>F: Atualiza Kanban (badge VENDA no card)
```

### 7.4 Fluxo de Mensagem WhatsApp Recebida

```mermaid
sequenceDiagram
    participant WA as WhatsApp
    participant BAIL as Baileys
    participant SOCK as Socket.io Server
    participant DB as PostgreSQL
    participant F as Frontend

    WA->>BAIL: Nova mensagem (telefone, corpo)
    BAIL-->>SOCK: emit('messages.upsert', msg)
    SOCK->>DB: SELECT Lead WHERE telefone = msg.telefone AND orgId
    alt Lead encontrado
        DB-->>SOCK: Lead {id, nome}
        SOCK->>DB: INSERT Mensagem (leadId = lead.id)
        SOCK-->>F: emit('message:new', {leadId, corpo, timestamp})
        F->>F: Atualiza chat do lead em tempo real
        F->>F: Badge de não lidas no Kanban card
    else Lead não encontrado
        SOCK->>DB: INSERT Mensagem (leadId = null)
        SOCK-->>F: emit('message:naoIdentificada', {telefone, corpo})
        F->>F: Badge em /whatsapp/nao-identificadas
    end
    F->>F: Toast de notificação
```

### 7.5 Fluxo de Acionamento de Agente

```mermaid
sequenceDiagram
    actor G as Gestor
    participant F as Frontend
    participant API as Next.js API
    participant DB as PostgreSQL
    participant SOCK as Socket.io
    participant EXT as Agente Externo (AIOS)

    G->>F: Clica "Acionar Agente"
    F->>G: Modal com campo de comando
    G->>F: Preenche comando + contexto
    F->>API: POST /api/execucoes {agenteId, comando, input}
    API->>DB: INSERT Execucao (status=PENDENTE)
    API->>API: Notifica agente externo via AIOS_API_URL
    API-->>F: 201 {execucaoId}
    F->>G: Toast "▶ Agente acionado"
    Note over EXT: Agente processa...
    EXT->>API: POST /api/aios/webhook {execucaoId, evento: 'execucao:log', mensagem}
    API->>DB: INSERT LogExecucao
    API->>SOCK: emit('execucao:log', {execucaoId, log})
    SOCK-->>F: Log em tempo real no painel
    EXT->>API: POST /api/aios/webhook {execucaoId, evento: 'execucao:concluida', output}
    API->>DB: UPDATE Execucao (status=CONCLUIDA, output, concluidoEm)
    API->>SOCK: emit('execucao:concluida', {execucaoId})
    SOCK-->>F: Toast "✓ Agente concluiu" + output preview
```

---

## 8. Frontend Architecture

### 8.1 Component Strategy

```
Server Components (RSC) — data fetching, sem interatividade:
├── Páginas (page.tsx) — fetch inicial de dados
├── Layouts estáticos
└── Listas que não precisam de estado local

Client Components ('use client') — interatividade obrigatória:
├── KanbanBoard (DnD)
├── LeadSlideOver / TarefaSlideOver / AgenteSlideOver
├── ChatWindow (Socket.io)
├── QRCodeDisplay (Socket.io)
├── ExecucoesPanel (Socket.io)
├── Formulários (React Hook Form)
└── Qualquer componente com useState/useEffect
```

### 8.2 State Management

```typescript
// Server State: SWR (cache + revalidation)
const { data: leads, mutate } = useSWR('/api/leads?funilId=xxx', fetcher)

// UI State: useState local (modais, slide-overs)
const [isSlideOverOpen, setIsSlideOverOpen] = useState(false)

// Realtime State: Socket.io events via useSocket hook
const socket = useSocket()
useEffect(() => {
  socket.on('message:new', (data) => {
    mutate() // Revalida SWR cache
  })
  return () => socket.off('message:new')
}, [socket, mutate])
```

### 8.3 Slide-over Pattern (Reutilizável)

```typescript
// Padrão para todos os slide-overs (Lead, Tarefa, Agente)
interface SlideOverProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
}

// Uso:
<LeadSlideOver
  isOpen={selectedLead !== null}
  onClose={() => setSelectedLead(null)}
  leadId={selectedLead?.id}
/>
```

### 8.4 Routing Structure

```
/ → redirect /dashboard
/login → página de login (sem auth)
/dashboard → KPIs + atividade recente
/crm → Kanban multi-funil
/projetos → listagem de projetos
/projetos/[id] → sprints + tarefas
/financeiro → contratos + lançamentos + dashboard
/whatsapp → conexão + conversas
/whatsapp/nao-identificadas → mensagens sem lead
/squad → dashboard de squads e agentes
/squad/integracoes → webhooks AIOS
/configuracoes → settings gerais
/configuracoes/funis → CRUD de funis e etapas
/configuracoes/tags → gerenciar tags
/configuracoes/presets → presets de tarefas
/configuracoes/usuarios → gerenciar usuários
```

---

## 9. Backend Architecture

### 9.1 API Route Pattern

```typescript
// Padrão para todas as API routes
// src/app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { leadSchema } from '@/lib/validations/lead'
import { createLead } from '@/lib/services/leads'

export async function POST(request: NextRequest) {
  // 1. Auth check
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Não autenticado' } }, { status: 401 })
  }

  // 2. Parse + validate (Zod)
  const body = await request.json()
  const result = leadSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details: result.error.flatten() } }, { status: 400 })
  }

  // 3. Service call (organizacaoId SEMPRE da session)
  const lead = await createLead({
    ...result.data,
    organizacaoId: session.user.organizacaoId, // NUNCA do body
  })

  // 4. Response
  return NextResponse.json(lead, { status: 201 })
}
```

### 9.2 Service Layer Pattern

```typescript
// src/lib/services/leads.ts
import { prisma } from '@/lib/prisma'

export async function createLead(data: CreateLeadInput) {
  return prisma.lead.create({
    data,
    include: { tags: true, etapa: true }
  })
}

export async function getLeadsByFunil(funilId: string, organizacaoId: string) {
  return prisma.lead.findMany({
    where: { funilId, organizacaoId }, // sempre filtrar por org
    include: { tags: true, etapa: true },
    orderBy: { createdAt: 'desc' }
  })
}
```

### 9.3 Conversão Atômica (Service Crítico)

```typescript
// src/lib/services/conversao.ts
export async function registrarVenda(data: ConversaoInput) {
  return prisma.$transaction(async (tx) => {
    // 1. Atualizar lead
    const lead = await tx.lead.update({
      where: { id: data.leadId, organizacaoId: data.organizacaoId },
      data: {
        status: 'VENDA_REALIZADA',
        vgvTotal: data.vgvTotal,
        recorrenciaMensal: data.recorrenciaMensal,
        dataConversao: new Date(),
        etapaId: data.etapaVendaId,
      }
    })

    // 2. Criar projeto
    const projeto = await tx.projeto.create({
      data: {
        nome: `${lead.empresa || lead.nome} — ${data.tipoServico}`,
        tipoServico: data.tipoServico,
        status: 'ATIVO',
        leadId: lead.id,
        organizacaoId: data.organizacaoId,
      }
    })

    // 3. Criar contrato financeiro
    const contrato = await tx.contratoFinanceiro.create({
      data: {
        valorTotal: data.vgvTotal,
        recorrenciaMensal: data.recorrenciaMensal,
        tipoPagamento: data.tipoPagamento,
        dataInicio: data.dataInicio,
        numeroParcelas: data.numeroParcelas,
        projetoId: projeto.id,
        leadId: lead.id,
        organizacaoId: data.organizacaoId,
      }
    })

    // 4. Gerar lançamentos
    const lancamentos = gerarLancamentos(contrato)
    await tx.lancamento.createMany({ data: lancamentos })

    return { lead, projeto, contrato }
  })
}
```

### 9.4 Socket.io Server Architecture

```javascript
// server/socket-server.js
// Processo Node.js separado — não faz parte do Next.js

const { Server } = require('socket.io')
const { makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys')

// Socket.io server com rooms por organização
const io = new Server(PORT, {
  cors: { origin: process.env.NEXT_PUBLIC_APP_URL }
})

// Sessões Baileys por organização
const sessions = new Map() // orgId → WASocket

io.on('connection', (socket) => {
  const { orgId } = socket.handshake.auth

  socket.join(orgId) // Room da organização

  socket.on('whatsapp:connect', () => initBaileys(orgId, io))
  socket.on('whatsapp:send', ({ telefone, corpo }) => sendMessage(orgId, telefone, corpo))
})

async function initBaileys(orgId, io) {
  const { state, saveCreds } = await useMultiFileAuthState(`sessions/${orgId}`)

  const sock = makeWASocket({ auth: state })
  sessions.set(orgId, sock)

  sock.ev.on('connection.update', ({ qr, connection }) => {
    if (qr) io.to(orgId).emit('whatsapp:qr', qr)
    if (connection === 'open') io.to(orgId).emit('whatsapp:connected')
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      await processIncomingMessage(msg, orgId, io)
    }
  })

  sock.ev.on('creds.update', saveCreds)
}
```

---

## 10. Database Schema

O schema Prisma completo está em `prisma/schema.prisma`. Highlights de design:

- **Todos os models** têm `organizacaoId String` para isolamento multi-tenant
- **Todos os queries** filtram por `organizacaoId` extraído da session (nunca do body)
- **Soft delete** não implementado nesta versão — exclusão física com guards
- **Decimal** para valores monetários (vgvTotal, valor, recorrenciaMensal) — evita floating point errors
- **Índices** em campos de busca frequente: `organizacaoId`, `funilId`, `leadId`, `status`, `dataVencimento`

### Diagrama de Entidades Principais

```mermaid
erDiagram
    Organizacao ||--o{ Usuario : tem
    Organizacao ||--o{ Funil : tem
    Organizacao ||--o{ Lead : tem
    Funil ||--o{ EtapaFunil : tem
    Funil ||--o{ Lead : contem
    EtapaFunil ||--o{ Lead : classifica
    Lead ||--o{ LeadTag : tem
    Tag ||--o{ LeadTag : identifica
    Lead ||--o{ Mensagem : recebe
    Lead ||--o| Projeto : gera
    Projeto ||--o| ContratoFinanceiro : tem
    ContratoFinanceiro ||--o{ Lancamento : gera
    Projeto ||--o{ Sprint : tem
    Projeto ||--o{ Tarefa : tem
    Sprint ||--o{ Tarefa : agrupa
    Tarefa ||--o{ Detalhamento : tem
    Organizacao ||--o{ Squad : tem
    Squad ||--o{ Agente : tem
    Agente ||--o{ Execucao : realiza
    Execucao ||--o{ LogExecucao : registra
```

---

## 11. Security & Performance

### 11.1 Security

**Multi-tenant isolation:**
```typescript
// ✅ CORRETO — organizacaoId sempre da session
const leads = await getLeads({ organizacaoId: session.user.organizacaoId })

// ❌ ERRADO — NUNCA confiar no body
const leads = await getLeads({ organizacaoId: body.organizacaoId })
```

**Auth middleware:**
- Todas as rotas `/dashboard/*` e `/api/*` (exceto `/api/auth/*` e `/api/aios/webhook`) requerem sessão válida
- Webhook AIOS autenticado via `AIOS_API_KEY` no header `x-api-key`

**Outras medidas:**
- bcrypt para hashing de senhas (cost factor 12)
- Zod validation em todas as API routes antes de qualquer DB query
- Rate limiting: 100 req/min por IP via middleware Next.js
- CORS: apenas `NEXT_PUBLIC_APP_URL` permitido no Socket.io
- CSP headers configurados no `next.config.ts`

### 11.2 Performance

- **RSC** para data fetching inicial — zero JS no cliente para conteúdo estático
- **SWR** com stale-while-revalidate — UI sempre responsiva, dados atualizados em background
- **Optimistic updates** no Kanban e tarefas — sem espera de confirmação do servidor
- **Índices Prisma** em `organizacaoId`, `funilId`, `status`, `dataVencimento`
- **Paginação** em listas longas (leads, lançamentos, execuções) — cursor-based
- **Socket.io rooms** por `orgId` — broadcast apenas para usuários da mesma organização
- **Code splitting** automático por route group no Next.js App Router

---

## 12. Testing Strategy

```
         E2E (Manual)
        /             \
  Integration Tests    Manual WA Tests
      /          \
 Component Tests  API Route Tests
    /
Unit Tests (services, utils, validations)
```

### 12.1 Unit Tests — `src/lib/services/*.test.ts`
```typescript
// Exemplo: src/lib/services/conversao.test.ts
import { gerarLancamentos } from './conversao'
import { describe, it, expect } from 'vitest'

describe('gerarLancamentos', () => {
  it('gera 12 lançamentos mensais para contrato recorrente', () => {
    const lancamentos = gerarLancamentos({ tipoPagamento: 'RECORRENTE', recorrenciaMensal: 2000, dataInicio: new Date('2026-03-01') })
    expect(lancamentos).toHaveLength(12)
    expect(lancamentos[0].valor).toBe(2000)
  })
})
```

### 12.2 API Route Tests — `src/app/api/**/*.test.ts`
- Usar `next-test-api-route-handler` + Vitest
- Mock de `getServerSession` para simular auth
- Prisma mock via `vitest-mock-extended`

### 12.3 Component Tests — `src/components/**/*.test.tsx`
- Testing Library para interações de usuário
- Mock de SWR e Socket.io hooks

### 12.4 Manual Tests Obrigatórios
- Fluxo WhatsApp QR Code (não automatizável)
- Drag-and-drop Kanban (verificação visual)
- Socket.io realtime (múltiplas abas)

---

## 13. Deployment Architecture

### 13.1 Deployment Strategy

**Frontend (Vercel):**
- Build command: `npm run build`
- Output: `.next/`
- Deploy automático em push para `main`
- Preview deploys em pull requests

**Backend Socket.io (Railway):**
- Start command: `node server/socket-server.js`
- Auto-restart em crash
- Healthcheck: `GET /health` → 200

**Database (Railway PostgreSQL):**
- Managed, backups automáticos
- Connection string via `DATABASE_URL`

### 13.2 CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
```

### 13.3 Environments

| Environment | Frontend URL | Backend URL | Purpose |
|-------------|-------------|-------------|---------|
| Development | `http://localhost:3000` | `http://localhost:3001` | Local dev |
| Preview | `https://[branch].vercel.app` | Railway staging | PR review |
| Production | `https://app.suaagencia.com.br` | Railway production | Live |

### 13.4 Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/db

# Auth
NEXTAUTH_SECRET=seu-secret-aqui-min-32-chars
NEXTAUTH_URL=https://app.suaagencia.com.br
NEXT_PUBLIC_APP_URL=https://app.suaagencia.com.br

# Socket.io
NEXT_PUBLIC_SOCKET_URL=https://socket.suaagencia.com.br
SOCKET_PORT=3001

# AIOS Integration
AIOS_API_URL=https://aios.suaagencia.com.br
AIOS_API_KEY=sua-api-key-secreta

# Storage
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/yyy
```

---

## 14. Coding Standards

### 14.1 Critical Rules (para agentes @dev)

- **Multi-tenant:** `organizacaoId` extraído SEMPRE de `session.user.organizacaoId` — NUNCA de `request.body` ou `params`
- **Validation:** Toda API route usa Zod `schema.safeParse()` antes de qualquer operação
- **Service layer:** Nunca usar `prisma.*` diretamente em componentes ou API routes — apenas via funções em `src/lib/services/`
- **Client Components:** Adicionar `'use client'` apenas quando necessário (interatividade, hooks) — padrão é RSC
- **ClassNames:** Usar `cn()` de `src/lib/utils.ts` para classNames condicionais com Tailwind
- **Error responses:** Sempre retornar `{ error: { code, message, details? } }` com status HTTP correto
- **Transações:** Operações que afetam múltiplos models DEVEM usar `prisma.$transaction()`

### 14.2 Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| React Components | PascalCase | `LeadCard.tsx` |
| Hooks | camelCase com `use` | `useLeads.ts` |
| API Routes | kebab-case | `/api/lancamentos/[id]/pagar` |
| Service Functions | camelCase | `registrarVenda()` |
| Prisma Models | PascalCase | `ContratoFinanceiro` |
| Zod Schemas | camelCase + Schema | `leadSchema`, `conversaoSchema` |
| Domain terms | Português | `Lead`, `Funil`, `Lancamento` |
| Infra terms | Inglês | `middleware`, `handler`, `service` |

### 14.3 Agency Gold Theme Usage

```typescript
// ✅ Tokens corretos para paleta Agency Gold
className="bg-gold-400"        // Botão CTA principal
className="text-gold-400"      // Valores financeiros, labels ativos
className="border-gold-400"    // Borders de destaque
className="from-gold-400 to-bronze-400"  // Gradientes

// Superfícies dark
className="bg-[#0A0A0A]"       // Fundo base
className="bg-[#111111]"       // Sidebar, superfície 1
className="bg-[#1A1A1A]"       // Cards, superfície 2
className="bg-[#222222]"       // Hover state
```

---

## 15. Checklist de Arquitetura

- [x] Multi-tenancy por `organizacaoId` em todos os models
- [x] Auth com NextAuth.js + JWT com org context
- [x] Separação Socket.io/Baileys do Next.js (serverless incompatível)
- [x] Transação atômica para conversão de lead
- [x] Service layer separado das API routes
- [x] Zod validation em todas as entradas
- [x] bcrypt para senhas
- [x] Error response padronizado
- [x] Índices nos campos de busca frequente
- [x] CORS configurado para Socket.io
- [x] Rate limiting planejado
- [x] CI/CD com lint + typecheck + test antes do deploy
- [x] Variáveis de ambiente documentadas em .env.example
- [x] Sentry para error tracking

---

*Documento gerado pelo Synkra AIOS — Aria (@architect) | 2026-02-22*
*Stack: Next.js 14 + TypeScript + Prisma + PostgreSQL + Socket.io + Baileys | Deploy: Vercel + Railway*
