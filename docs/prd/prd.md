# Sistema de Gestão Completa de Agências — Product Requirements Document (PRD)

> **Versão:** 1.0
> **Data:** 2026-02-22
> **Status:** Aprovado
> **Gerado por:** Orion / @aios-master (Synkra AIOS)

---

## Change Log

| Data | Versão | Descrição | Autor |
|------|--------|-----------|-------|
| 2026-02-22 | 1.0 | Criação inicial do PRD — todos os epics e stories aprovados | Orion / @aios-master |

---

## 1. Goals & Background Context

### 1.1 Goals

- Centralizar toda a gestão operacional, comercial e financeira de uma agência em uma única plataforma
- Integrar WhatsApp nativo (QR Code + código) para comunicação com leads diretamente no CRM
- Automatizar o pipeline lead → cliente → projeto → financeiro sem intervenção manual
- Fornecer visibilidade em tempo real do VGV total e recorrências da carteira
- Permitir gestão de tarefas com sprints semanais, responsáveis e detalhamentos operacionais
- Orquestrar squads e agentes de IA em um único painel de controle

### 1.2 Background Context

Agências de marketing e serviços enfrentam fragmentação severa de ferramentas: CRM em um lugar, projetos em outro, financeiro em planilhas e WhatsApp fora de contexto. Isso gera perda de informação, atrasos na entrega e dificuldade de escalar.

Este sistema unifica todo o ciclo — do primeiro contato até o pagamento — em uma plataforma multi-tenant com arquitetura dark-first e integração nativa com WhatsApp via Baileys. O diferencial estratégico é o painel de orquestração de squads e agentes de IA integrado nativamente, permitindo que a agência opere suas equipes humanas e artificiais a partir de um único lugar.

---

## 2. Requirements

### 2.1 Functional Requirements

#### Módulo: Autenticação & Multi-tenant
- **FR1:** O sistema deve suportar múltiplas organizações isoladas (multi-tenant), cada uma com seus próprios dados, usuários e configurações
- **FR2:** O sistema deve autenticar usuários via email e senha com suporte a roles (Admin, Gestor, Operacional)
- **FR3:** O sistema deve permitir convite e gerenciamento de usuários por organização

#### Módulo: CRM & WhatsApp
- **FR4:** O sistema deve integrar WhatsApp Business via QR Code ou código enviado ao número (biblioteca Baileys)
- **FR5:** O sistema deve permitir envio e recebimento de mensagens WhatsApp vinculadas a leads
- **FR6:** O sistema deve suportar criação e atribuição de tags em leads/contatos
- **FR7:** O sistema deve exibir o histórico completo de conversas WhatsApp por lead

#### Módulo: Funil & Kanban
- **FR8:** O sistema deve suportar múltiplos funis por organização, com etapas customizáveis (criar, editar, excluir, reordenar)
- **FR9:** O sistema deve exibir leads em visualização Kanban com drag-and-drop entre etapas
- **FR10:** O sistema deve registrar automaticamente VGV total do contrato e valor de recorrência mensal quando um lead é movido para a etapa "Venda Realizada"
- **FR11:** Ao marcar um lead como "Venda Realizada", o sistema deve criar automaticamente um Projeto ativo no módulo Projetos

#### Módulo: Projetos & Tarefas
- **FR12:** O módulo Projetos deve listar todos os clientes ativos com seus projetos vinculados
- **FR13:** O sistema deve permitir criação de presets de tarefas por tipo de serviço (ex: "Social Media", "Tráfego Pago", "Site")
- **FR14:** Cada tarefa deve conter: título, prazo, sprint semanal associado, usuário responsável e status
- **FR15:** Ao clicar em uma tarefa, deve ser possível inserir detalhamentos operacionais (descrição, observações da gestão para a operação)
- **FR16:** O sistema deve exibir sprints semanais com as tarefas do período

#### Módulo: Financeiro
- **FR17:** Ao realizar uma venda, o sistema deve criar automaticamente um projeto financeiro com o contrato e cronograma de pagamentos
- **FR18:** O módulo Financeiro deve permitir lançamento manual e automático de pagamentos (recorrentes ou únicos)
- **FR19:** O módulo Financeiro deve exibir VGV acumulado, receita mensal recorrente (MRR) e inadimplência

#### Módulo: Squad & Agentes
- **FR20:** O sistema deve possuir um painel de orquestração de squads e agentes de IA, permitindo visualizar, acionar e monitorar agentes em tempo real

### 2.2 Non-Functional Requirements

- **NFR1:** A interface deve ser 100% em modo dark (dark-first, paleta Agency Gold + Bronze)
- **NFR2:** O sistema deve garantir isolamento total de dados entre organizações (por organizacaoId em todos os models)
- **NFR3:** Atualizações em tempo real (mensagens WhatsApp, mudanças no kanban, status de agentes) via WebSocket/Socket.io
- **NFR4:** Design responsivo para desktop e mobile (Web Responsive, desktop-first)
- **NFR5:** Tempo de carregamento de páginas < 2 segundos em condições normais
- **NFR6:** Autenticação segura com JWT/sessions e proteção de rotas por role
- **NFR7:** Arquitetura preparada para escalar horizontalmente (stateless API + DB connection pooling)

---

## 3. User Interface Design Goals

### 3.1 Overall UX Vision

