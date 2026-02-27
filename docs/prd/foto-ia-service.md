# PRD — FotoIA: Serviço Automatizado de Fotos Profissionais por IA

**Versão:** 1.0
**Data:** 2026-02-23
**Autor:** Morgan (PM Agent)
**Status:** Draft → Aprovado para desenvolvimento
**Epic:** Epic 8 — FotoIA Automated Sales & Delivery Service

---

## 1. Visão do Produto

### 1.1 Problema

Agências de marketing enfrentam alta demanda por conteúdo visual profissional (fotos de produto, retratos corporativos, imagens para redes sociais) com baixo orçamento de produção. A produção fotográfica tradicional exige:
- Agendamento de sessões (dias de espera)
- Fotógrafo profissional (custo alto)
- Pós-produção manual (editor)
- Entrega demorada (3-7 dias úteis)

### 1.2 Solução

O **FotoIA** é um módulo integrado ao sistema de gestão da agência que automatiza completamente o ciclo de vendas e entrega de fotos profissionais geradas por Inteligência Artificial:

1. Lead entra pelo tráfego pago → capturado no CRM com pipeline dedicado
2. Agente de IA conduz a venda via WhatsApp (preço, benefícios, follow-up)
3. Link de pagamento enviado automaticamente
4. Confirmação de pagamento detectada → produção inicia automaticamente
5. Imagens geradas por IA (Stable Diffusion / DALL-E / Replicate)
6. Cliente recebe as fotos para aprovação via WhatsApp
7. Ajustes realizados se necessário → entrega final

**Tudo automatizado. Zero intervenção humana no fluxo padrão.**

### 1.3 Proposta de Valor

| Para | O FotoIA oferece |
|------|-----------------|
| Agência | Receita recorrente 24/7 sem equipe de vendas humana |
| Cliente | Fotos profissionais em menos de 1h por preço acessível |
| Gestor | Dashboards com conversão, receita e produção em tempo real |

---

## 2. Público-Alvo

### Usuário Primário: Gestor da Agência
- Configura o serviço e monitora via dashboard
- Define preços, prompts de IA, templates de mensagem WhatsApp
- Visualiza métricas de conversão e faturamento

### Usuário Final: Cliente do Serviço FotoIA
- Pequenas e médias empresas buscando conteúdo visual
- Profissionais liberais (advogados, médicos, consultores)
- E-commerce precisando de fotos de produto
- Qualquer lead captado via tráfego pago

---

## 3. Escopo do Produto

### 3.1 IN SCOPE (Épico 8)

- Pipeline CRM dedicado para FotoIA (11 etapas)
- Squad IA com 4 agentes automatizados (Vendedor, Cobrador, Produtor, Entregador)
- Integração com gateway de pagamento (Asaas ou Mercado Pago)
- Integração com API de geração de imagens (Replicate / Stability AI)
- Dashboard de gestão FotoIA (pedidos, receita, conversão)
- Módulo de configuração (preços, prompts, templates)
- Galeria de entrega e aprovação do cliente
- Relatórios de performance

### 3.2 OUT OF SCOPE (Épico 8)

- App mobile para clientes
- Integração com Instagram/Meta Ads diretamente
- Editor de imagens integrado (cliente baixa e edita externamente)
- Multi-agência (apenas para a agência logada)
- Suporte a vídeos gerados por IA (roadmap futuro)

---

## 4. Pipeline CRM FotoIA

O pipeline é separado do CRM principal e exclusivo para leads FotoIA.

### Etapas do Pipeline

| # | Nome da Etapa | Ação Automática | Responsável |
|---|--------------|----------------|-------------|
| 1 | **Novo Lead** | Agente Vendedor inicia conversa WhatsApp | Squad Vendedor |
| 2 | **Em Qualificação** | Coleta: nome, empresa, tipo de foto desejada | Squad Vendedor |
| 3 | **Proposta Enviada** | Envia preço + portfolio de exemplos | Squad Vendedor |
| 4 | **Follow-up 1** | 24h após proposta sem resposta | Squad Vendedor |
| 5 | **Follow-up 2** | 48h após proposta sem resposta (último) | Squad Vendedor |
| 6 | **Aguardando Pagamento** | Envia link de pagamento via WhatsApp | Squad Cobrador |
| 7 | **Pagamento Confirmado** | Webhook detecta pagamento → inicia produção | Squad Cobrador |
| 8 | **Em Produção** | API de IA gera as imagens (3-10 min) | Squad Produtor |
| 9 | **Aguardando Aprovação** | Envia galeria de fotos ao cliente | Squad Entregador |
| 10 | **Em Revisão** | Cliente solicitou ajustes (máx 2 rodadas) | Squad Produtor |
| 11 | **Entregue** ✓ | Entrega final confirmada, lead → Cliente | Sistema |

