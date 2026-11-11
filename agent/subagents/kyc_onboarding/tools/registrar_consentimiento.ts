import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";

const FUENTE = "Registro de consentimientos del banco (sintético)";
let secuencia = 0;

export default defineTool({
  description:
    "Registra el consentimiento de tratamiento de datos personales del cliente (Ley 1581 de 2012) con las finalidades aceptadas o rechazadas. Debe llamarse antes de consultar centrales de riesgo. Devuelve el id del consentimiento y la fecha.",
  inputSchema: z.object({
    nit: z.string().min(9).describe("NIT de la empresa"),
    finalidades: z.array(z.string().min(1)).min(1).describe("Finalidades del tratamiento, p. ej. 'consulta en centrales de riesgo'"),
    aceptado: z.boolean().describe("true si el cliente acepta; false si rechaza"),
  }),
  label: { start: ({ nit }) => `Registrando consentimiento de datos (simulado) para NIT ${nit}` },
  async execute({ nit, finalidades, aceptado }) {
    const consentimientoId = `CONS-${String(++secuencia).padStart(5, "0")}`;
    const timestamp = new Date().toISOString();
    registrarAuditoria({ caseId: nit, agente: "kyc_onboarding", accion: "registrar_consentimiento", fuentes: [FUENTE], resultado: `${consentimientoId} ${aceptado ? "aceptado" : "rechazado"}` });
    return { consentimientoId, nit, finalidades, aceptado, timestamp, baseLegal: "Ley 1581 de 2012", fuente: FUENTE, simulado: true as const };
  },
});
