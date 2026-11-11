import type { Expediente } from "./expediente.ts";

/**
 * Motor de riesgo semántico con Jev (TypeSafe System One).
 * Jev NO reemplaza el score: el score de buró y las políticas siguen siendo código determinista
 * y auditable. Jev aporta juicios sobre el contexto del caso (pagador, monto frente a ventas,
 * estado de la factura) como probabilidades tipadas; el semáforo final lo compone este código.
 * API: POST https://api.typesafe.ai/v1/systemone (https://docs.typesafe.ai/api).
 */
const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
export const JEV_MODEL = "jev-latest";

export const NIVELES_IMPAGO = [
  "Muy baja: pagador sólido que paga puntual y el monto es usual para la relación comercial",
  "Baja: riesgo menor, con algún factor aislado de atención",
  "Media: varios factores de atención (retrasos del pagador, sector cíclico o monto alto frente a ventas)",
  "Alta: el pagador suele pagar tarde o con baja calificación, o la factura presenta irregularidades",
  "Muy alta: es probable que la factura no se pague al vencimiento",
] as const;

export const MOTIVOS = {
  calidad_pagador: "La calificación o el comportamiento de pago del pagador",
  historial_pyme: "El historial de crédito de la empresa (buró, moras)",
  concentracion: "La alta dependencia de la empresa en un solo pagador",
  monto_vs_ventas: "El monto de la factura frente al tamaño de la empresa",
  sin_riesgo_relevante: "No hay un factor de riesgo relevante",
} as const;
/** Motivo fijado por regla (hecho exacto de RADIAN), no por Jev. */
const MOTIVO_RADIAN = { estado_factura: "La factura no está disponible en RADIAN (endosada o rechazada): posible doble financiación" } as const;
export type Motivo = keyof typeof MOTIVOS | keyof typeof MOTIVO_RADIAN;

export type Semaforo = "verde" | "amarillo" | "rojo";

export type PrediccionJev = {
  disponible: true;
  modelo: string;
  /** Probabilidad de impago al vencimiento, 0-1 (posición esperada en la escala de 5 niveles). */
  probImpago: number;
  distribucionImpago: { nivel: string; probabilidad: number }[];
  confianzaImpago: number;
  probDisputa: number;
  probFraude: number;
  probCoherencia: number;
  motivoPrincipal: Motivo;
  motivoDescripcion: string;
  /** "regla" cuando el motivo sale de un hecho exacto (RADIAN); "jev" cuando lo eligió el modelo. */
  motivoFuente: "regla" | "jev";
  probabilidadesMotivo: Record<string, number>;
  semaforo: Semaforo;
  razonesSemaforo: string[];
  tokens: number | null;
};

export type ResultadoJev = PrediccionJev | { disponible: false; mensaje: string };

/** Estado que recibe Jev: solo hechos del expediente, sin PII de personas. */
export function estadoParaJev(e: Expediente) {
  return {
    empresa: {
      actividad: e.pyme.rut.actividad,
      ciiu: e.pyme.rut.ciiu,
      antiguedadAnios: e.pyme.camara.antiguedadAnios,
      ventasAnualesCOP: e.pyme.ventasAnualesCOP,
      concentracionEnUnPagadorPct: e.pyme.concentracionPagadorPct,
      buro: { score: e.pyme.buro.score, moras: e.pyme.buro.moras, consultasUltimos6Meses: e.pyme.buro.consultasUltimos6Meses },
      sarlaft: e.pyme.sarlaft.estado,
    },
    factura: {
      valorCOP: e.factura.valor,
      montoSobreVentasAnualesPct: Number(((e.factura.valor / e.pyme.ventasAnualesCOP) * 100).toFixed(1)),
      diasAlVencimiento: e.diasAlVencimiento,
      estadoRadian: e.factura.estadoRadian,
      endosadaA: e.factura.endoso?.endosatario ?? null,
    },
    pagador: {
      sector: e.pagador.sector,
      calificacion: e.pagador.calificacion,
      pagaATiempoPct: e.pagador.pagaATiempoPct,
      diasPromedioDeRetraso: e.pagador.diasPromedioPago,
    },
  };
}

