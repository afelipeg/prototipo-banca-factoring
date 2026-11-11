import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { buscarPyme } from "#lib/consultas.ts";

const FUENTE = "Servicio de recordatorios del banco (sintético)";
let secuencia = 0;

export default defineTool({
  description:
    "Programa un recordatorio al cliente (por correo, WhatsApp o SMS) sobre una operación, por ejemplo el vencimiento de una factura financiada. No envía nada real: solo registra el recordatorio.",
  inputSchema: z.object({
    nit: z.string().min(9).describe("NIT de la empresa"),
    idOperacion: z.string().min(1).describe("Id de la operación, p. ej. OP-0002"),
    fechaRecordatorio: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Fecha ISO YYYY-MM-DD"),
    canal: z.enum(["correo", "whatsapp", "sms"]),
    mensaje: z.string().min(1).describe("Texto del recordatorio, en español"),
  }),
  label: { start: ({ idOperacion }) => `Programando recordatorio para ${idOperacion} (simulado)` },
  async execute(input) {
    const p = buscarPyme(input.nit);
    registrarAuditoria({ caseId: p?.nit ?? input.nit, agente: "acompanamiento", accion: "programar_recordatorio", fuentes: [FUENTE], resultado: p ? `${input.idOperacion} el ${input.fechaRecordatorio} por ${input.canal}` : "NIT no encontrado" });
    if (!p) return { encontrado: false as const, nit: input.nit, mensaje: "NIT no registrado; no se programó el recordatorio.", fuente: FUENTE, simulado: true as const };
    return { encontrado: true as const, programado: true as const, recordatorioId: `REC-${String(++secuencia).padStart(5, "0")}`, ...input, nit: p.nit, fuente: FUENTE, simulado: true as const };
  },
});
