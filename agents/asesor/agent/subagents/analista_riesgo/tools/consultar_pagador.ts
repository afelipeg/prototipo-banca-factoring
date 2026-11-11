import { defineTool } from "eve/tools";
import { z } from "zod";
import { registrarAuditoria } from "#lib/auditoria.ts";
import { buscarPagador } from "#lib/consultas.ts";

const FUENTE = "Calificación de pagadores (sintético)";

export default defineTool({
  description:
    "Consulta la calificación crediticia y el comportamiento de pago histórico de la empresa pagadora (deudora) de una factura, por nombre. Devuelve calificación, % de pagos a tiempo y días promedio de pago. Datos simulados.",
  inputSchema: z.object({ nombre: z.string().min(3).describe("Razón social del pagador, p. ej. 'Almacenes La Sabana S.A.'") }),
  label: { start: ({ nombre }) => `Consultando pagador ${nombre} (simulado)` },
  async execute({ nombre }) {
    const p = buscarPagador(nombre);
    registrarAuditoria({ agente: "analista_riesgo", accion: "consultar_pagador", fuentes: [FUENTE], resultado: p ? `${p.nombre} ${p.calificacion}` : `no encontrado: ${nombre}` });
    if (!p) return { encontrado: false as const, nombre, mensaje: "Pagador sin calificación registrada.", fuente: FUENTE, simulado: true as const };
    return { encontrado: true as const, ...p, fuente: FUENTE, simulado: true as const };
  },
});
