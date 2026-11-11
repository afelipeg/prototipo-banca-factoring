"use client";

import { memo, useCallback, useMemo } from "react";
import { Bar, BarChart, Cell, LabelList, XAxis, YAxis } from "recharts";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export type BarDatum = {
  readonly label: string;
  readonly value: number;
  /** Token CSS del color, p. ej. `var(--info)`. */
  readonly color?: string;
  /** Texto corto sobre la barra (si no se da, se usa `format`). */
  readonly note?: string;
};

const config = { value: { label: "Valor", color: "var(--info)" } } satisfies ChartConfig;

// recharts 3 memoiza los ejes con comparación superficial y, si una prop cambia de identidad,
// vuelve a registrar el eje en su store durante el layout. Con props en línea (`tick={{...}}`)
// eso ocurre en cada render del padre y, dentro de un chat en streaming, termina en
// "Maximum update depth exceeded". Por eso todas las props de los ejes y del gráfico son estables.
const TICK_Y = { fontSize: 12 } as const;
const TICK_X = { fontSize: 11 } as const;
const MARGIN_VERTICAL = { left: 0, right: 0, top: 16, bottom: 0 } as const;

type BarsChartProps = {
  readonly data: readonly BarDatum[];
  readonly format: (value: number) => string;
  readonly orientation?: "horizontal" | "vertical";
  /** Descripción accesible del gráfico. */
  readonly label: string;
  readonly className?: string;
};

/**
 * Solo se vuelve a dibujar si cambia el contenido (datos, textos, orientación). Dentro de un chat
 * en streaming el padre se re-renderiza con cada evento; sin esto, cada render empuja una
 * actualización al store interno de recharts y React corta con "Maximum update depth exceeded".
 */
function mismoContenido(a: BarsChartProps, b: BarsChartProps): boolean {
  return (
    a.orientation === b.orientation &&
    a.label === b.label &&
    a.className === b.className &&
    JSON.stringify(a.data) === JSON.stringify(b.data) &&
    a.data.map((d) => a.format(d.value)).join("|") === b.data.map((d) => b.format(d.value)).join("|")
  );
}

/** Barras con los tokens de color del tema; `horizontal` pone las etiquetas a la izquierda. */
export const BarsChart = memo(function BarsChart({
  data,
  format,
  orientation = "horizontal",
  label,
  className,
}: {
  readonly data: readonly BarDatum[];
  readonly format: (value: number) => string;
  readonly orientation?: "horizontal" | "vertical";
  /** Descripción accesible del gráfico. */
  readonly label: string;
  readonly className?: string;
}) {
  const horizontal = orientation === "horizontal";
  // Identidad estable mientras el contenido no cambie (el padre puede pasar un arreglo nuevo en cada render).
  const key = JSON.stringify(data);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const rows = useMemo(() => data.map((d) => ({ ...d })), [key]);
  const labels = rows.map((r) => r.note ?? format(r.value)).join("|");
  const noteWidth = Math.max(56, ...labels.split("|").map((t) => t.length * 6 + 8));
  const margin = useMemo(
    () => (horizontal ? { left: 0, right: noteWidth, top: 0, bottom: 0 } : MARGIN_VERTICAL),
    [horizontal, noteWidth],
  );
  const cells = useMemo(() => rows.map((r) => <Cell key={r.label} fill={r.color ?? "var(--info)"} />), [rows]);
  const height = horizontal ? Math.max(120, rows.length * 34 + 8) : 180;
  // El texto de cada etiqueta sale del dato mismo (no del índice: recharts omite barras en 0 y
  // el índice de LabelList deja de coincidir con `rows`).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const labelText = useCallback((d: BarDatum) => d.note ?? format(d.value), [labels]);
  const renderLabel = useCallback(
    (props: unknown) => {
      const { x, y, width, height, value } = props as { x: number; y: number; width: number; height: number; value: unknown };
      return (
        <text
          x={horizontal ? Number(x) + Number(width) + 4 : Number(x) + Number(width) / 2}
          y={horizontal ? Number(y) + Number(height) / 2 : Number(y) - 4}
          textAnchor={horizontal ? "start" : "middle"}
          dominantBaseline={horizontal ? "central" : "auto"}
          className="fill-foreground"
          fontSize={11}
        >
          {String(value ?? "")}
        </text>
      );
    },
    [horizontal],
  );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tooltip = useMemo(
    () => (
      <ChartTooltipContent
        hideLabel
        hideIndicator
        formatter={(value, _name, item) => (
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-muted-foreground">{String((item.payload as BarDatum).label)}</span>
            <span className="font-mono font-medium text-foreground tabular-nums">{format(Number(value))}</span>
          </div>
        )}
      />
    ),
    [labels],
  );
  return (
    <ChartContainer config={config} className={className ?? "w-full"} style={{ height }} role="img" aria-label={label}>
      <BarChart
        data={rows}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={margin}
        accessibilityLayer
      >
        {horizontal ? (
          <>
            <YAxis dataKey="label" type="category" tickLine={false} axisLine={false} width={104} tick={TICK_Y} />
            <XAxis type="number" hide />
          </>
        ) : (
          <>
            <XAxis dataKey="label" type="category" tickLine={false} axisLine={false} tick={TICK_X} interval={0} />
            <YAxis type="number" hide />
          </>
        )}
        <ChartTooltip cursor={false} content={tooltip} />
        <Bar dataKey="value" radius={4} maxBarSize={horizontal ? 18 : 40}>
          {cells}
          <LabelList dataKey={labelText} content={renderLabel} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}, mismoContenido);