### Regras de Automação

- **Lead sem resposta após 72h nos follow-ups:** mover para "Perdido" (etapa oculta)
- **Pagamento não confirmado em 48h:** reenviar link + mensagem de urgência
- **Aprovação do cliente:** mover automaticamente para "Entregue" ao confirmar
- **Máximo 2 rodadas de revisão:** cobrar taxa extra na 3ª revisão (configurável)

---

## 5. Arquitetura do Squad FotoIA

### Squad: `foto-ia-squad`

```
foto-ia-squad/
├── squad.yaml                    # Manifest do squad
├── agents/
│   ├── vendedor-ia.yaml          # Agente de vendas via WhatsApp
│   ├── cobrador-ia.yaml          # Agente de cobrança e pagamentos
│   ├── produtor-ia.yaml          # Agente de geração de imagens
│   └── entregador-ia.yaml        # Agente de entrega e aprovação
├── tasks/
│   ├── qualificar-lead.md        # Task: coletar dados e qualificar
│   ├── enviar-proposta.md        # Task: enviar preço e exemplos
│   ├── fazer-followup.md         # Task: follow-up automático
│   ├── enviar-link-pgto.md       # Task: gerar e enviar link de pagamento
│   ├── confirmar-pagamento.md    # Task: verificar webhook de pagamento
│   ├── gerar-imagens.md          # Task: chamar API de IA para geração
│   ├── enviar-para-aprovacao.md  # Task: enviar galeria ao cliente
│   ├── processar-revisao.md      # Task: gerar imagens ajustadas
│   └── entregar-servico.md       # Task: confirmar entrega final
├── workflows/
│   ├── sales-funnel.yaml         # Workflow completo de vendas
│   ├── producao-imagens.yaml     # Workflow de produção
│   └── entrega-aprovacao.yaml    # Workflow de entrega
├── templates/
│   ├── whatsapp-saudacao.md      # Template msg boas-vindas
│   ├── whatsapp-proposta.md      # Template msg proposta
│   ├── whatsapp-followup-1.md    # Template follow-up 1
│   ├── whatsapp-followup-2.md    # Template follow-up 2
│   ├── whatsapp-link-pgto.md     # Template msg link pagamento
│   ├── whatsapp-producao.md      # Template msg em produção
│   ├── whatsapp-aprovacao.md     # Template msg aguardando aprovação
│   └── whatsapp-entrega.md       # Template msg entrega final
└── data/
    ├── precos.yaml               # Tabela de preços configurável
    ├── prompts-ia.yaml           # Prompts para geração de imagens
    └── portfolio-exemplos.yaml   # Links de exemplos para proposta
```

### Agentes do Squad

#### 1. Agente Vendedor IA
- **Responsabilidade:** Conduzir a venda do primeiro contato até aceite
- **Tarefas:** qualificar-lead, enviar-proposta, fazer-followup (1 e 2)
- **Integração:** WhatsApp (Baileys), CRM (pipeline FotoIA)
- **Lógica:** Personaliza mensagens com nome do lead e tipo de serviço

#### 2. Agente Cobrador IA
- **Responsabilidade:** Processar pagamentos
- **Tarefas:** enviar-link-pgto, confirmar-pagamento
- **Integração:** Gateway de pagamento (Asaas/Mercado Pago), WhatsApp
- **Lógica:** Gera cobrança via API, aguarda webhook de confirmação

#### 3. Agente Produtor IA
- **Responsabilidade:** Gerar imagens via IA
- **Tarefas:** gerar-imagens, processar-revisao
- **Integração:** Replicate API / Stability AI / OpenAI DALL-E
- **Lógica:** Usa prompts configuráveis + dados do cliente para personalização

#### 4. Agente Entregador IA
- **Responsabilidade:** Enviar e confirmar entrega
- **Tarefas:** enviar-para-aprovacao, entregar-servico
- **Integração:** WhatsApp, Storage (S3/local), CRM
- **Lógica:** Gera links temporários para galeria, coleta confirmação do cliente

---

## 6. Modelos de Dados (Prisma)

### Novos Models

