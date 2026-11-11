import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { armarExpediente } from "#lib/expediente.ts";

const FUENTE = "Core bancario, buró, RADIAN y motor de score (sintéticos)";

export default defineTool({
  description:
    "Arma el expediente de una operación de factoring a partir del número de factura: empresa, factura (estado RADIAN, endoso), pagador, buró, score y banda con sus factores, reglas de política aplicadas y oferta calculada.",
  inputSchema: z.object({ numeroFactura: z.string().min(1).describe("Número de factura, p. ej. FE-2002") }),
  label: { start: ({ numeroFactura }) => `Consultando expediente de ${numeroFactura}` },
  async execute({ numeroFactura }) {
    const e = armarExpediente(numeroFactura);
    if (!e) {
      return { encontrado: false as const, mensaje: `No existe la factura ${numeroFactura} en el core (sintético).`, fuente: FUENTE, simulado: true as const };
    }
    registrarAuditoria({ caseId: e.pyme.nit, agente: "copiloto", accion: "consultar_expediente", fuentes: [FUENTE], resultado: `${e.factura.numero}: score ${e.score.score} banda ${e.score.banda}, ${e.politicas.decision}` });
    return {
      encontrado: true as const,
      empresa: {
        nit: e.pyme.nit,
        razonSocial: e.pyme.rut.razonSocial,
        actividad: e.pyme.rut.actividad,
        ciudad: e.pyme.rut.ciudad,
        antiguedadAnios: e.pyme.camara.antiguedadAnios,
        ventasAnualesCOP: e.pyme.ventasAnualesCOP,
        concentracionPagadorPct: e.pyme.concentracionPagadorPct,
        sarlaft: e.pyme.sarlaft.estado,
        buro: e.pyme.buro,
        kycConsistente: e.kycConsistente,
      },
      factura: {
        numero: e.factura.numero,
        valor: e.factura.valor,
        fechaVencimiento: e.factura.fechaVencimiento,
        diasAlVencimiento: e.diasAlVencimiento,
        estadoRadian: e.factura.estadoRadian,
        endoso: e.factura.endoso ?? null,
      },
      pagador: e.pagador,
      score: e.score,
      politicas: e.politicas,
      oferta: e.oferta,
      fuente: FUENTE,
      simulado: true as const,
    };
  },
});
