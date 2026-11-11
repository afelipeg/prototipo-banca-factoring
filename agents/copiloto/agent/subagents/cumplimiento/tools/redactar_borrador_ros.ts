import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { armarExpediente } from "#lib/expediente.ts";

export default defineTool({
  description:
    "Prepara un BORRADOR de Reporte de Operación Sospechosa (ROS) para la UIAF. No lo envía: queda para revisión y firma del oficial de cumplimiento.",
  inputSchema: z.object({
    numeroFactura: z.string().min(1),
    hechos: z.array(z.string().min(1)).min(1).max(8).describe("Hechos objetivos con su fuente"),
    senalesDeAlerta: z.array(z.string().min(1)).min(1).max(8),
  }),
  label: { start: ({ numeroFactura }) => `Redactando borrador de ROS para ${numeroFactura}` },
  async execute({ numeroFactura, hechos, senalesDeAlerta }) {
    const e = armarExpediente(numeroFactura);
    if (!e) return { ok: false as const, mensaje: `No existe la factura ${numeroFactura}.` };
    const borrador = {
      ok: true as const,
      estado: "borrador_no_enviado" as const,
      numeroBorrador: `ROS-BORRADOR-${e.factura.numero}`,
      destinatario: "UIAF (no enviado)",
      reportado: { razonSocial: e.pyme.rut.razonSocial, nit: e.pyme.nit },
      operacion: { tipo: "Factoring (descuento de factura electrónica)", factura: e.factura.numero, valor: e.factura.valor },
      hechos,
      senalesDeAlerta,
      reservaLegal: "No informar al cliente (reserva del ROS).",
      requiere: "Revisión y firma del oficial de cumplimiento",
      simulado: true as const,
    };
    registrarAuditoria({ caseId: e.pyme.nit, agente: "cumplimiento", accion: "redactar_borrador_ros", fuentes: ["Expediente", "Listas"], resultado: borrador.numeroBorrador });
    return borrador;
  },
});
