import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { buscarPyme } from "#lib/consultas.ts";

const FUENTE = "Listas restrictivas SARLAFT (sintético)";

export default defineTool({
  description:
    "Consulta listas restrictivas y de control (OFAC, ONU, lista interna, PEP) para la empresa y su representante legal, por NIT. Devuelve `estado`: sin_coincidencias, coincidencia_parcial (requiere revisión humana) o coincidencia_confirmada. Los datos son simulados.",
  inputSchema: z.object({ nit: z.string().min(9).describe("NIT de la empresa, con o sin puntos y dígito de verificación") }),
  label: { start: ({ nit }) => `Consultando listas SARLAFT (simulado) para NIT ${nit}` },
  async execute({ nit }) {
    const p = buscarPyme(nit);
    registrarAuditoria({ caseId: p?.nit ?? nit, agente: "kyc_onboarding", accion: "consultar_listas_sarlaft", fuentes: [FUENTE], resultado: p ? p.sarlaft.estado : "no encontrado" });
    if (!p) return { encontrado: false as const, nit, mensaje: "NIT no registrado; no se pudo consultar listas.", fuente: FUENTE, simulado: true as const };
    return { encontrado: true as const, nit: p.nit, representanteLegal: p.rut.representanteLegal, ...p.sarlaft, fuente: FUENTE, simulado: true as const };
  },
});
