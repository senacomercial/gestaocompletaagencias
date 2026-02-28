import { prisma } from '@/lib/prisma'
import { StatusPedidoFoto } from '@prisma/client'
import { enviarTexto } from './wa-sender'
import { processarEscolhaPacote } from '@/lib/fotoia/agents/vendedor'
import { processarComprovante } from '@/lib/fotoia/agents/cobrador'
import { processarFotoCliente, processarTema } from '@/lib/fotoia/agents/produtor'
import { processarRespostaCliente } from '@/lib/fotoia/agents/entregador'

/**
 * Processa uma mensagem recebida do cliente via WhatsApp.
 * Roteia para o handler correto baseado no status do pedido ativo.
 */
export async function processarMensagem(
  organizacaoId: string,
  telefone: string,
  corpo?: string,
  imagemBuffer?: Buffer,
  mimeType?: string,
): Promise<void> {
  // Encontrar lead pelo telefone (últimos 8 dígitos)
  const telefoneClean = telefone.replace(/\D/g, '')
  const sufixo = telefoneClean.slice(-8)

  const lead = await prisma.lead.findFirst({
    where: {
      organizacaoId,
      telefone: { endsWith: sufixo },
    },
    select: { id: true, nome: true, telefone: true },
  })

  if (!lead) return // Mensagem de alguém que não é lead — ignorar

  // Encontrar pedido ativo (mais recente que não está finalizado)
  const statusFinais: StatusPedidoFoto[] = ['ENTREGUE', 'CANCELADO', 'PERDIDO']
  const pedido = await prisma.pedidoFotoIA.findFirst({
    where: {
      leadId: lead.id,
      status: { notIn: statusFinais },
    },
    orderBy: { criadoEm: 'desc' },
    select: {
      id: true,
      status: true,
      temaFoto: true,
      fotoClienteUrl: true,
      revisoesMaximas: true,
      rodadasRevisao: true,
      organizacaoId: true,
    },
  })

  if (!pedido) return // Sem pedido ativo — ignorar

  const telefoneEnvio = lead.telefone ?? telefone

  try {
    switch (pedido.status) {
      case StatusPedidoFoto.PROPOSTA_ENVIADA:
      case StatusPedidoFoto.FOLLOWUP_1:
      case StatusPedidoFoto.FOLLOWUP_2:
        if (corpo) {
          await processarEscolhaPacote(pedido.id, corpo, organizacaoId, telefoneEnvio)
        }
        break

      case StatusPedidoFoto.AGUARDANDO_PAGAMENTO:
        if (imagemBuffer && mimeType) {
          await processarComprovante(pedido.id, imagemBuffer, mimeType, organizacaoId, telefoneEnvio)
        } else if (corpo) {
          await enviarTexto(
            organizacaoId,
            telefoneEnvio,
            '📎 Para confirmar seu pagamento, por favor *envie o comprovante como imagem* (foto ou PDF do comprovante PIX).',
          )
        }
        break

      case StatusPedidoFoto.COLETANDO_REQUISITOS:
        if (!pedido.temaFoto) {
          // Aguardando tema
          if (corpo) {
            await processarTema(pedido.id, corpo, organizacaoId, telefoneEnvio)
          }
        } else if (!pedido.fotoClienteUrl) {
          // Aguardando foto do rosto
          if (imagemBuffer && mimeType) {
            await processarFotoCliente(pedido.id, imagemBuffer, mimeType, organizacaoId, telefoneEnvio)
          } else if (corpo) {
            await enviarTexto(
              organizacaoId,
              telefoneEnvio,
              '🤳 Por favor, *envie uma foto clara do seu rosto* para que possamos personalizar suas fotos!',
            )
          }
        }
        break

      case StatusPedidoFoto.AGUARDANDO_APROVACAO:
        if (corpo) {
          await processarRespostaCliente(pedido.id, corpo, organizacaoId, telefoneEnvio)
        }
        break

      case StatusPedidoFoto.EM_PRODUCAO:
        // Fotos em produção — responder que está gerando
        if (corpo || imagemBuffer) {
          await enviarTexto(
            organizacaoId,
            telefoneEnvio,
            '⚡ Suas fotos estão sendo produzidas! Em breve te envio os resultados 🎨',
          )
        }
        break

      case StatusPedidoFoto.EM_REVISAO:
        if (corpo || imagemBuffer) {
          await enviarTexto(
            organizacaoId,
            telefoneEnvio,
            '✏️ Estamos processando sua revisão! Em breve te envio as novas fotos 🎨',
          )
        }
        break

      default:
        break
    }
  } catch (err) {
    console.error(`[BotHandler] Erro ao processar mensagem para pedido ${pedido.id}:`, err)
    // Não propagar — bot não deve quebrar por mensagem não processada
  }
}
