import { defineTool } from "eve/tools";
import { z } from "zod";
import { analizarCartera } from "#lib/monitor.ts";

export default defineTool({
  description: "Analiza la cartera de factoring del banco: KPIs, exposición por pagador, vencimientos de las próximas semanas y alertas (vencidas, vencimientos próximos, concentración, pagadores de baja calificación).",
  inputSchema: z.object({}),
  label: { start: () => "Analizando cartera de factoring" },
  async execute() {
    return { ...analizarCartera(), fuente: "Core de cartera (sintético)", simulado: true as const };
  },
});
