import type { CalificacionPagador } from "./data/pymes.ts";

export type Banda = "A" | "B" | "C" | "D";

export type ScoreInput = {
  buroScore: number;
  antiguedadAnios: number;
  calificacionPagador: CalificacionPagador;
  moras: { diasMora: number; hace_meses: number }[];
  concentracionPagadorPct: number;
};

export type Factor = { nombre: string; impacto: number; explicacion: string };

export type ScoreResultado = { score: number; banda: Banda; factores: Factor[] };

export const SCORE_BASE = 520;
export const BANDA_A_MIN = 700;
export const BANDA_B_MIN = 600;
export const BANDA_C_MIN = 450;

const IMPACTO_PAGADOR: Record<CalificacionPagador, number> = {
  AAA: 80, AA: 60, A: 40, "BBB+": 15, BBB: 5, BB: -20, B: -50,
};

export function bandaDeScore(score: number): Banda {
  if (score >= BANDA_A_MIN) return "A";
  if (score >= BANDA_B_MIN) return "B";
  if (score >= BANDA_C_MIN) return "C";
  return "D";
}

/** Los impactos de `factores` suman exactamente el score final (0-1000). */
export function calcularScore(input: ScoreInput): ScoreResultado {
  const buro = Math.round((input.buroScore - 600) * 0.6);
  const antig = Math.round((Math.min(input.antiguedadAnios, 10) - 3) * 5);
  const pagador = IMPACTO_PAGADOR[input.calificacionPagador];
  const moras = -30 * input.moras.length;
  const conc = -Math.round(Math.max(0, input.concentracionPagadorPct - 25));

  const factores: Factor[] = [
    { nombre: "Base", impacto: SCORE_BASE, explicacion: "Puntaje de partida del modelo." },
    { nombre: "Score de buro", impacto: buro, explicacion: `Buro de ${input.buroScore} frente a la referencia de 600.` },
    { nombre: "Antiguedad", impacto: antig, explicacion: `${input.antiguedadAnios} anios de operacion (tope 10; neutro a los 3).` },
    { nombre: "Calificacion del pagador", impacto: pagador, explicacion: `El pagador tiene calificacion ${input.calificacionPagador}.` },
    {
      nombre: "Historial de moras",
      impacto: moras,
      explicacion: input.moras.length === 0 ? "Sin moras reportadas." : `${input.moras.length} mora(s) reportada(s): -30 puntos cada una.`,
    },
    {
      nombre: "Concentracion en el pagador",
      impacto: conc,
      explicacion: `${input.concentracionPagadorPct}% de las ventas depende de este pagador (se penaliza lo que supera 25%).`,
    },
  ];

  const bruto = factores.reduce((s, f) => s + f.impacto, 0);
  const score = Math.max(0, Math.min(1000, bruto));
  if (score !== bruto) {
    factores.push({ nombre: "Ajuste de limites", impacto: score - bruto, explicacion: "El score se limita al rango 0-1000." });
  }
  return { score, banda: bandaDeScore(score), factores };
}
