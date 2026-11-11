import { Badge } from "@/components/reui/badge";
import { Card, CardContent } from "@/components/ui/card";

import { CardDotField } from "./card-dot-field";
import type { MetricCard } from "./data";
import { PanelCorners } from "./panel-heading";
import { toneStyles } from "./tone-styles";

function Sparkline({ values, color, label }: { values: readonly number[]; color: string; label: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = Math.max(Number.EPSILON, max - min);
  const points = values.map((value, index) => ({
    x: (index / (values.length - 1)) * 72,
    y: 28 - ((value - min) / spread) * 22,
  }));
  // Catmull-Rom -> Bézier cúbica: línea suave como las curvas `natural` de los gráficos.
  const path = points.reduce((acc, point, index) => {
    if (index === 0) return `M ${point.x.toFixed(1)},${point.y.toFixed(1)}`;
    const p0 = points[index - 2] ?? points[index - 1]!;
    const p1 = points[index - 1]!;
    const p3 = points[index + 1] ?? point;
    const c1x = p1.x + (point.x - p0.x) / 6;
    const c1y = p1.y + (point.y - p0.y) / 6;
    const c2x = point.x - (p3.x - p1.x) / 6;
    const c2y = point.y - (p3.y - p1.y) / 6;
    return `${acc} C ${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${point.x.toFixed(1)},${point.y.toFixed(1)}`;
  }, "");

  return (
    <svg viewBox="0 0 72 32" className="h-9 w-24 shrink-0 opacity-95" role="img" aria-label={label}>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricTile({ metric }: { metric: MetricCard }) {
  const tone = toneStyles[metric.tone];
  return (
    <Card className="relative overflow-hidden p-0">
      <CardDotField className="text-muted-foreground [mask-image:radial-gradient(72%_64%_at_50%_44%,black,transparent)] opacity-70" />
      <PanelCorners />
      <CardContent className="relative z-10 flex min-h-[7.25rem] flex-col justify-between gap-5 p-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm leading-4 font-semibold text-foreground">{metric.title}</span>
          <span className="truncate text-xs leading-4 text-muted-foreground">{metric.label}</span>
        </div>
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 space-y-2.5">
            <div className="text-2xl leading-none font-semibold tracking-tight text-foreground tabular-nums">{metric.value}</div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={metric.deltaVariant} radius="full">
                {metric.delta}
              </Badge>
              <span className="text-xs text-muted-foreground">{metric.detail}</span>
            </div>
          </div>
          <Sparkline values={metric.sparkline} color={tone.stroke} label={`Tendencia de ${metric.title}`} />
        </div>
      </CardContent>
    </Card>
  );
}
