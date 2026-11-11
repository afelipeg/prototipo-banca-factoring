import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { buscarFactura, diasHasta, facturasDe } from "#lib/consultas.ts";

const FUENTE = "DIAN RADIAN (sintético)";

export default defineTool({
  description:
    "Consulta facturas electrónicas registradas en RADIAN, por NIT del emisor o por número de factura (ej. FE-1001). Devuelve valor, pagador, fechas, días al vencimiento y estado RADIAN (aceptada, endosada, rechazada). Envía al menos uno de los dos parámetros. Datos simulados.",
  inputSchema: z.object({
    nit: z.string().optional().describe("NIT del emisor de las facturas"),
    numeroFactura: z.string().optional().describe("Número de la factura, p. ej. FE-1001"),
  }),
  label: { start: ({ nit, numeroFactura }) => `Consultando facturas en RADIAN (simulado) ${numeroFactura ?? nit ?? ""}`.trim() },
  async execute({ nit, numeroFactura }) {
    const lista = numeroFactura ? [buscarFactura(numeroFactura)].filter((f) => f !== undefined) : nit ? facturasDe(nit) : [];
    const facturas = lista.map((f) => ({ ...f, diasAlVencimiento: diasHasta(f.fechaVencimiento) }));
    registrarAuditoria({ caseId: facturas[0]?.nit ?? nit, agente: "analista_riesgo", accion: "consultar_facturas_radian", fuentes: [FUENTE], resultado: `${facturas.length} factura(s)` });
    if (facturas.length === 0) return { encontrado: false as const, mensaje: "No se encontraron facturas con esos criterios.", fuente: FUENTE, simulado: true as const };
    return { encontrado: true as const, facturas, fuente: FUENTE, simulado: true as const };
  },
});
