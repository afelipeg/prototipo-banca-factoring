import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { armarExpediente } from "#lib/expediente.ts";

export default defineTool({
  description:
    "Prepara el borrador del acta de comité de crédito para una factura: datos del caso tomados del expediente, la recomendación del copiloto, sus fundamentos y condiciones. Es un borrador: la decisión la toma el comité humano en la Bandeja.",
  inputSchema: z.object({
    numeroFactura: z.string().min(1),
    recomendacion: z.enum(["aprobar", "aprobar_con_condiciones", "rechazar"]),
    fundamentos: z.array(z.string().min(1)).min(1).max(8).describe("Razones con cifras del expediente y de Jev"),
    condiciones: z.array(z.string().min(1)).max(6).default([]).describe("Condiciones propuestas si se aprueba con condiciones"),
  }),
  label: { start: ({ numeroFactura }) => `Redactando acta de comité de ${numeroFactura}` },
  async execute({ numeroFactura, recomendacion, fundamentos, condiciones }) {
    const e = armarExpediente(numeroFactura);
    if (!e) return { ok: false as const, mensaje: `No existe la factura ${numeroFactura}.` };
    const acta = {
      ok: true as const,
      estado: "borrador_pendiente_de_comite" as const,
      numeroActa: `ACTA-${e.factura.numero}-${new Date().toISOString().slice(0, 10)}`,
      caso: {
        empresa: e.pyme.rut.razonSocial,
        nit: e.pyme.nit,
        factura: e.factura.numero,
        valor: e.factura.valor,
        pagador: `${e.pagador.nombre} (${e.pagador.calificacion})`,
        score: `${e.score.score} · banda ${e.score.banda}`,
        reglas: e.politicas.reglasAplicadas,
      },
      recomendacion,
      fundamentos,
      condiciones,
      firmasRequeridas: ["Analista de crédito", "Miembro del comité"],
      simulado: true as const,
    };
    registrarAuditoria({ caseId: e.pyme.nit, agente: "copiloto", accion: "redactar_acta", fuentes: ["Expediente"], resultado: `${acta.numeroActa}: recomienda ${recomendacion}` });
    return acta;
  },
});
