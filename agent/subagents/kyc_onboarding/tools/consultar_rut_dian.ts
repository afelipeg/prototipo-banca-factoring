import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { buscarPyme } from "#lib/consultas.ts";

const FUENTE = "DIAN RUT (sintético)";

export default defineTool({
  description:
    "Consulta el Registro Único Tributario (RUT) de una empresa en la DIAN por NIT. Devuelve razón social, representante legal, ciudad, actividad económica (CIIU) y estado. Úsala al validar la identidad de la pyme. Los datos son simulados.",
  inputSchema: z.object({ nit: z.string().min(9).describe("NIT de la empresa, con o sin puntos y dígito de verificación") }),
  label: { start: ({ nit }) => `Consultando RUT en DIAN (simulado) para NIT ${nit}` },
  async execute({ nit }) {
    const p = buscarPyme(nit);
    registrarAuditoria({ caseId: p?.nit ?? nit, agente: "kyc_onboarding", accion: "consultar_rut_dian", fuentes: [FUENTE], resultado: p ? "encontrado" : "no encontrado" });
    if (!p) return { encontrado: false as const, nit, mensaje: "No se encontró RUT para ese NIT.", fuente: FUENTE, simulado: true as const };
    return { encontrado: true as const, nit: p.nit, ...p.rut, fuente: FUENTE, simulado: true as const };
  },
});