Uma plataforma de gestão de agência com visual profissional e denso em informação, inspirado em ferramentas como Linear, Notion e Monday.com — com identidade própria dark-first e paleta Agency Gold. A experiência deve ser fluida, sem fricção entre módulos, com transições suaves e hierarquia visual clara.

### 3.2 Key Interaction Paradigms

- **Drag-and-drop** no Kanban (etapas do funil, reordenação de tarefas)
- **Painéis laterais deslizantes** (slide-over) ao clicar em leads, tarefas ou projetos — sem navegação de página completa
- **Modais contextuais** para ações rápidas (adicionar tag, mover lead, criar tarefa)
- **Sidebar fixa** de navegação principal com ícones + labels colapsável
- **Notificações em tempo real** via toast não-intrusivo
- **Atalhos de teclado** para ações frequentes

### 3.3 Core Screens & Views

| # | Tela | Rota |
|---|------|------|
| 1 | Dashboard Principal | `/dashboard` |
| 2 | CRM / Funil (Kanban) | `/crm` |
| 3 | Lead Detail (slide-over) | — |
| 4 | Projetos | `/projetos` |
| 5 | Projeto Detail | `/projetos/[id]` |
| 6 | Tarefa Detail (slide-over) | — |
| 7 | Financeiro | `/financeiro` |
| 8 | Configurações do Funil | `/configuracoes/funis` |
| 9 | WhatsApp Connect | `/whatsapp` |
| 10 | Squad Dashboard | `/squad` |
| 11 | Configurações | `/configuracoes` |

### 3.4 Branding — Agency Gold + Bronze

```
Accent Principal:  #D4AF37  (Ouro clássico)
Accent Hover:      #F5CC50  (Ouro brilhante)
Accent Bronze:     #CD7F32  (Bronze — secundário)
Gradiente:         #D4AF37 → #CD7F32 (135deg)

Fundo Base:        #0A0A0A
Fundo Superfície:  #111111
Fundo Card:        #1A1A1A
Fundo Hover:       #222222
Borda Sutil:       #2A2A2A

Texto Principal:   #F5F5F5
Texto Secundário:  #A1A1A1
Texto Muted:       #525252

Status Verde:      #22C55E
Status Âmbar:      #F59E0B
Status Vermelho:   #EF4444
Status Azul:       #3B82F6
```

### 3.5 Accessibility

WCAG AA — contraste mínimo garantido em modo dark com paleta Agency Gold.

### 3.6 Target Platforms

Web Responsive — Desktop-first, com suporte mobile.

---

## 4. Technical Assumptions

### 4.1 Repository Structure

Monorepo — Next.js full-stack (API Routes + Frontend na mesma base de código).

### 4.2 Service Architecture

Monolith modular com servidor Socket.io separado (necessário para Baileys/WhatsApp).

### 4.3 Stack Completa

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js | 14 (App Router) |
| Linguagem | TypeScript | 5.x |
| ORM | Prisma | 5.x |
| Banco | PostgreSQL | 16 |
| Auth | NextAuth.js | 4.x |
| Realtime | Socket.io | 4.x |
| WhatsApp | Baileys | Latest |
| UI Base | shadcn/ui | Latest |
| Estilização | Tailwind CSS | 3.x |
| Drag & Drop | dnd-kit | Latest |
| Formulários | React Hook Form + Zod | Latest |
| Gráficos | Recharts | Latest |
| Ícones | Lucide React | Latest |
| Datas | date-fns | Latest |
| Testes | Vitest + Testing Library | Latest |
| Deploy | Vercel + Railway/Render (socket) | — |

### 4.4 Testing Requirements

- Unit tests para lógica de negócio crítica (conversão, VGV, lançamentos)
- Integration tests para API routes críticas
- Testes manuais para fluxo WhatsApp (QR Code)

### 4.5 Additional Technical Assumptions

- Isolamento multi-tenant por `organizacaoId` em todos os models Prisma
- Servidor Socket.io como processo Node.js separado do Next.js
- WhatsApp: uma sessão por organização (um número por agência)
- Path alias `@/*` mapeado para `src/*`
- Dark mode via classe `dark` no `html` — dark-first sem toggle obrigatório
- Variáveis de ambiente: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `NEXT_PUBLIC_SOCKET_URL`, `NEXT_PUBLIC_APP_URL`, `AIOS_API_URL`, `AIOS_API_KEY`

---

## 5. Epic List

| # | Epic | Objetivo |
|---|------|---------|
| 1 | Fundação & Infraestrutura | Setup, auth multi-tenant, layout dark Agency Gold, dashboard base |
| 2 | CRM & Kanban Multi-Funil | Leads, funis customizáveis, Kanban drag-and-drop, tags |
| 3 | Integração WhatsApp | QR Code/código, mensagens em tempo real, histórico por lead |
| 4 | Pipeline de Conversão & Automações | VGV, conversão automática lead→projeto→financeiro |
| 5 | Gestão de Projetos & Tarefas | Clientes ativos, presets, sprints, tarefas, detalhamentos |
| 6 | Módulo Financeiro | Contratos, lançamentos, MRR, inadimplência, dashboard financeiro |
| 7 | Squad & Agentes Dashboard | Orquestração visual de squads e agentes de IA |

---

## 6. Epic Details & Stories

---

### Epic 1: Fundação & Infraestrutura

