import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { buscarFactura, buscarPagador, buscarPyme } from "#lib/consultas.ts";
import { calcularScore } from "#lib/score.ts";

const FUENTE = "Motor de score del banco (sintético)";

export default defineTool({
  description:
    "Calcula el score de riesgo (0-1000) y la banda (A, B, C o D) para una operación de factoring. Toma el NIT del cliente y el número de factura y obtiene internamente buró, antigüedad, pagador y concentración. Devuelve los factores con su impacto (suman el score) para explicar la decisión.",
  inputSchema: z.object({
    nit: z.string().min(9).describe("NIT de la empresa"),
    numeroFactura: z.string().min(1).describe("Número de la factura a financiar, p. ej. FE-1001"),
  }),
  label: { start: ({ numeroFactura }) => `Calculando score de riesgo para ${numeroFactura}` },
  async execute({ nit, numeroFactura }) {
    const p = buscarPyme(nit);
    const f = buscarFactura(numeroFactura);
    const pagador = f ? buscarPagador(f.pagador) : undefined;
    if (!p || !f || !pagador || f.nit !== p.nit) {
      registrarAuditoria({ caseId: p?.nit ?? nit, agente: "analista_riesgo", accion: "calcular_score", fuentes: [FUENTE], resultado: "datos insuficientes" });
      return { encontrado: false as const, mensaje: "No hay datos suficientes (empresa, factura o pagador) para calcular el score.", fuente: FUENTE, simulado: true as const };
    }
    const r = calcularScore({
      buroScore: p.buro.score,
      antiguedadAnios: p.camara.antiguedadAnios,
      calificacionPagador: pagador.calificacion,
      moras: p.buro.moras,
      concentracionPagadorPct: p.concentracionPagadorPct,
    });
    registrarAuditoria({ caseId: p.nit, agente: "analista_riesgo", accion: "calcular_score", fuentes: [FUENTE], resultado: `score ${r.score} banda ${r.banda}` });
    return { encontrado: true as const, nit: p.nit, numeroFactura: f.numero, ...r, fuente: FUENTE, simulado: true as const };
  },
});
