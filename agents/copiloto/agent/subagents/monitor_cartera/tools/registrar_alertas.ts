import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";

export default defineTool({
  description: "Registra en la bitácora del banco las alertas de cartera de severidad alta o media. Llámala una sola vez, con todas esas alertas; si no hay ninguna, no la llames.",
  inputSchema: z.object({
    alertas: z.array(z.object({ severidad: z.enum(["alta", "media", "baja"]), detalle: z.string().min(1) })).min(1).max(20),
  }),
  label: { start: ({ alertas }) => `Registrando ${alertas.length} alerta(s) de cartera` },
  async execute({ alertas }) {
    for (const a of alertas) {
      registrarAuditoria({ agente: "monitor_cartera", accion: "alerta_cartera", fuentes: ["Monitor de cartera"], resultado: `[${a.severidad}] ${a.detalle}` });
    }
    // PROTOTIPO: la bitácora vive en memoria; en producción iría a una base durable y a un canal del equipo.
    return { registradas: alertas.length, destino: "bitácora en memoria (prototipo)" };
  },
});
