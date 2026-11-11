import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { buscarPyme, carteraDe } from "#lib/consultas.ts";

const FUENTE = "Motor de recomendación de productos (sintético)";

export default defineTool({
  description:
    "Sugiere el siguiente producto para un cliente según su historial: línea de factoring recurrente si pagó operaciones a tiempo, o capital de trabajo si sus ventas son altas y tiene operaciones activas. Basado en reglas.",
  inputSchema: z.object({ nit: z.string().min(9).describe("NIT de la empresa") }),
  label: { start: () => "Evaluando siguiente producto recomendado" },
  async execute({ nit }) {
    const p = buscarPyme(nit);
    if (!p) {
      registrarAuditoria({ caseId: nit, agente: "acompanamiento", accion: "sugerir_siguiente_producto", fuentes: [FUENTE], resultado: "no encontrado" });
      return { encontrado: false as const, nit, mensaje: "NIT no registrado.", fuente: FUENTE, simulado: true as const };
    }
    const cartera = carteraDe(p.nit);
    const pagadasATiempo = cartera.filter((o) => o.estado === "pagada" && o.fechaPago !== undefined && o.fechaPago <= o.fechaVencimiento);
    const sugerencias: { producto: string; motivo: string }[] = [];
    if (pagadasATiempo.length > 0 && p.buro.moras.length === 0) {
      sugerencias.push({ producto: "Línea de factoring recurrente", motivo: `${pagadasATiempo.length} operación(es) pagada(s) a tiempo y sin moras en buró.` });
    }
    if (p.ventasAnualesCOP >= 3_000_000_000 && cartera.some((o) => o.estado === "activa")) {
      sugerencias.push({ producto: "Capital de trabajo", motivo: "Ventas anuales altas y operaciones de factoring activas." });
    }
    registrarAuditoria({ caseId: p.nit, agente: "acompanamiento", accion: "sugerir_siguiente_producto", fuentes: [FUENTE], resultado: sugerencias.map((s) => s.producto).join(", ") || "sin sugerencias" });
    return { encontrado: true as const, nit: p.nit, sugerencias, fuente: FUENTE, simulado: true as const };
  },
});
