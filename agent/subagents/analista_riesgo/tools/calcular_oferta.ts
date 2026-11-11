import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { calcularOferta } from "#lib/oferta.ts";

const FUENTE = "Motor de precios del banco (sintético)";

export default defineTool({
  description:
    "Calcula la oferta de descuento de una factura: anticipo (90%), tasa mensual según banda, descuento, comisión de estudio, GMF (4x1000), desembolso neto y costo efectivo anual. Banda D no tiene oferta. Todos los valores en pesos colombianos (COP).",
  inputSchema: z.object({
    valorFactura: z.number().positive().describe("Valor de la factura en COP"),
    diasAlVencimiento: z.number().int().positive().describe("Días entre hoy y el vencimiento de la factura"),
    banda: z.enum(["A", "B", "C", "D"]).describe("Banda de riesgo calculada por calcular_score"),
    nit: z.string().optional().describe("NIT, solo para trazabilidad"),
  }),
  label: { start: ({ valorFactura }) => `Calculando oferta para factura de ${valorFactura.toLocaleString("es-CO")} COP` },
  async execute({ nit, ...input }) {
    const r = calcularOferta(input);
    registrarAuditoria({ caseId: nit, agente: "analista_riesgo", accion: "calcular_oferta", fuentes: [FUENTE], resultado: r.hayOferta ? `neto ${r.desembolsoNeto}` : "sin oferta" });
    return { ...r, moneda: "COP" as const, fuente: FUENTE, simulado: true as const };
  },
});
