import { defineTool } from "eve/tools";
import { z } from "zod";
import { listarAuditoria, registrarAuditoria } from "#lib/auditoria.ts";

const FUENTE = "Bitácora de auditoría del banco (en memoria, sintético)";

export default defineTool({
  description: "Consulta la bitácora de auditoría, opcionalmente filtrada por caso (NIT). Devuelve los eventos en orden cronológico.",
  inputSchema: z.object({ caseId: z.string().optional().describe("Filtra por caso (normalmente el NIT)") }),
  label: { start: ({ caseId }) => `Consultando bitácora de auditoría${caseId ? ` del caso ${caseId}` : ""}` },
  async execute({ caseId }) {
    const eventos = listarAuditoria(caseId);
    registrarAuditoria({ caseId, agente: "guardian_cumplimiento", accion: "consultar_auditoria", fuentes: [FUENTE], resultado: `${eventos.length} evento(s)` });
    if (eventos.length === 0) return { encontrado: false as const, mensaje: "No hay eventos de auditoría para ese criterio.", fuente: FUENTE, simulado: true as const };
    return { encontrado: true as const, total: eventos.length, eventos, fuente: FUENTE, simulado: true as const };
  },
});
