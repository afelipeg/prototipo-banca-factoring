import type { Banda } from "./score.ts";

export const ANTICIPO_PCT = 0.9;
export const TASA_MENSUAL_POR_BANDA: Record<Exclude<Banda, "D">, number> = { A: 0.0145, B: 0.0175, C: 0.021 };
export const COMISION_ESTUDIO_PCT = 0.005;
export const COMISION_ESTUDIO_MINIMA = 150_000;
export const GMF_PCT = 0.004;

export type OfertaInput = { valorFactura: number; diasAlVencimiento: number; banda: Banda };

export type OfertaResultado =
  | { hayOferta: false; motivo: string }
  | {
      hayOferta: true;
      valorFactura: number;
      diasAlVencimiento: number;
      banda: Exclude<Banda, "D">;
      anticipoPct: number;
      valorAnticipado: number;
      tasaMensual: number;
      descuento: number;
      comisionEstudio: number;
      desembolsoBruto: number;
      gmf: number;
      desembolsoNeto: number;
      costoTotal: number;
      /** Efectivo anual aproximado, como fraccion (0.2845 = 28,45%). */
      costoEfectivoAnual: number;
    };

/** desembolsoNeto = valorAnticipado - descuento - comisionEstudio - gmf. */
export function calcularOferta({ valorFactura, diasAlVencimiento, banda }: OfertaInput): OfertaResultado {
  if (banda === "D") return { hayOferta: false, motivo: "Banda D: el riesgo supera el apetito del banco; no se genera oferta." };

  const tasaMensual = TASA_MENSUAL_POR_BANDA[banda];
  const valorAnticipado = Math.round(valorFactura * ANTICIPO_PCT);
  const descuento = Math.round((valorAnticipado * tasaMensual * diasAlVencimiento) / 30);
  const comisionEstudio = Math.max(COMISION_ESTUDIO_MINIMA, Math.round(valorFactura * COMISION_ESTUDIO_PCT));
  const desembolsoBruto = valorAnticipado - descuento - comisionEstudio;
  const gmf = Math.round(desembolsoBruto * GMF_PCT);
  const desembolsoNeto = desembolsoBruto - gmf;
  const costoTotal = descuento + comisionEstudio + gmf;
  const tasaPeriodo = costoTotal / desembolsoNeto;
  const costoEfectivoAnual = Math.round(((1 + tasaPeriodo) ** (365 / diasAlVencimiento) - 1) * 10_000) / 10_000;

  return {
    hayOferta: true, valorFactura, diasAlVencimiento, banda, anticipoPct: ANTICIPO_PCT, valorAnticipado, tasaMensual,
    descuento, comisionEstudio, desembolsoBruto, gmf, desembolsoNeto, costoTotal, costoEfectivoAnual,
  };
}
