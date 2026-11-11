import { defineTool } from "eve/tools";
import { always } from "eve/tools/approval";
import { z } from "zod";

const cop = (n: number) => `COP ${Math.round(n).toLocaleString("es-CO")}`;

/**
 * Contratación y desembolso (simulado). Siempre exige la firma explícita del empresario:
 * la llamada no corre hasta que el usuario aprueba el prompt en la interfaz.
 */
export default defineTool({
  description:
    "Formaliza el contrato de descuento y ordena el desembolso (simulado) a la cuenta de la pyme. Úsala solo con una oferta aprobada (aprobación automática o decisión 'aprobar' del comité). Requiere la firma del empresario.",
  inputSchema: z.object({
    nit: z.string(),
    numeroFactura: z.string(),
    valorFactura: z.number(),
    desembolsoNeto: z.number(),
    tasaMensual: z.number().describe("Tasa mensual como fracción, tal como la devuelve calcular_oferta (ej. 0.0145 = 1,45 %)"),
    origenAprobacion: z.enum(["aprobacion_automatica", "comite_humano"]),
  }),
  label: { start: ({ numeroFactura }) => `Formalizando desembolso de ${numeroFactura}` },
  approval: {
    request: always(),
    prompt: ({ input }) =>
      `Firma electrónica: ¿acepta descontar la factura ${input.numeroFactura} (${cop(input.valorFactura)}) a una tasa de ${(input.tasaMensual * 100).toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} % mensual y recibir ${cop(input.desembolsoNeto)} en su cuenta registrada?`,
  },
  async execute(input, ctx) {
    const operacion = `OP-${input.numeroFactura}-${ctx.callId.slice(-6).toUpperCase()}`;
    return {
      operacion,
      estado: "desembolsado",
      desembolsoNeto: input.desembolsoNeto,
      cuentaDestino: "Cuenta corriente ****4821 (registrada en onboarding)",
      endosoRadian: "Endoso de la factura al banco registrado en RADIAN",
      origenAprobacion: input.origenAprobacion,
      fuente: "Core bancario + RADIAN (sintético)",
      simulado: true,
    };
  },
});
