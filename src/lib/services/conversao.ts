import { prisma } from '@/lib/prisma'
import type { ConversaoInput } from '@/lib/validators/conversao'
import { addMonths, addDays } from 'date-fns'
import type { StatusLancamento, TipoLancamento } from '@prisma/client'

export async function registrarVenda(data: ConversaoInput, organizacaoId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: data.leadId, organizacaoId },
    select: { id: true, nome: true, empresa: true, status: true },
  })
  if (!lead) throw new Error('Lead não encontrado')
  if (lead.status === 'VENDA_REALIZADA') throw new Error('Lead já convertido')

  return prisma.$transaction(async (tx) => {
    // 1. Atualizar lead
    await tx.lead.update({
      where: { id: data.leadId },
      data: {
        status: 'VENDA_REALIZADA',
        vgvTotal: data.vgvTotal,
        recorrenciaMensal: data.recorrenciaMensal ?? null,
        dataConversao: new Date(),
        etapaId: data.etapaId,
      },
    })

    // 2. Criar projeto
    const nomeCliente = lead.empresa || lead.nome
    const projeto = await tx.projeto.create({
      data: {
        nome: `${nomeCliente} — ${data.tipoServico}`,
        tipoServico: data.tipoServico,
        status: 'ATIVO',
        leadId: data.leadId,
        organizacaoId,
      },
    })

    // 3. Criar contrato financeiro
    const contrato = await tx.contratoFinanceiro.create({
      data: {
        valorTotal: data.vgvTotal,
        recorrenciaMensal: data.recorrenciaMensal ?? null,
        tipoPagamento: data.tipoPagamento,
        dataInicio: new Date(data.dataInicio),
        numeroParcelas: data.numeroParcelas ?? null,
        projetoId: projeto.id,
        leadId: data.leadId,
        organizacaoId,
      },
    })

    // 4. Gerar lançamentos
    const agora = new Date()
    const dataInicio = new Date(data.dataInicio)
    const lancamentos: Array<{
      descricao: string
      valor: number
      dataVencimento: Date
      status: StatusLancamento
      tipo: TipoLancamento
      contratoId: string
      organizacaoId: string
    }> = []

    if (data.tipoPagamento === 'RECORRENTE') {
      const dia = data.diaVencimento ?? dataInicio.getDate()
      for (let i = 0; i < 12; i++) {
        const venc = addMonths(dataInicio, i)
        venc.setDate(Math.min(dia, 28))
        lancamentos.push({
          descricao: `Mensalidade ${i + 1}/12`,
          valor: data.recorrenciaMensal ?? data.vgvTotal / 12,
          dataVencimento: venc,
          status: venc < agora ? 'ATRASADO' : 'PENDENTE',
          tipo: 'RECORRENTE',
          contratoId: contrato.id,
          organizacaoId,
        })
      }
    } else if (data.tipoPagamento === 'PARCELADO') {
      const parcelas = data.numeroParcelas ?? 1
      const valorParcela = data.vgvTotal / parcelas
      for (let i = 0; i < parcelas; i++) {
        const venc = addMonths(dataInicio, i)
        lancamentos.push({
          descricao: `Parcela ${i + 1}/${parcelas}`,
          valor: valorParcela,
          dataVencimento: venc,
          status: venc < agora ? 'ATRASADO' : 'PENDENTE',
          tipo: 'UNICO',
          contratoId: contrato.id,
          organizacaoId,
        })
      }
    } else {
      const venc = data.dataVencimentoUnico
        ? new Date(data.dataVencimentoUnico)
        : addDays(dataInicio, 30)
      lancamentos.push({
        descricao: 'Pagamento único',
        valor: data.vgvTotal,
        dataVencimento: venc,
        status: venc < agora ? 'ATRASADO' : 'PENDENTE',
        tipo: 'UNICO',
        contratoId: contrato.id,
        organizacaoId,
      })
    }

    await tx.lancamento.createMany({ data: lancamentos })

    return { projeto, contrato, lead }
  })
}
