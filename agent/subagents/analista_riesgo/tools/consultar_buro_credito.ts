import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { buscarPyme } from "#lib/consultas.ts";

const FUENTE = "Buró de crédito (sintético)";

export default defineTool({
  description:
    "Consulta el buró de crédito de la empresa por NIT: score, moras reportadas (días y antigüedad en meses), obligaciones activas y consultas recientes. Requiere consentimiento previo del cliente. Datos simulados.",
  inputSchema: z.object({ nit: z.string().min(9).describe("NIT de la empresa") }),
  label: { start: ({ nit }) => `Consultando buró de crédito (simulado) para NIT ${nit}` },
  async execute({ nit }) {
    const p = buscarPyme(nit);
    registrarAuditoria({ caseId: p?.nit ?? nit, agente: "analista_riesgo", accion: "consultar_buro_credito", fuentes: [FUENTE], resultado: p ? `score ${p.buro.score}` : "no encontrado" });
    if (!p) return { encontrado: false as const, nit, mensaje: "No hay reporte de buró para ese NIT.", fuente: FUENTE, simulado: true as const };
    return { encontrado: true as const, nit: p.nit, ...p.buro, fuente: FUENTE, simulado: true as const };
  },
});
