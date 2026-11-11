import { buscarFactura, buscarPagador, buscarPyme, diasHasta, kycConsistente } from "./consultas.ts";
import type { Factura, Pagador, Pyme } from "./data/pymes.ts";
import { calcularOferta, type OfertaResultado } from "./oferta.ts";
import { evaluarPoliticas, type PoliticasResultado } from "./politicas.ts";
import { calcularScore, type ScoreResultado } from "./score.ts";

export type Expediente = {
  pyme: Pyme;
  factura: Factura;
  pagador: Pagador;
  diasAlVencimiento: number;
  score: ScoreResultado;
  politicas: PoliticasResultado;
  oferta: OfertaResultado | null;
  kycConsistente: boolean;
};

/** Arma el expediente completo de una factura desde los sistemas (sintéticos) del banco. */
export function armarExpediente(numeroFactura: string): Expediente | undefined {
  const factura = buscarFactura(numeroFactura);
  const pyme = factura ? buscarPyme(factura.nit) : undefined;
  const pagador = factura ? buscarPagador(factura.pagador) : undefined;
  if (!factura || !pyme || !pagador) return undefined;

  const score = calcularScore({
    buroScore: pyme.buro.score,
    antiguedadAnios: pyme.camara.antiguedadAnios,
    calificacionPagador: pagador.calificacion,
    moras: pyme.buro.moras,
    concentracionPagadorPct: pyme.concentracionPagadorPct,
  });
  const consistente = kycConsistente(pyme);
  const politicas = evaluarPoliticas({
    score: score.score,
    banda: score.banda,
    monto: factura.valor,
    radianEstado: factura.estadoRadian,
    sarlaft: pyme.sarlaft.estado,
    kycConsistente: consistente,
  });
  const diasAlVencimiento = diasHasta(factura.fechaVencimiento);
  const oferta =
    politicas.decision === "rechazo" ? null : calcularOferta({ valorFactura: factura.valor, diasAlVencimiento, banda: score.banda });

  return { pyme, factura, pagador, diasAlVencimiento, score, politicas, oferta, kycConsistente: consistente };
}
