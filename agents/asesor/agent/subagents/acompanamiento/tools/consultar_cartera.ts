import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { buscarPyme, carteraDe, diasHasta } from "#lib/consultas.ts";

const FUENTE = "Cartera del banco (sintético)";

export default defineTool({
  description:
    "Consulta las operaciones de factoring de un cliente (activas y pagadas) con valores, fechas y días al vencimiento. Úsala para el seguimiento posterior al desembolso y para avisar de vencimientos próximos.",
  inputSchema: z.object({ nit: z.string().min(9).describe("NIT de la empresa") }),
  label: { start: ({ nit }) => `Consultando cartera (simulado) del NIT ${nit}` },
  async execute({ nit }) {
    const p = buscarPyme(nit);
    const operaciones = carteraDe(nit).map((o) => ({ ...o, diasAlVencimiento: o.estado === "activa" ? diasHasta(o.fechaVencimiento) : null }));
    registrarAuditoria({ caseId: p?.nit ?? nit, agente: "acompanamiento", accion: "consultar_cartera", fuentes: [FUENTE], resultado: `${operaciones.length} operación(es)` });
    if (operaciones.length === 0) return { encontrado: false as const, nit, mensaje: "El cliente no tiene operaciones de factoring previas.", fuente: FUENTE, simulado: true as const };
    return { encontrado: true as const, nit: p?.nit ?? nit, operaciones, fuente: FUENTE, simulado: true as const };
  },
});
