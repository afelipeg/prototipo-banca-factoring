import type { EstadoRadian, EstadoSarlaft } from "./data/pymes.ts";
import type { Banda } from "./score.ts";

export const UMBRAL_COMITE_COP = 200_000_000;

export type PoliticasInput = {
  score: number;
  banda: Banda;
  monto: number;
  radianEstado: EstadoRadian;
  sarlaft: EstadoSarlaft;
  kycConsistente: boolean;
};

export type Decision = "aprobacion_automatica" | "comite_humano" | "rechazo";

export type PoliticasResultado = { decision: Decision; motivos: string[]; reglasAplicadas: string[] };

export function evaluarPoliticas(i: PoliticasInput): PoliticasResultado {
  const rechazo: { regla: string; motivo: string }[] = [];
  const comite: { regla: string; motivo: string }[] = [];

  if (i.radianEstado === "endosada" || i.radianEstado === "rechazada") {
    rechazo.push({ regla: "R1_RADIAN_NO_DISPONIBLE", motivo: `La factura esta en estado RADIAN "${i.radianEstado}": no puede financiarse.` });
  }
  if (i.sarlaft === "coincidencia_confirmada") {
    rechazo.push({ regla: "R2_LISTA_RESTRICTIVA", motivo: "Coincidencia confirmada en lista restrictiva (SARLAFT)." });
  }
  if (i.banda === "D") {
    rechazo.push({ regla: "R3_BANDA_D", motivo: `Banda de riesgo D (score ${i.score}).` });
  }
  if (i.monto > UMBRAL_COMITE_COP) {
    comite.push({ regla: "C1_MONTO_ALTO", motivo: `El monto supera el umbral de ${UMBRAL_COMITE_COP.toLocaleString("es-CO")} COP.` });
  }
  if (i.banda === "C") {
    comite.push({ regla: "C2_BANDA_C", motivo: `Banda de riesgo C (score ${i.score}).` });
  }
  if (i.sarlaft === "coincidencia_parcial") {
    comite.push({ regla: "C3_SARLAFT_PARCIAL", motivo: "Coincidencia parcial en SARLAFT: requiere revision humana." });
  }
  if (!i.kycConsistente) {
    comite.push({ regla: "C4_KYC_INCONSISTENTE", motivo: "Datos de RUT y Camara de Comercio inconsistentes." });
  }

  const hallazgos = rechazo.length > 0 ? [...rechazo, ...comite] : comite;
  if (rechazo.length > 0) return { decision: "rechazo", motivos: hallazgos.map((h) => h.motivo), reglasAplicadas: hallazgos.map((h) => h.regla) };
  if (comite.length > 0) return { decision: "comite_humano", motivos: comite.map((h) => h.motivo), reglasAplicadas: comite.map((h) => h.regla) };
  return {
    decision: "aprobacion_automatica",
    motivos: ["Cumple todas las politicas de riesgo, monto, RADIAN, SARLAFT y KYC."],
    reglasAplicadas: ["A1_CUMPLE_POLITICAS"],
  };
}