```prisma
enum StatusPedidoFoto {
  NOVO_LEAD
  EM_QUALIFICACAO
  PROPOSTA_ENVIADA
  FOLLOWUP_1
  FOLLOWUP_2
  AGUARDANDO_PAGAMENTO
  PAGAMENTO_CONFIRMADO
  EM_PRODUCAO
  AGUARDANDO_APROVACAO
  EM_REVISAO
  ENTREGUE
  CANCELADO
  PERDIDO
}

enum TipoFotoIA {
  RETRATO_PROFISSIONAL
  FOTO_PRODUTO
  FOTO_CORPORATIVA
  BANNER_REDES_SOCIAIS
  FOTO_PERFIL
  CUSTOM
}

model PedidoFotoIA {
  id              String          @id @default(cuid())
  organizacaoId   String
  leadId          String
  status          StatusPedidoFoto @default(NOVO_LEAD)
  tipoFoto        TipoFotoIA
  descricao       String?         // briefing do cliente
  valorCobrado    Float?
  linkPagamento   String?
  cobrancaId      String?         // ID da cobrança no gateway
  rodadasRevisao  Int             @default(0)
  promptUsado     String?         // prompt da IA que gerou
  observacoes     String?
  aprovadoEm      DateTime?
  entregueEm      DateTime?
  criadoEm        DateTime        @default(now())
  atualizadoEm    DateTime        @updatedAt

  organizacao     Organizacao     @relation(fields: [organizacaoId], references: [id])
  lead            Lead            @relation(fields: [leadId], references: [id])
  imagens         ImagemFotoIA[]
  execucoes       ExecucaoFotoIA[]

  @@index([organizacaoId])
  @@index([status])
}

model ImagemFotoIA {
  id            String        @id @default(cuid())
  pedidoId      String
  url           String        // URL do storage (S3 ou local)
  urlPublica    String?       // URL temporária para aprovação
  tipo          String        // "gerada" | "revisada" | "entregue"
  rodada        Int           @default(1)
  aprovada      Boolean       @default(false)
  criadoEm      DateTime      @default(now())

  pedido        PedidoFotoIA  @relation(fields: [pedidoId], references: [id])

  @@index([pedidoId])
}

model ExecucaoFotoIA {
  id            String        @id @default(cuid())
  pedidoId      String
  etapa         String        // nome da task executada
  status        String        // "iniciado" | "concluido" | "erro"
  entrada       Json?         // dados de entrada da execução
  saida         Json?         // resultado da execução
  erro          String?
  executadoEm   DateTime      @default(now())
  duracaoMs     Int?

  pedido        PedidoFotoIA  @relation(fields: [pedidoId], references: [id])

  @@index([pedidoId])
}
```

### Relação com Models Existentes

- `Lead` → adicionar campo `pedidoFotoIA PedidoFotoIA[]`
- Funil FotoIA criado automaticamente no seed com as 11 etapas

---

## 7. API Routes

### Endpoints Necessários

| Method | Route | Descrição |
|--------|-------|-----------|
| GET | `/api/foto-ia/pedidos` | Listar pedidos com filtros |
| POST | `/api/foto-ia/pedidos` | Criar novo pedido (ao capturar lead) |
| GET | `/api/foto-ia/pedidos/[id]` | Detalhe do pedido |
| PATCH | `/api/foto-ia/pedidos/[id]/status` | Atualizar status manualmente |
| POST | `/api/foto-ia/webhook/pagamento` | Receber webhook do gateway de pagamento |
| POST | `/api/foto-ia/gerar` | Disparar geração de imagens via IA |
| GET | `/api/foto-ia/imagens/[id]` | Servir imagem (acesso autenticado) |
| POST | `/api/foto-ia/aprovar/[pedidoId]` | Registrar aprovação do cliente |
| GET | `/api/foto-ia/dashboard` | Métricas para o dashboard |
| GET | `/api/foto-ia/configuracoes` | Buscar configurações do serviço |
| PUT | `/api/foto-ia/configuracoes` | Atualizar configurações |
| POST | `/api/foto-ia/squad/executar` | Disparar execução de task do squad |

---

## 8. Páginas (Frontend)

### Novas Rotas

| Rota | Componente | Descrição |
|------|-----------|-----------|
| `/foto-ia` | `FotoIADashboard` | Visão geral: KPIs, pedidos recentes, conversão |
| `/foto-ia/pedidos` | `PedidosList` | Lista de pedidos com filtros e status |
| `/foto-ia/pedidos/[id]` | `PedidoDetail` | Detalhe: timeline, imagens, histórico |
| `/foto-ia/configuracoes` | `FotoIAConfig` | Preços, prompts, templates de mensagem |
| `/foto-ia/galeria/[token]` | `GaleriaCliente` | Página pública para o cliente aprovar fotos |

