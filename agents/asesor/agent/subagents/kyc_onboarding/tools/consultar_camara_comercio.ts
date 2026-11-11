import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { buscarPyme, kycConsistente } from "#lib/consultas.ts";

const FUENTE = "Cámara de Comercio RUES (sintético)";

export default defineTool({
  description:
    "Consulta el certificado de existencia y representación legal en la Cámara de Comercio por NIT: razón social, representante legal, vigencia de la matrícula y antigüedad. Incluye `consistenteConRut`, que indica si razón social y representante coinciden con el RUT de la DIAN. Los datos son simulados.",
  inputSchema: z.object({ nit: z.string().min(9).describe("NIT de la empresa, con o sin puntos y dígito de verificación") }),
  label: { start: ({ nit }) => `Consultando Cámara de Comercio (simulado) para NIT ${nit}` },
  async execute({ nit }) {
    const p = buscarPyme(nit);
    registrarAuditoria({
      caseId: p?.nit ?? nit, agente: "kyc_onboarding", accion: "consultar_camara_comercio", fuentes: [FUENTE],
      resultado: p ? (kycConsistente(p) ? "consistente con RUT" : "INCONSISTENTE con RUT") : "no encontrado",
    });
    if (!p) return { encontrado: false as const, nit, mensaje: "No se encontró registro mercantil para ese NIT.", fuente: FUENTE, simulado: true as const };
    return {
      encontrado: true as const,
      nit: p.nit,
      ...p.camara,
      consistenteConRut: kycConsistente(p),
      diferencias: [
        ...(p.rut.razonSocial !== p.camara.razonSocial ? [`Razón social: RUT "${p.rut.razonSocial}" vs Cámara "${p.camara.razonSocial}"`] : []),
        ...(p.rut.representanteLegal !== p.camara.representanteLegal ? [`Representante legal: RUT "${p.rut.representanteLegal}" vs Cámara "${p.camara.representanteLegal}"`] : []),
      ],
      fuente: FUENTE,
      simulado: true as const,
    };
  },
});