**Objetivo:** Estabelecer toda a base técnica do sistema — projeto Next.js configurado, banco de dados com schema multi-tenant, autenticação com roles, layout dark Agency Gold e dashboard inicial. Ao final deste epic, qualquer desenvolvedor consegue fazer login, navegar pelo sistema e a fundação está pronta para todos os módulos seguintes.

#### Story 1.1 — Scaffold do Projeto
*Como desenvolvedor, quero o projeto Next.js configurado com todas as dependências base, para que eu possa iniciar o desenvolvimento dos módulos sem atrito de configuração.*

**Acceptance Criteria:**
1. Projeto Next.js 14 (App Router) com TypeScript criado e rodando em `localhost:3000`
2. Tailwind CSS configurado com tema `agency-gold` (tokens de cor: gold, bronze, dark surfaces) em `tailwind.config.ts`
3. shadcn/ui instalado e inicializado com tema dark customizado (Agency Gold como accent)
4. Aliases de path configurados (`@/*` → `src/*`)
5. ESLint + Prettier configurados com regras padrão
6. Estrutura de pastas criada: `src/app/`, `src/components/`, `src/lib/`, `src/types/`, `src/hooks/`
7. Variáveis de ambiente documentadas em `.env.example`

#### Story 1.2 — Database & Schema Multi-tenant
*Como sistema, quero um banco PostgreSQL com schema Prisma inicial, para que todos os dados sejam isolados por organização desde o início.*

**Acceptance Criteria:**
1. Prisma configurado com `DATABASE_URL` via `.env`
2. Schema inicial com models: `Organizacao` (id, nome, slug, createdAt), `Usuario` (id, nome, email, senha hash, role, organizacaoId)
3. Enum `Role`: `ADMIN`, `GESTOR`, `OPERACIONAL`
4. Migration inicial aplicada com sucesso (`prisma migrate dev`)
5. Seed básico criando 1 organização + 1 usuário admin para desenvolvimento
6. Prisma Client gerado e exportado de `src/lib/prisma.ts`
7. Scripts `npm run prisma:generate`, `npm run prisma:migrate`, `npm run prisma:seed` funcionando

#### Story 1.3 — Autenticação & Proteção de Rotas
*Como usuário, quero fazer login com email e senha, para que eu acesse apenas os dados da minha organização com as permissões do meu perfil.*

**Acceptance Criteria:**
1. NextAuth.js configurado com credentials provider (email + senha com bcrypt)
2. Session JWT contém: `userId`, `organizacaoId`, `role`, `nome`
3. Página de login em `/login` com design dark Agency Gold
4. Middleware protege todas as rotas exceto `/login`
5. Logout funcional — limpa sessão e redireciona para `/login`
6. Erro de credenciais inválidas exibido no formulário
7. Após login, redireciona para `/dashboard`

#### Story 1.4 — Layout Base & Sidebar de Navegação
*Como usuário autenticado, quero uma sidebar de navegação clara e elegante, para que eu acesse qualquer módulo do sistema com facilidade.*

**Acceptance Criteria:**
1. Layout base aplicado a todas as rotas autenticadas com sidebar fixa à esquerda
2. Sidebar contém links para: Dashboard, CRM, Projetos, Financeiro, WhatsApp, Squad, Configurações
3. Item ativo destacado com borda esquerda dourada (`#D4AF37`) e fundo sutil
4. Sidebar colapsável (ícone apenas / ícone + label)
5. Nome do usuário e organização exibidos no rodapé com avatar em gradiente gold→bronze
6. Tema 100% dark: fundo sidebar `#111111`, fundo page `#0A0A0A`
7. Layout responsivo: sidebar vira menu hambúrguer em mobile

#### Story 1.5 — Dashboard Principal (KPIs Base)
*Como gestor, quero visualizar os principais indicadores da agência na tela inicial, para que eu tenha visão geral do negócio ao fazer login.*

**Acceptance Criteria:**
1. Dashboard em `/dashboard` com KPI cards: VGV Total, MRR, Leads Ativos, Tarefas do Dia
2. Cards com design dark, valor em dourado `#D4AF37` e label em texto muted
3. Valores buscados de queries reais no banco
4. Seção "Atividade Recente" com últimas ações
5. Seção "Tarefas do Dia" listando tarefas com prazo para hoje do usuário logado
6. Skeleton loading state enquanto dados carregam
7. Página completamente responsiva

---

### Epic 2: CRM & Kanban Multi-Funil

**Objetivo:** Construir o núcleo comercial da plataforma — gestão de leads, múltiplos funis com etapas customizáveis, visualização Kanban com drag-and-drop e sistema de tags. Ao final deste epic, a equipe comercial opera seu pipeline de vendas inteiramente dentro da plataforma.

#### Story 2.1 — Schema & API: Funis, Etapas e Leads
*Como sistema, quero os models de banco e endpoints de API para funis, etapas e leads, para que os módulos de UI possam consumir dados reais.*

