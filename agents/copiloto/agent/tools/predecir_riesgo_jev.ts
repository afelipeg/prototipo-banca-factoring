import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { armarExpediente } from "#lib/expediente.ts";
import { predecirConJev } from "#lib/jev.ts";

const FUENTE = "Jev (TypeSafe System One) sobre el expediente sintético";

export default defineTool({
  description:
    "Predice el riesgo semántico de una operación con el motor Jev: probabilidad de impago al vencimiento (con su distribución), de disputa del pagador, de fraude o doble financiación y de coherencia del monto con la actividad, el motivo principal de riesgo y un semáforo (verde, amarillo, rojo) compuesto por reglas explícitas. Complementa el score determinista; no lo reemplaza.",
  inputSchema: z.object({ numeroFactura: z.string().min(1).describe("Número de factura, p. ej. FE-2002") }),
  label: { start: ({ numeroFactura }) => `Prediciendo riesgo con Jev para ${numeroFactura}` },
  async execute({ numeroFactura }, ctx) {
    const e = armarExpediente(numeroFactura);
    if (!e) return { disponible: false as const, mensaje: `No existe la factura ${numeroFactura}.`, fuente: FUENTE, simulado: true as const };
    const r = await predecirConJev(e, ctx.abortSignal);
    registrarAuditoria({
      caseId: e.pyme.nit,
      agente: "copiloto",
      accion: "predecir_riesgo_jev",
      fuentes: [FUENTE],
      resultado: r.disponible ? `semáforo ${r.semaforo}; impago ${Math.round(r.probImpago * 100)}%` : r.mensaje,
    });
    return { ...r, numeroFactura: e.factura.numero, banda: e.score.banda, score: e.score.score, fuente: FUENTE, simulado: true as const };
  },
});
