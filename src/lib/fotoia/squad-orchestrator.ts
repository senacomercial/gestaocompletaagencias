/**
 * Squad Orchestrator — FotoIA
 *
 * Thin wrapper over pipeline-orchestrator.ts that exposes
 * `handlePedidoStatusChange` as required by Story 8.2.
 *
 * The full dispatch logic (NOVO_LEAD → vendedor, PAGAMENTO_CONFIRMADO → produtor, etc.)
 * lives in pipeline-orchestrator.ts to keep a single source of truth.
 */

export { onStatusChange as handlePedidoStatusChange } from './pipeline-orchestrator'
export { onStatusChange } from './pipeline-orchestrator'