**Acceptance Criteria:**
1. Prisma models: `Funil` (id, nome, descricao, organizacaoId, ordem), `EtapaFunil` (id, nome, cor, ordem, funilId), `Lead` (id, nome, email, telefone, empresa, etapaId, funilId, organizacaoId, createdAt, updatedAt)
2. API routes RESTful: `GET/POST /funis`, `GET/PUT/DELETE /funis/[id]`, CRUD `/etapas`, CRUD `/leads`, `PATCH /leads/[id]/etapa`
3. Todos os endpoints validam `organizacaoId` da sessão
4. Validação de inputs com Zod em todas as rotas
5. Migration aplicada com sucesso
6. Seed com 1 funil "Funil Principal" e 4 etapas padrão: Novo Lead, Qualificado, Proposta Enviada, Negociação

#### Story 2.2 — Configuração de Funis & Etapas (UI)
*Como gestor, quero criar e personalizar meus funis de vendas com etapas customizáveis, para que o pipeline reflita o processo real da agência.*

**Acceptance Criteria:**
1. Página `/configuracoes/funis` lista todos os funis da organização
2. Modal de criação/edição de funil com campos: nome e descrição
3. Drag-and-drop para reordenação de etapas (dnd-kit)
4. Cada etapa tem: nome editável inline, seletor de cor (8 opções incluindo gold/bronze), botão excluir
5. Botão "Nova Etapa" adiciona etapa ao final da lista
6. Etapa com leads não pode ser excluída (erro amigável)
7. Múltiplos funis com seletor de funil ativo no topo do Kanban
8. Operações refletem em tempo real sem reload

#### Story 2.3 — Visualização Kanban com Drag-and-Drop
*Como usuário, quero visualizar meus leads em formato Kanban organizado por etapas, para que eu tenha visão clara do pipeline e mova leads entre etapas com facilidade.*

**Acceptance Criteria:**
1. Página `/crm` exibe Kanban com colunas por etapas do funil ativo
2. Seletor de funil no topo para alternar entre funis
3. Cada coluna exibe: nome da etapa, cor, contador de leads e soma de VGV
4. Cards de lead: nome, empresa, telefone, tags (badges), avatar com iniciais
5. Drag-and-drop funcional entre colunas (dnd-kit) com chamada à API
6. Optimistic update com rollback em caso de erro
7. Colunas com scroll vertical independente
8. Design dark: colunas `#1A1A1A`, cards `#222222`

#### Story 2.4 — CRUD de Leads & Slide-over de Detalhes
*Como vendedor, quero criar leads e visualizar/editar seus detalhes em um painel lateral, para que eu registre e gerencie contatos sem perder o contexto do Kanban.*

**Acceptance Criteria:**
1. Botão "Novo Lead" abre modal com campos: nome, email, telefone, empresa, funil, etapa inicial
2. Lead criado aparece imediatamente no Kanban
3. Clicar em card abre slide-over à direita com todos os dados
4. Slide-over: dados editáveis inline, etapa atual, tags, histórico de movimentações
5. Save automático (debounce 800ms) ou botão "Salvar"
6. Botão "Excluir Lead" com confirmação
7. Slide-over fecha com ESC ou clique fora
8. Responsivo: slide-over 100% em mobile

#### Story 2.5 — Sistema de Tags em Leads
*Como usuário, quero criar e atribuir tags coloridas aos leads, para que eu filtre e categorize o pipeline.*

**Acceptance Criteria:**
1. Model `Tag` (id, nome, cor, organizacaoId) + `LeadTag` (leadId, tagId) criados e migrados
2. Campo de tags no slide-over com autocomplete e opção "Criar tag: X"
3. Tags com seletor de cor (8 opções)
4. Tags exibidas como badges no slide-over e nos cards do Kanban
5. Filtro por tag no topo do Kanban
6. Página de gerenciamento em `/configuracoes/tags` com CRUD completo

---

### Epic 3: Integração WhatsApp

**Objetivo:** Conectar a plataforma ao WhatsApp Business via Baileys, permitindo que a equipe envie e receba mensagens diretamente no CRM, com histórico completo vinculado a cada lead.

#### Story 3.1 — Servidor Socket.io + Baileys (Backend)
*Como sistema, quero um servidor Node.js dedicado com Baileys e Socket.io, para que a conexão WhatsApp seja persistente e eventos de mensagem sejam transmitidos em tempo real.*

**Acceptance Criteria:**
1. Arquivo `server/socket-server.js` com servidor Socket.io standalone
2. Baileys integrado: inicializa sessão WhatsApp por `organizacaoId`
3. Auth state persistido em `server/sessions/{organizacaoId}/`
4. Eventos Socket.io: `qr`, `connected`, `disconnected`, `message:new`
5. Model `Mensagem` criado: id, corpo, fromMe, timestamp, whatsappId, telefoneContato, leadId (nullable), organizacaoId
6. `npm run socket` inicia o servidor corretamente
7. Variáveis `SOCKET_PORT`, `NEXT_PUBLIC_SOCKET_URL` documentadas

#### Story 3.2 — Página de Conexão WhatsApp (QR Code & Código)
*Como admin, quero conectar o WhatsApp da agência via QR Code ou código enviado ao celular, para que a integração fique ativa com o número oficial.*

**Acceptance Criteria:**
1. Página `/whatsapp` acessível apenas por `ADMIN`
2. Estado inicial: botão "Conectar WhatsApp" → emite evento e aguarda QR
3. QR Code exibido como imagem base64 com instruções — atualiza automaticamente se expirar
4. Opção "Conectar via Código": campo de número → código enviado → campo para inserir código
5. Ao conectar: exibe número, foto de perfil e badge "Conectado"
6. Botão "Desconectar" com confirmação
7. Status visível na sidebar (ícone WhatsApp com indicador verde/vermelho)
8. Reconexão automática se sessão salva existir