### KPIs do Dashboard FotoIA

- Total de leads no pipeline
- Taxa de conversão (lead → pagamento)
- Receita do mês
- Pedidos em produção agora
- Tempo médio de entrega
- Taxa de aprovação na 1ª rodada

---

## 9. Integrações Externas

### 9.1 Gateway de Pagamento

**Opção Principal: Asaas**
- Geração de cobrança via API REST
- Webhook em tempo real para confirmação
- Suporte a PIX, boleto e cartão
- SDK disponível para Node.js

**Alternativa: Mercado Pago**
- Preferência de pagamento (PIX + cartão)
- Webhook IPN para notificações

**Configuração necessária:**
```env
PAYMENT_GATEWAY=asaas
ASAAS_API_KEY=...
ASAAS_WEBHOOK_SECRET=...
```

### 9.2 API de Geração de Imagens

**Opção Principal: Replicate**
- Modelos disponíveis: SDXL, Flux, PhotoMaker
- Pagamento por execução (sem mensalidade)
- Suporte a imagens de referência (photo-to-photo)
- Webhook quando geração completa

**Alternativa: OpenAI DALL-E 3**
- Mais simples de integrar
- Custo por imagem fixo
- Sem imagens de referência

**Configuração necessária:**
```env
IMAGE_API=replicate
REPLICATE_API_TOKEN=...
REPLICATE_MODEL=stability-ai/sdxl:...
```

### 9.3 Storage de Imagens

**Opção: Cloudflare R2** (compatível com S3)
- Custo muito baixo (0,015 USD/GB)
- CDN global incluído
- SDK S3-compatible

**Fallback: Local filesystem** (para desenvolvimento)
```env
STORAGE_PROVIDER=local
STORAGE_PATH=./uploads/foto-ia
```

---

## 10. Configurações do Serviço (Painel Admin)

### Tabela de Preços (configurável via UI)

| Tipo de Foto | Qtd Imagens | Preço Padrão |
|-------------|-------------|-------------|
| Retrato Profissional | 5 fotos | R$ 97,00 |
| Foto de Produto | 10 fotos | R$ 147,00 |
| Foto Corporativa | 8 fotos | R$ 197,00 |
| Banner Redes Sociais | 5 formatos | R$ 127,00 |
| Foto de Perfil | 3 fotos | R$ 67,00 |
| Custom | configurável | configurável |

### Prompts de IA (configurável por tipo)

Cada tipo de foto tem um prompt base editável pelo gestor:
```yaml
retrato_profissional:
  base_prompt: "Professional portrait photo, studio lighting, sharp focus,
                bokeh background, business attire, 8K ultra-realistic"
  negative_prompt: "cartoon, anime, blurry, watermark"
  modelo: "stability-ai/sdxl"
  quantidade: 5
```

---

## 11. Fluxo Técnico Completo (Happy Path)

```
1. Lead criado via API (integração com landing page / tráfego)
   → POST /api/leads (pipeline FotoIA atribuído automaticamente)
   → POST /api/foto-ia/pedidos (PedidoFotoIA criado com status NOVO_LEAD)

2. Squad Vendedor IA ativado
   → Task: qualificar-lead
   → WhatsApp: "Olá {nome}! Vi que você se interessou em fotos profissionais..."
   → Coleta: tipo de foto desejado
   → Status: EM_QUALIFICACAO → PROPOSTA_ENVIADA

3. Se não responde em 24h → Task: fazer-followup (1)
   Se não responde em 48h → Task: fazer-followup (2)
   Se não responde em 72h → Status: PERDIDO

4. Cliente aceita → Status: AGUARDANDO_PAGAMENTO
   → Task: enviar-link-pgto
   → POST /api/pagamentos (gateway) → Link gerado
   → WhatsApp: "Aqui está seu link de pagamento: {link}"

5. Webhook recebido em /api/foto-ia/webhook/pagamento
   → Validação da assinatura do webhook
   → Status: PAGAMENTO_CONFIRMADO → EM_PRODUCAO
   → WhatsApp: "Pagamento confirmado! Estamos gerando suas fotos..."

6. Task: gerar-imagens
   → POST https://api.replicate.com/v1/predictions
   → Body: { prompt, negative_prompt, num_images }
   → Aguarda webhook de conclusão (3-10 min)
   → Imagens salvas no storage
   → ImagemFotoIA[] criados no banco

7. Status: EM_PRODUCAO → AGUARDANDO_APROVACAO
   → Task: enviar-para-aprovacao
   → Galeria temporária gerada: /foto-ia/galeria/{token}
   → WhatsApp: "Suas fotos estão prontas! Acesse: {link}"

8a. Cliente aprova → POST /api/foto-ia/aprovar/{pedidoId}
    → Status: ENTREGUE
    → WhatsApp: "Obrigado! Suas fotos foram entregues com sucesso! ⭐"
    → Lead movido para "Cliente" no CRM

8b. Cliente pede revisão → Status: EM_REVISAO
    → Task: processar-revisao (rodada += 1)
    → Volta para passo 6 com prompt ajustado
    → Máximo 2 revisões incluídas no preço
```

