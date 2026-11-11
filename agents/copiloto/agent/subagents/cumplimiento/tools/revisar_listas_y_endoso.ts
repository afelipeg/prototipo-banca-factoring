import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { armarExpediente } from "#lib/expediente.ts";

const FUENTE = "Listas SARLAFT y RADIAN (simulados)";

export default defineTool({
  description: "Revisa el estado SARLAFT de la empresa y el estado RADIAN de la factura (endosos, rechazos) para detectar riesgo LA/FT o doble financiación.",
  inputSchema: z.object({ numeroFactura: z.string().min(1) }),
  label: { start: ({ numeroFactura }) => `Revisando listas y endosos de ${numeroFactura}` },
  async execute({ numeroFactura }) {
    const e = armarExpediente(numeroFactura);
    if (!e) return { encontrado: false as const, mensaje: `No existe la factura ${numeroFactura}.`, fuente: FUENTE, simulado: true as const };
    const senales: string[] = [];
    if (e.pyme.sarlaft.estado !== "sin_coincidencias") senales.push(`SARLAFT: ${e.pyme.sarlaft.estado} (${e.pyme.sarlaft.detalle})`);
    if (e.factura.endoso) senales.push(`Factura endosada a ${e.factura.endoso.endosatario} el ${e.factura.endoso.fecha}: posible doble financiación`);
    if (e.factura.estadoRadian === "rechazada") senales.push("Factura rechazada en RADIAN");
    if (!e.kycConsistente) senales.push("Inconsistencia entre RUT y Cámara de Comercio");
    registrarAuditoria({ caseId: e.pyme.nit, agente: "cumplimiento", accion: "revisar_listas_y_endoso", fuentes: [FUENTE], resultado: senales.length ? `${senales.length} señal(es)` : "sin señales" });
    return {
      encontrado: true as const,
      empresa: e.pyme.rut.razonSocial,
      nit: e.pyme.nit,
      sarlaft: e.pyme.sarlaft,
      radian: { estado: e.factura.estadoRadian, endoso: e.factura.endoso ?? null, cufe: e.factura.cufe },
      senales,
      fuente: FUENTE,
      simulado: true as const,
    };
  },
});