#### Story 3.3 — Vinculação de Mensagens a Leads
*Como sistema, quero identificar automaticamente qual lead corresponde a uma mensagem recebida, para que o histórico fique organizado no perfil correto.*

**Acceptance Criteria:**
1. Mensagem recebida → busca lead por telefone na mesma organização
2. Lead encontrado: mensagem salva com `leadId` preenchido
3. Lead não encontrado: mensagem salva com `leadId = null` → aparece em `/whatsapp/nao-identificadas`
4. Página de não-identificadas com opções "Vincular a Lead" ou "Criar novo Lead"
5. Ao vincular: mensagens anteriores associadas retroativamente
6. Toast de notificação com nome do lead ao receber mensagem
7. Badge de não lidas no card do lead no Kanban

#### Story 3.4 — Interface de Chat no Slide-over do Lead
*Como vendedor, quero enviar e receber mensagens WhatsApp diretamente no painel do lead, para que toda a comunicação fique centralizada.*

**Acceptance Criteria:**
1. Aba "WhatsApp" no slide-over com histórico completo em ordem cronológica
2. Mensagens enviadas: alinhadas à direita, fundo dourado sutil; recebidas: à esquerda, fundo `#2A2A2A`
3. Cada mensagem: corpo, horário, status (ícones)
4. Campo de texto fixo no rodapé — `Enter` envia, `Shift+Enter` quebra linha
5. Novas mensagens via Socket.io em tempo real
6. Scroll automático para mensagem mais recente
7. Indicador "digitando..." (evento Baileys `presence`)
8. Paginação: 50 mensagens iniciais, botão "Carregar mais"

#### Story 3.5 — Notificações e Status de Leitura
*Como usuário, quero receber notificações de novas mensagens e visualizar leads com mensagens não lidas.*

**Acceptance Criteria:**
1. Toast ao receber mensagem: foto, nome do lead, preview — clique abre slide-over
2. Badge de não lidas no card do lead no Kanban
3. Badge global no ícone WhatsApp da sidebar
4. Ao abrir aba WhatsApp: mensagens marcadas como lidas (`sendReadReceipt`)
5. Filtro no Kanban: "Somente leads com mensagens não lidas"
6. Página `/whatsapp` com lista de conversas ativas ordenadas por última mensagem

---

### Epic 4: Pipeline de Conversão & Automações

**Objetivo:** Implementar o coração do sistema — o evento de conversão que transforma um lead em cliente, disparando automaticamente a criação do projeto operacional e do contrato financeiro.

#### Story 4.1 — Schema: Modelos de Conversão, Projeto e Financeiro
*Como sistema, quero os models de banco para conversão de leads, projetos e contratos financeiros.*

**Acceptance Criteria:**
1. Campos adicionados ao `Lead`: `status` enum (ATIVO, VENDA_REALIZADA, PERDIDO), `vgvTotal` (Decimal), `recorrenciaMensal` (Decimal nullable), `dataConversao` (DateTime nullable)
2. Model `Projeto`: id, nome, leadId (FK), organizacaoId, tipoServico, status enum (ATIVO, PAUSADO, CONCLUIDO, CANCELADO), createdAt, updatedAt
3. Model `ContratoFinanceiro`: id, projetoId (FK), leadId (FK), organizacaoId, valorTotal, recorrenciaMensal, tipoPagamento enum (RECORRENTE, PARCELADO, AVULSO), dataInicio, numeroParcelas, createdAt
4. Model `Lancamento`: id, contratoId (FK), organizacaoId, descricao, valor, dataVencimento, status enum (PENDENTE, PAGO, ATRASADO), tipo enum (RECORRENTE, UNICO), createdAt
5. Migrations aplicadas; seed com exemplo completo de conversão

#### Story 4.2 — Modal de Registro de Venda
*Como vendedor, quero um formulário ao mover lead para "Venda Realizada", para que eu registre todos os dados comerciais do negócio fechado.*

**Acceptance Criteria:**
1. Modal automático ao arrastar lead para etapa "Venda Realizada" (flag configurável)
2. Campos obrigatórios: VGV Total, Tipo de Pagamento, Data de Início, Tipo de Serviço
3. Se Recorrente: Valor Mensal + Dia de Vencimento
4. Se Parcelado: Número de Parcelas + Valor por Parcela (auto-calculado)
5. Se Avulso: Valor Total + Data de Vencimento única
6. Preview do cronograma de pagamentos gerado
7. "Cancelar" → lead volta à etapa anterior
8. "Confirmar Venda" → dispara automações
9. Validação completa de campos

#### Story 4.3 — Automação: Criação de Projeto no Módulo Projetos
*Como sistema, quero criar automaticamente um projeto ativo ao confirmar uma venda.*

**Acceptance Criteria:**
1. API route `POST /api/conversao` executa conversão em transação Prisma atômica
2. `Lead.status` → VENDA_REALIZADA, `dataConversao` e `vgvTotal` preenchidos
3. `Projeto` criado: nome = `[Empresa] — [Tipo de Serviço]`, status = ATIVO
4. Projeto visível imediatamente em `/projetos`
5. Card do lead exibe badge "VENDA" em gradiente gold→bronze
6. Lead convertido não pode ser movido para outras etapas
7. Toast de sucesso: "🏆 Venda registrada! Projeto criado para [Cliente]"
8. Falha reverte transação completamente

