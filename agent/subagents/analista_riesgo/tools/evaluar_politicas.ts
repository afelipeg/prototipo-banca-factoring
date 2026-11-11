import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { evaluarPoliticas } from "#lib/politicas.ts";

const FUENTE = "Motor de políticas de crédito (sintético)";

export default defineTool({
  description:
    "Evalúa las políticas de crédito y devuelve la decisión: aprobacion_automatica, comite_humano o rechazo, con motivos y reglas aplicadas. Se rechaza si la factura está endosada/rechazada en RADIAN, hay coincidencia confirmada en listas o la banda es D. Va a comité si el monto supera 200.000.000 COP, banda C, SARLAFT parcial o KYC inconsistente.",
  inputSchema: z.object({
    score: z.number().min(0).max(1000),
    banda: z.enum(["A", "B", "C", "D"]),
    monto: z.number().positive().describe("Valor de la factura en COP"),
    radianEstado: z.enum(["aceptada", "endosada", "rechazada", "pendiente_aceptacion"]),
    sarlaft: z.enum(["sin_coincidencias", "coincidencia_parcial", "coincidencia_confirmada"]),
    kycConsistente: z.boolean().describe("true si RUT y Cámara de Comercio coinciden"),
    nit: z.string().optional().describe("NIT, solo para trazabilidad"),
  }),
  label: { start: () => "Evaluando políticas de crédito" },
  async execute({ nit, ...input }) {
    const r = evaluarPoliticas(input);
    registrarAuditoria({ caseId: nit, agente: "analista_riesgo", accion: "evaluar_politicas", fuentes: [FUENTE], resultado: r.decision });
    return { ...r, fuente: FUENTE, simulado: true as const };
  },
});
