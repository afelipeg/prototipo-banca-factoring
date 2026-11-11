import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";

const FUENTE = "Bitácora de auditoría del banco (en memoria, sintético)";

export default defineTool({
  description:
    "Registra un evento en la bitácora de auditoría: quién actuó, qué acción, qué fuentes consultó y el resultado. Úsala para dejar trazabilidad de decisiones, alertas y escalamientos.",
  inputSchema: z.object({
    caseId: z.string().optional().describe("Identificador del caso, normalmente el NIT"),
    agente: z.string().min(1).describe("Agente que ejecuta la acción"),
    accion: z.string().min(1).describe("Acción realizada"),
    fuentes: z.array(z.string()).describe("Fuentes consultadas"),
    resultado: z.string().min(1).describe("Resultado o decisión"),
  }),
  label: { start: ({ accion }) => `Registrando auditoría: ${accion}` },
  async execute(input) {
    const evento = registrarAuditoria(input);
    return { registrado: true as const, evento, fuente: FUENTE, simulado: true as const };
  },
});