#### Story 4.4 — Automação: Criação de Contrato + Lançamentos
*Como sistema, quero gerar automaticamente o contrato financeiro e cronograma de pagamentos ao confirmar uma venda.*

**Acceptance Criteria:**
1. `ContratoFinanceiro` criado na mesma transação da Story 4.3
2. Lançamentos gerados conforme tipo: Recorrente (12 mensais), Parcelado (N parcelas), Avulso (1 único)
3. Todos os lançamentos criados com status `PENDENTE`
4. Contrato vinculado ao `Projeto` e ao `Lead`
5. Lançamentos visíveis em `/financeiro` imediatamente
6. Lançamentos com vencimento passado → status `ATRASADO` automaticamente

#### Story 4.5 — Atualização de KPIs: VGV Total & MRR no Dashboard
*Como gestor, quero que o Dashboard reflita automaticamente VGV e MRR após cada venda.*

**Acceptance Criteria:**
1. KPI "VGV Total": soma de `vgvTotal` de leads VENDA_REALIZADA da organização
2. KPI "MRR": soma de `recorrenciaMensal` de contratos RECORRENTE ativos
3. KPI "Taxa de Conversão": leads VENDA_REALIZADA ÷ total de leads do mês
4. Valores atualizados via revalidação após conversão
5. Variação percentual vs mês anterior (seta verde/vermelha)
6. Seção "Últimas Vendas": 5 conversões mais recentes com nome, VGV e data

---

### Epic 5: Gestão de Projetos & Tarefas

**Objetivo:** Construir o módulo operacional — onde projetos dos clientes ganham vida com sprints semanais, presets de tarefas e detalhamentos operacionais passados da gestão para a equipe de execução.

#### Story 5.1 — Schema: Tarefas, Sprints, Detalhamentos & Presets
*Como sistema, quero os models de banco para tarefas, sprints, detalhamentos e presets de serviço.*

**Acceptance Criteria:**
1. Model `Sprint`: id, projetoId (FK), nome, dataInicio, dataFim, organizacaoId
2. Model `Tarefa`: id, titulo, descricao, projetoId (FK), sprintId (FK nullable), responsavelId (FK), status enum (PENDENTE, EM_ANDAMENTO, CONCLUIDA, BLOQUEADA), prazo, ordem, organizacaoId, createdAt, updatedAt
3. Model `Detalhamento`: id, tarefaId (FK), conteudo (Text), autorId (FK), createdAt, updatedAt
4. Model `PresetServico`: id, nome, organizacaoId
5. Model `PresetTarefa`: id, presetServicoId (FK), titulo, descricao, ordemPadrao
6. API routes CRUD para todos os models
7. Seed com 2 presets: "Social Media" (8 tarefas), "Tráfego Pago" (6 tarefas)

#### Story 5.2 — Módulo Projetos: Listagem de Clientes Ativos
*Como gestor, quero visualizar todos os projetos e clientes ativos em uma tela centralizada.*

**Acceptance Criteria:**
1. Página `/projetos` lista projetos com `status = ATIVO`
2. Card de projeto: nome do cliente, tipo de serviço (badge dourado), data de início, progresso de tarefas (barra gold→bronze), responsável, valor mensal
3. Filtros: por tipo de serviço, por responsável, por status
4. Busca por nome do cliente
5. Alternância Grid / Lista
6. Clicar navega para `/projetos/[id]`
7. Indicador visual de projetos com tarefas atrasadas (borda vermelha)

#### Story 5.3 — Presets de Tarefas por Tipo de Serviço
*Como gestor, quero criar presets de tarefas para cada serviço, para aplicar com um clique em novos projetos.*

**Acceptance Criteria:**
1. Página `/configuracoes/presets` com CRUD completo de presets
2. Cada preset tem nome e lista de tarefas com drag-and-drop para reordenar
3. Botão "Aplicar Preset" no projeto abre modal com seleção de preset
4. Aplicar preset: tarefas criadas em bulk, ordem preservada
5. Opção de aplicar parcialmente (checkboxes por tarefa)
6. Duplicar preset existente para criar variações

#### Story 5.4 — Gestão de Tarefas com Sprints Semanais & Responsáveis
*Como gestor, quero organizar tarefas em sprints semanais e atribuir responsáveis.*

**Acceptance Criteria:**
1. Página `/projetos/[id]` com tarefas organizadas por sprint em seções expansíveis
2. Seção "Sem Sprint" para tarefas não alocadas — arrastar para sprint
3. Criar sprint: modal com nome, data início e data fim
4. Cada tarefa: checkbox de conclusão, título, prazo, avatar do responsável, badge de status
5. Drag-and-drop entre sprints e reordenação interna
6. Tarefas atrasadas com prazo em vermelho e ícone de alerta
7. Sprint atual com borda gold e badge "Sprint Ativa"
8. Botão "+ Tarefa" em cada sprint (adição inline)

#### Story 5.5 — Detalhamentos de Tarefas (Slide-over Operacional)
*Como membro da equipe, quero abrir uma tarefa e visualizar detalhamentos da gestão.*

