import { defineWorkflowTool } from "eve/tools";
import { createHook, sleep } from "eve/workflow";
import { z } from "zod";

export type DecisionComite = {
  decision: "aprobar" | "rechazar" | "solicitar_informacion" | "reemplazado";
  analista: string;
  comentario?: string;
};

/** Token determinista: la bandeja del analista lo reconstruye a partir del número de factura. */
export const tokenComite = (numeroFactura: string) => `comite-${numeroFactura}`;

/**
 * Transferencia a una persona (human-in-the-loop). Corre como task: el asesor responde
 * de inmediato al empresario y el workflow espera, sin consumir cómputo, la decisión
 * del analista que llega por `POST /comite/:numeroFactura/decision` (ver channels/comite.ts).
 */
export default defineWorkflowTool({
  description:
    "Transfiere el caso al comité de crédito humano cuando evaluar_solicitud devuelve comite_humano. Devuelve un recibo de inmediato; la decisión del analista (aprobar, rechazar o solicitar_informacion) llega después como resultado de la tarea. Antes de llamarla, explica al usuario que un analista revisará su caso.",
  inputSchema: z.object({
    nit: z.string(),
    numeroFactura: z.string(),
    razonSocial: z.string(),
    monto: z.number().describe("Valor de la factura en COP"),
    resumenParaComite: z.string().describe("Resumen del Analista de riesgo, motivos y score"),
  }),
  label: {
    start: ({ numeroFactura }) => `Transfiriendo ${numeroFactura} al comité de crédito`,
    delta: (_input, partial) => (partial as { estado?: string }).estado ?? "",
  },
  async *task({ numeroFactura }, ctx) {
    "use workflow";

    const token = tokenComite(numeroFactura);
    const metadata = { numeroFactura, sessionId: ctx.session.id };
    let hook = createHook<DecisionComite>({ token, metadata });
    let conflicto = await hook.getConflict();
    // Un caso anterior de la misma factura (p. ej. una sesión abandonada) retiene el token:
    // se cierra como "reemplazado" y esta solicitud toma su lugar en la cola.
    for (let intento = 0; conflicto && intento < 3; intento++) {
      hook.dispose();
      await liberarCasoAnterior(token);
      await sleep("2s");
      hook = createHook<DecisionComite>({ token, metadata });
      conflicto = await hook.getConflict();
    }
    if (conflicto) {
      return { estado: "duplicado", mensaje: `La factura ${numeroFactura} ya está en revisión del comité.` };
    }

    yield { estado: "En cola del comité: esperando analista (SLA piloto: 4 horas hábiles)" };

    const resultado = await Promise.race([hook, sleep("4h")]);
    if (resultado === undefined) {
      return {
        estado: "vencido",
        mensaje: "Se venció el tiempo de respuesta del piloto. El caso sigue abierto y un asesor contactará a la empresa.",
      };
    }

    return { estado: "resuelto", ...resultado };
  },
});

async function liberarCasoAnterior(token: string) {
  "use step";
  const { resumeHook } = await import("eve/workflow/api");
  try {
    await resumeHook(token, {
      decision: "reemplazado",
      analista: "sistema",
      comentario: "Reemplazado por una solicitud más reciente de la misma factura.",
    } satisfies DecisionComite);
    return true;
  } catch {
    return false;
  }
}