---

## 12. Requisitos Não-Funcionais

| Requisito | Especificação |
|-----------|--------------|
| **Performance** | Geração de imagens < 10 min (depende da API externa) |
| **Disponibilidade** | Sistema 24/7, squad executa independente de horário |
| **Segurança** | Webhook validado com HMAC, imagens acessíveis apenas por token temporário |
| **Escalabilidade** | Queue para geração de imagens (múltiplos pedidos simultâneos) |
| **Privacidade** | Imagens do cliente não compartilhadas com terceiros |
| **Auditoria** | Toda execução do squad registrada em ExecucaoFotoIA |

---

## 13. Métricas de Sucesso

| Métrica | Meta 30 dias | Meta 90 dias |
|---------|-------------|-------------|
| Taxa de conversão lead → pagamento | > 15% | > 25% |
| Tempo médio do fluxo completo | < 2h | < 1h |
| Taxa de aprovação 1ª rodada | > 70% | > 85% |
| NPS do serviço | > 7 | > 8.5 |
| Receita mensal gerada | R$ 2.000 | R$ 10.000 |

---

## 14. Épico 8 — Breakdown de Stories

### Epic 8.1 — Infraestrutura Base FotoIA
- Novos models Prisma (PedidoFotoIA, ImagemFotoIA, ExecucaoFotoIA)
- Migration e seed (funil FotoIA com 11 etapas)
- Configurações do serviço no banco (FotoIAConfig model)

### Epic 8.2 — Squad foto-ia-squad
- Criar estrutura do squad (squad.yaml, agents, tasks, templates)
- Implementar lógica dos 4 agentes
- Integração com WhatsApp (Baileys hooks)
- Testes de execução do squad

### Epic 8.3 — Integração Gateway de Pagamento
- Configurar Asaas/Mercado Pago
- Endpoint webhook `/api/foto-ia/webhook/pagamento`
- Geração automática de cobranças
- Testes de pagamento em sandbox

### Epic 8.4 — Integração API de Imagens IA
- Configurar Replicate API
- Endpoint POST `/api/foto-ia/gerar`
- Storage de imagens (local/R2)
- Webhook de conclusão da geração

### Epic 8.5 — Dashboard e Páginas FotoIA
- `/foto-ia` dashboard com KPIs
- `/foto-ia/pedidos` lista com filtros
- `/foto-ia/pedidos/[id]` detalhe completo
- `/foto-ia/galeria/[token]` galeria pública

### Epic 8.6 — Configurações e Admin
- `/foto-ia/configuracoes` painel de config
- Editor de preços por tipo
- Editor de prompts de IA
- Editor de templates WhatsApp

### Epic 8.7 — Automação e Orquestração
- Cron jobs para follow-ups automáticos
- Orquestrador do pipeline (transições automáticas de status)
- Alertas e notificações para o gestor
- Relatórios de performance

---

## 15. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| API de imagens indisponível | Média | Alto | Retry automático + notificação ao cliente |
| Falha no webhook de pagamento | Baixa | Alto | Verificação ativa (polling) como fallback |
| Cliente insatisfeito com qualidade | Média | Médio | 2 rodadas de revisão + política de reembolso |
| Custo de API muito alto | Baixa | Médio | Monitoramento de custos + limites por pedido |
| WhatsApp bloqueado pelo Meta | Baixa | Alto | Fallback para e-mail |

---

## 16. Aprovações

| Papel | Nome | Status |
|-------|------|--------|
| Product Manager | Morgan | ✅ Aprovado |
| Squad Creator | Craft | ⏳ Pendente (próximo passo) |
| Arquiteto | Aria | ⏳ Pendente |
| Desenvolvedor | Dex | ⏳ Pendente |

---

*— Morgan, planejando o futuro 📊*
*PRD gerado em 2026-02-23 | Synkra AIOS v2.0*
