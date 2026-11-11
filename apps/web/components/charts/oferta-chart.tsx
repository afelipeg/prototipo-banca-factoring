"use client";

import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import { formatCop } from "@/lib/format";
import { BarsChart } from "./bars";

export type OfertaOutput = {
  readonly hayOferta: true;
  readonly valorAnticipado: number;
  readonly descuento: number;
  readonly comisionEstudio: number;
  readonly gmf: number;
  readonly desembolsoNeto: number;
};

const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);

/** Reconoce la salida de `calcular_oferta` con oferta; si no, devuelve undefined. */
export function asOferta(output: unknown): OfertaOutput | undefined {
  if (typeof output !== "object" || output === null) return undefined;
  const o = output as Record<string, unknown>;
  if (o.hayOferta !== true) return undefined;
  if (![o.valorAnticipado, o.descuento, o.comisionEstudio, o.gmf, o.desembolsoNeto].every(num)) return undefined;
  return o as unknown as OfertaOutput;
}

const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

export function OfertaChart({ oferta }: { readonly oferta: OfertaOutput }) {
  const data = [
    { label: "Valor anticipado", value: oferta.valorAnticipado, color: "var(--info)" },
    { label: "Descuento", value: oferta.descuento, color: "var(--warning)" },
    { label: "Comisión de estudio", value: oferta.comisionEstudio, color: "var(--warning)" },
    { label: "GMF (4x1000)", value: oferta.gmf, color: "var(--muted-foreground)" },
    { label: "Desembolso neto", value: oferta.desembolsoNeto, color: "var(--success)" },
  ];
  return (
    <Frame spacing="sm">
      <FrameHeader>
        <FrameTitle>Oferta en cifras</FrameTitle>
        <FrameDescription>Valores en COP, de la oferta calculada</FrameDescription>
      </FrameHeader>
      <FramePanel>
        <BarsChart data={data} format={(v) => compact.format(v)} label={`Oferta: desembolso neto ${formatCop(oferta.desembolsoNeto)}`} />
        <p className="mt-2 text-xs text-muted-foreground">Desembolso neto: {formatCop(oferta.desembolsoNeto)}</p>
      </FramePanel>
    </Frame>
  );
}
