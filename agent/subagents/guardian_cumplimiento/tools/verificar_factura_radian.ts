import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { buscarFactura } from "#lib/consultas.ts";

const FUENTE = "DIAN RADIAN - verificación de endoso (sintético)";

export default defineTool({
  description:
    "Verifica en RADIAN si una factura ya fue endosada, negociada con otro factor o rechazada (posible doble financiación). Devuelve `apta` (true solo si está aceptada y sin endoso) y el detalle del endoso. Datos simulados.",
  inputSchema: z.object({ numeroFactura: z.string().min(1).describe("Número de la factura, p. ej. FE-3003") }),
  label: { start: ({ numeroFactura }) => `Verificando endoso de ${numeroFactura} en RADIAN (simulado)` },
  async execute({ numeroFactura }) {
    const f = buscarFactura(numeroFactura);
    const apta = f?.estadoRadian === "aceptada" && !f.endoso;
    registrarAuditoria({ caseId: f?.nit, agente: "guardian_cumplimiento", accion: "verificar_factura_radian", fuentes: [FUENTE], resultado: f ? `${f.numero} ${f.estadoRadian} apta=${apta}` : "no encontrada" });
    if (!f) return { encontrado: false as const, numeroFactura, mensaje: "La factura no aparece en RADIAN.", fuente: FUENTE, simulado: true as const };
    return {
      encontrado: true as const,
      numeroFactura: f.numero,
      estadoRadian: f.estadoRadian,
      posibleDobleFinanciacion: f.endoso !== undefined,
      endoso: f.endoso ?? null,
      apta,
      fuente: FUENTE,
      simulado: true as const,
    };
  },
});