**Acceptance Criteria:**
1. Clicar no título da tarefa abre slide-over à direita
2. Seção de informações: status, responsável, sprint, prazo (todos editáveis)
3. Seção "Detalhamentos": editor rich text para instruções da gestão
4. Múltiplos detalhamentos em ordem cronológica (feed com autor e data)
5. Botão "Adicionar Detalhamento" com editor inline
6. Histórico de mudanças de status no rodapé
7. Sincronização via Socket.io em tempo real
8. `Ctrl+Enter` salva, `ESC` fecha

---

### Epic 6: Módulo Financeiro

**Objetivo:** Construir o controle financeiro completo — contratos, lançamentos, dashboard com VGV/MRR/inadimplência e alertas de vencimento, com dados alimentados automaticamente pelas vendas do CRM.

#### Story 6.1 — Listagem de Contratos & Lançamentos
*Como gestor financeiro, quero visualizar todos os contratos e lançamentos de pagamento.*

**Acceptance Criteria:**
1. Página `/financeiro` com tabs: "Contratos", "Lançamentos", "Dashboard"
2. Tab "Contratos": lista com cliente, tipo, VGV, pagamento, recorrência, data, status
3. Expandir contrato: lista de lançamentos vinculados
4. Tab "Lançamentos": filtros por status, mês e cliente
5. ATRASADOS com fundo vermelho sutil; vencendo em 7 dias com borda âmbar
6. Totalizadores: Total Pendente, Total Atrasado, Total Pago no Mês
7. Clicar no cliente navega para `/projetos/[id]`

#### Story 6.2 — Gestão de Lançamentos: Receber, Editar & Criar
*Como gestor financeiro, quero marcar pagamentos como recebidos, editar e criar lançamentos.*

**Acceptance Criteria:**
1. "Marcar como Pago": modal com data de recebimento e valor recebido
2. Ao confirmar: lançamento → status PAGO
3. Editar lançamento: modal com campos editáveis
4. Excluir lançamento PENDENTE com confirmação (PAGO não pode ser excluído)
5. Criar lançamento avulso: botão "+ Lançamento" com formulário completo
6. Criar contrato manualmente: botão "+ Contrato"
7. Alterações refletem nos KPIs em tempo real

#### Story 6.3 — Dashboard Financeiro: VGV, MRR & Inadimplência
*Como gestor, quero um dashboard financeiro com gráficos e indicadores chave.*

**Acceptance Criteria:**
1. KPI cards: VGV Total Acumulado, MRR Atual, Total Recebido no Mês, Total em Aberto, Taxa de Inadimplência
2. Cards com valor dourado, variação vs mês anterior
3. Gráfico de barras "Recebimentos por Mês" (12 meses) — gradiente gold→bronze
4. Gráfico de linha "MRR Histórico" (12 meses) — linha dourada
5. Gráfico de donut "Status dos Lançamentos"
6. Tabela "Top 5 Clientes por VGV"
7. Seção "Próximos Vencimentos" (15 dias)
8. Seção "Inadimplentes" com dias de atraso

#### Story 6.4 — Edição de Contratos & Renegociação
*Como gestor financeiro, quero editar contratos e renegociar condições de pagamento.*

**Acceptance Criteria:**
1. "Editar Contrato": modal com campos editáveis
2. Alterar recorrência: opção "Aplicar para próximos lançamentos"
3. Renegociar: cria novo contrato, encerra anterior, cancela PENDENTES do antigo
4. Histórico de alterações do contrato
5. Encerrar contrato com motivo (CONCLUIDO, CANCELADO, INADIMPLENTE)
6. Ao encerrar: lançamentos PENDENTES → CANCELADO

#### Story 6.5 — Alertas de Vencimento & Notificações Financeiras
*Como gestor financeiro, quero alertas automáticos sobre vencimentos e inadimplências.*

**Acceptance Criteria:**
1. Badge no ícone Financeiro: vencendo hoje + atrasados
2. Toast automático ao login se houver atrasados
3. Painel de notificações financeiras via ícone de sino
4. Badge "Vence Hoje" em âmbar nos lançamentos
5. Atualização automática de PENDENTE → ATRASADO quando vencimento passa
6. Filtro rápido "Ver Inadimplentes"
7. Exportação para CSV

---

### Epic 7: Squad & Agentes Dashboard

**Objetivo:** Construir o diferencial estratégico — painel de orquestração visual de squads e agentes de IA integrado nativamente, permitindo visualizar, acionar e monitorar agentes em tempo real sem sair da plataforma.

#### Story 7.1 — Schema: Squads, Agentes & Execuções
*Como sistema, quero os models de banco para squads, agentes e histórico de execuções.*

**Acceptance Criteria:**
1. Model `Squad`: id, nome, descricao, avatar, cor, organizacaoId, ativo, createdAt
2. Model `Agente`: id, nome, role, icone, descricao, squadId (FK), organizacaoId, status enum (DISPONIVEL, EM_EXECUCAO, INATIVO, ERRO), configuracao (JSON), createdAt
3. Model `Execucao`: id, agenteId (FK), organizacaoId, comando, input (JSON nullable), output (Text nullable), status enum (PENDENTE, EM_ANDAMENTO, CONCLUIDA, FALHA), iniciadoEm, concluidoEm, duracaoMs, usuarioId (FK)
4. Model `LogExecucao`: id, execucaoId (FK), nivel enum (INFO, WARN, ERROR, SUCCESS), mensagem, timestamp
5. API routes CRUD: `/api/squads`, `/api/agentes`, `/api/execucoes`
6. Seed com squad "Core Agency" e agentes padrão
7. Variáveis `AIOS_API_URL` e `AIOS_API_KEY` documentadas