export const PREGUNTAS = {
  impago: {
    type: "score",
    instructions:
      "Operación de factoring: el banco anticipa el valor de `factura` y cobra al `pagador` al vencimiento. ¿Qué tan probable es que el pagador NO pague la factura completa a tiempo al vencimiento?",
    criteria: [...NIVELES_IMPAGO],
  },
  disputa: {
    type: "noul",
    instructions:
      "¿Hay señales de que el pagador pueda disputar, glosar o rechazar el pago de esta factura (por ejemplo, monto atípico frente al tamaño de la empresa, pagador con retrasos frecuentes o factura ya endosada a otro)?",
  },
  fraude: {
    type: "noul",
    instructions:
      "¿Hay señales de posible fraude o doble financiación en esta operación (factura ya endosada a otro factor, coincidencias en listas SARLAFT o datos inconsistentes)?",
  },
  coherencia: {
    type: "noul",
    instructions:
      "¿El monto de la factura y el sector del pagador son coherentes con la actividad económica y el tamaño de la empresa?",
  },
  motivo: {
    type: "choice",
    instructions: "¿Cuál es el principal factor de riesgo de esta operación de factoring?",
    criteria: MOTIVOS,
  },
} as const;

type RespuestaApi = {
  model?: string;
  answers: {
    impago: { score: number; confidence: number; probabilities: Record<string, number> };
    disputa: { noul: number };
    fraude: { noul: number };
    coherencia: { noul: number };
    motivo: { choice: string; confidence: number; probabilities: Record<string, number> };
  };
  usage?: { input_tokens?: number };
};

/** Compone el semáforo: reglas explícitas en código sobre las probabilidades de Jev y la banda del score. */
export function componerSemaforo(
  p: { probImpago: number; probDisputa: number; probFraude: number; probCoherencia: number },
  banda: string,
): { semaforo: Semaforo; razones: string[] } {
  const rojo: string[] = [];
  const amarillo: string[] = [];
  if (p.probFraude >= 0.6) rojo.push(`Señal de fraude o doble financiación (${pct(p.probFraude)})`);
  if (p.probImpago >= 0.6) rojo.push(`Probabilidad de impago alta (${pct(p.probImpago)})`);
  if (banda === "D") rojo.push("Banda de score D");
  if (p.probImpago >= 0.35 && p.probImpago < 0.6) amarillo.push(`Probabilidad de impago media (${pct(p.probImpago)})`);
  if (p.probDisputa >= 0.5) amarillo.push(`Posible disputa del pagador (${pct(p.probDisputa)})`);
  if (p.probCoherencia < 0.5) amarillo.push(`Monto o pagador poco coherente con la actividad (${pct(p.probCoherencia)})`);
  if (banda === "C") amarillo.push("Banda de score C");
  if (rojo.length) return { semaforo: "rojo", razones: [...rojo, ...amarillo] };
  if (amarillo.length) return { semaforo: "amarillo", razones: amarillo };
  return { semaforo: "verde", razones: ["Sin señales de riesgo relevantes"] };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export async function predecirConJev(e: Expediente, signal?: AbortSignal): Promise<ResultadoJev> {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) return { disponible: false, mensaje: "El motor Jev no está configurado (falta TYPESAFE_API_KEY)." };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: JEV_MODEL, state: estadoParaJev(e), questions: PREGUNTAS }),
    signal,
  });
  if (!res.ok) {
    return { disponible: false, mensaje: `El motor Jev respondió ${res.status}; la decisión sigue con el score determinista.` };
  }
  const data = (await res.json()) as RespuestaApi;
  const a = data.answers;
  const niveles = NIVELES_IMPAGO.length - 1;
  const probImpago = a.impago.score / niveles;
  const base = { probImpago, probDisputa: a.disputa.noul, probFraude: a.fraude.noul, probCoherencia: a.coherencia.noul };
  const { semaforo, razones } = componerSemaforo(base, e.score.banda);
  const radianBloquea = e.factura.estadoRadian === "endosada" || e.factura.estadoRadian === "rechazada";
  const motivo: Motivo = radianBloquea
    ? "estado_factura"
    : ((a.motivo.choice in MOTIVOS ? a.motivo.choice : "sin_riesgo_relevante") as Motivo);

  return {
    disponible: true,
    modelo: data.model ?? JEV_MODEL,
    ...base,
    distribucionImpago: NIVELES_IMPAGO.map((n, i) => ({
      nivel: n.split(":")[0]!,
      probabilidad: a.impago.probabilities[String(i)] ?? 0,
    })),
    confianzaImpago: a.impago.confidence,
    motivoPrincipal: motivo,
    motivoDescripcion: motivo === "estado_factura" ? MOTIVO_RADIAN.estado_factura : MOTIVOS[motivo],
    motivoFuente: radianBloquea ? "regla" : "jev",
    probabilidadesMotivo: a.motivo.probabilities,
    semaforo,
    razonesSemaforo: razones,
    tokens: data.usage?.input_tokens ?? null,
  };
}