#### Story 7.2 — Dashboard Visual de Squads
*Como gestor, quero visualizar todos os squads e agentes em um painel centralizado.*

**Acceptance Criteria:**
1. Página `/squad` com grid de cards de squads
2. Card: avatar, nome, descrição, contagem de agentes, status geral
3. Expandir card: lista de agentes com ícone, nome, status badge, última execução
4. Status atualiza via Socket.io (polling 15s como fallback)
5. Métricas: Total de Agentes Ativos, Execuções Hoje, Taxa de Sucesso, Tempo Médio
6. Agentes com ERRO com borda vermelha pulsante
7. Filtro por status
8. Botões "+ Novo Squad" e "+ Novo Agente"

#### Story 7.3 — Painel de Agente Individual
*Como gestor, quero abrir o perfil de um agente e visualizar configurações, histórico e logs.*

**Acceptance Criteria:**
1. Slide-over com: nome, role, squad, status atual, configurações (JSON editável)
2. Aba "Histórico": últimas 20 execuções — comando, status, duração, usuário, timestamp
3. Aba "Logs em Tempo Real": stream via Socket.io com cores por nível
4. Aba "Configurações": modelo de IA, temperatura, max tokens, prompt de sistema
5. Botão "Forçar Disponível" com confirmação
6. Botão "Desativar Agente"
7. Gráfico mini "Execuções por Dia" (7 dias)
8. Taxa de sucesso com cor: gold ≥ 90%, âmbar 70-89%, vermelho < 70%

#### Story 7.4 — Orquestração: Acionar Agentes & Monitorar Execuções
*Como gestor, quero acionar agentes e acompanhar execução em tempo real.*

**Acceptance Criteria:**
1. Botão "Acionar Agente" em agentes DISPONÍVEL → modal de execução
2. Modal: campo de comando, contexto (lead/projeto/genérico), parâmetros adicionais
3. Ao acionar: `Execucao` criada; toast "▶ Agente acionado"
4. Painel lateral "Execuções Ativas" com progresso e logs em streaming
5. Toast de resultado ao concluir (verde) ou falhar (vermelho) com preview do output
6. Output salvo em `Execucao.output` — acessível no histórico
7. Cancelar execução PENDENTE ou EM_ANDAMENTO
8. Agente retorna a DISPONIVEL ao concluir ou falhar

#### Story 7.5 — Integração AIOS: API & Webhook para Agentes Externos
*Como sistema, quero endpoints de API e webhooks para comunicação com agentes AIOS externos.*

**Acceptance Criteria:**
1. `POST /api/aios/webhook`: recebe eventos autenticados via `AIOS_API_KEY`
2. Eventos suportados: `execucao:iniciada`, `execucao:log`, `execucao:concluida`, `execucao:falha`
3. Webhook atualiza banco e emite evento Socket.io em tempo real
4. `GET /api/aios/agentes`: lista agentes com status atual
5. `POST /api/aios/execucoes`: agente externo registra execução e recebe `execucaoId`
6. Painel `/squad/integracoes`: URL do webhook, API Key (mascarada), instruções com curl de exemplo
7. Log de webhooks dos últimos 7 dias com status de processamento

---

## 7. Risks & Mitigations

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Baileys quebrar com atualizações do WhatsApp | Alta | Alto | Monitorar releases, manter fallback QR + código |
| Performance do Kanban com muitos leads | Média | Médio | Paginação virtual (react-window), limitar a 100 leads por coluna |
| Complexidade da transação atômica de conversão | Baixa | Alto | Testes unitários rigorosos na lógica de conversão |
| Sessão WhatsApp desconectar em produção | Alta | Médio | Reconexão automática + alerta de status na sidebar |
| Custo de execuções de agentes de IA | Média | Médio | Limitar por organização, exibir custo estimado antes de acionar |

---

## 8. Next Steps

### Prompt para @architect

Com o PRD aprovado, inicie a criação da arquitetura técnica detalhada. Foque em:
1. Schema Prisma completo com todos os relacionamentos
2. Estrutura de pastas do projeto Next.js 14 (App Router)
3. Estratégia de isolamento multi-tenant
4. Arquitetura do servidor Socket.io + Baileys
5. Plano de migrations sequenciais por epic

Use este PRD como input único. Não invente requisitos fora dos documentados aqui.

### Prompt para @ux-design-expert

Com o PRD aprovado, crie o design system e especificação de UI:
1. Componentes shadcn/ui customizados com paleta Agency Gold + Bronze
2. Tokens Tailwind para `agency-gold` e `agency-bronze`
3. Especificação dos slide-overs principais (Lead, Tarefa, Agente)
4. Layout da sidebar e sistema de navegação
5. Dark theme aplicado consistentemente em todos os componentes

---

*Documento gerado pelo Synkra AIOS — Orion (@aios-master) | 2026-02-22*
*35 stories | 7 epics | Stack: Next.js 14 + TypeScript + Prisma + PostgreSQL + Socket.io + Baileys*
