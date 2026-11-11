"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { Badge } from "@/components/reui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { cn } from "@/lib/utils";

import type { carriles as Carriles, evalsPorCategoria, latenciaPorModelo, traficoHorario } from "./data";
import { PanelCorners, PanelHeading } from "./panel-heading";
import { toneStyles } from "./tone-styles";

// Props estables a nivel de módulo: Recharts 3 vuelve a despachar ajustes si cambian por render.
const GRID = { vertical: false, stroke: "var(--border)", strokeDasharray: "3 3", strokeOpacity: 0.75 } as const;
const TICK = { fontSize: 10 } as const;
const MARGIN = { top: 8, right: 4, bottom: 0, left: 4 } as const;
const RADIUS: [number, number, number, number] = [5, 5, 5, 5];

const num = (v: unknown, d = 0) =>
  Number(v ?? 0).toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });

function Leyenda({ items }: { items: { label: string; className: string }[] }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-4 text-xs text-muted-foreground sm:justify-end">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", i.className)} aria-hidden="true" />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function Fila({ config, value, name, unidad }: { config: ChartConfig; value: unknown; name: unknown; unidad?: string }) {
  const c = config[String(name)];
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex items-center gap-1.5">
        <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: c?.color }} aria-hidden="true" />
        <span className="text-muted-foreground">{c?.label ?? String(name)}</span>
      </div>
      <span className="font-semibold text-foreground tabular-nums">
        {num(value, unidad === "s" ? 2 : 0)}
        {unidad ? ` ${unidad}` : ""}
      </span>
    </div>
  );
}

const evalsConfig = {
  deterministas: { label: "Verificaciones en código", color: "var(--color-blue-600)" },
  juez: { label: "Juicios de Jev", color: "var(--color-sky-300)" },
} satisfies ChartConfig;

export function EvalsPorCategoriaPanel({ data }: { data: typeof evalsPorCategoria }) {
  return (
    <Card className="relative overflow-hidden p-0">
      <PanelCorners />
      <CardContent className="flex flex-col gap-5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PanelHeading title="Evals por categoría" description="Aserciones aprobadas: verificaciones en código y juicios del modelo Jev" />
          <Leyenda
            items={[
              { label: "En código", className: "bg-blue-600" },
              { label: "Juez Jev", className: "bg-sky-300" },
            ]}
          />
        </div>
        <ChartContainer config={evalsConfig} className="h-56 w-full min-w-0">
          <BarChart accessibilityLayer data={data} margin={MARGIN} barGap={3} barCategoryGap={8}>
            <defs>
              <pattern id="metricas-evals-casos" patternUnits="userSpaceOnUse" width="8" height="8">
                <rect width="8" height="8" fill="var(--color-deterministas)" opacity="0.1" />
                <path d="M0,8 L8,0 M4,12 L12,4 M-4,4 L4,-4" stroke="var(--color-deterministas)" strokeWidth="1.5" opacity="0.55" />
              </pattern>
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} tick={TICK} />
            <YAxis hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" className="min-w-40 gap-2" formatter={(v, n) => <Fila config={evalsConfig} value={v} name={n} />} />}
            />
            <Bar dataKey="deterministas" fill="url(#metricas-evals-casos)" stroke="var(--color-deterministas)" strokeWidth={1} radius={RADIUS} isAnimationActive={false} />
            <Bar dataKey="juez" fill="var(--color-juez)" fillOpacity={0.86} stroke="var(--color-juez)" strokeWidth={1} radius={RADIUS} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const traficoConfig = {
  solicitudes: { label: "Solicitudes al modelo", color: "var(--color-emerald-500)" },
} satisfies ChartConfig;

export function TraficoPanel({ data, costo, solicitudes }: { data: typeof traficoHorario; costo: string; solicitudes: string }) {
  return (
    <Card className="relative overflow-hidden p-0">
      <PanelCorners />
      <CardContent className="flex flex-col gap-5 p-4">
        <div className="flex items-start justify-between gap-3">
          <PanelHeading title="Tráfico del AI Gateway" description={`Solicitudes por hora (últimas 24 h) · ${solicitudes} en la ventana`} />
          <Badge variant="info-light" radius="full" className="tabular-nums">
            {costo}
          </Badge>
        </div>
        <ChartContainer config={traficoConfig} className="h-56 w-full min-w-0">
          <AreaChart accessibilityLayer data={data} margin={MARGIN}>
            <defs>
              <pattern id="metricas-trafico" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
                <path d="M0,8 L8,0" stroke="var(--color-solicitudes)" strokeWidth="0.8" opacity="0.4" />
                <path d="M0,0 L8,8" stroke="var(--color-solicitudes)" strokeWidth="0.8" opacity="0.2" />
              </pattern>
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="tick" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} tick={TICK} />
            <YAxis hide />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  className="min-w-44 gap-2"
                  labelFormatter={(_, p) => <span className="text-xs font-medium">{p?.[0]?.payload?.tick} · USD {num(p?.[0]?.payload?.costo, 2)}</span>}
                  formatter={(v, n) => <Fila config={traficoConfig} value={v} name={n} />}
                />
              }
            />
            <Area dataKey="solicitudes" type="monotone" fill="url(#metricas-trafico)" fillOpacity={0.5} stroke="var(--color-solicitudes)" strokeWidth={1.25} isAnimationActive={false} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

const latenciaConfig = {
  p50: { label: "p50", color: "var(--color-zinc-400)" },
  p95: { label: "p95", color: "var(--color-amber-500)" },
} satisfies ChartConfig;

export function LatenciaPanel({ data, exito }: { data: typeof latenciaPorModelo; exito: string }) {
  return (
    <Card className="relative h-full overflow-hidden p-0">
      <PanelCorners />
      <CardContent className="flex h-full flex-col p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <PanelHeading title="Latencia por modelo" description="Segundos por llamada (AI Gateway)" />
            <Leyenda
              items={[
                { label: "p50", className: "bg-zinc-400" },
                { label: "p95", className: "bg-amber-500" },
              ]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <Badge variant="success-light" radius="full" className="h-6 gap-1.5 px-2 text-xs">
              <span className="font-semibold tabular-nums">{exito}</span>
              <span>éxito</span>
            </Badge>
            {data.map((m) => (
              <Badge key={m.name} variant="secondary" radius="full" className="h-6 gap-1.5 px-2 text-xs">
                <span className="font-semibold tabular-nums">{num(m.solicitudes)}</span>
                <span>{m.name}</span>
              </Badge>
            ))}
          </div>
        </div>
        <ChartContainer config={latenciaConfig} className="mt-auto h-60 w-full min-w-0 pt-5">
          <BarChart accessibilityLayer data={data} margin={MARGIN} barGap={3} barCategoryGap={18}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tickMargin={10} tick={TICK} />
            <YAxis hide />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" className="min-w-36 gap-2" formatter={(v, n) => <Fila config={latenciaConfig} value={v} name={n} unidad="s" />} />}
            />
            <Bar dataKey="p50" fill="var(--color-p50)" fillOpacity={0.7} radius={RADIUS} isAnimationActive={false} />
            <Bar dataKey="p95" fill="var(--color-p95)" radius={RADIUS} isAnimationActive={false} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export function CarrilesPanel({ carriles }: { carriles: typeof Carriles }) {
  return (
    <Card className="relative overflow-hidden p-0">
      <PanelCorners />
      <CardContent className="space-y-5 p-4">
        <PanelHeading title="Alertas y controles" description="Riesgo de cartera y guardrails" />
        <div className="space-y-4">
          {carriles.map((c) => {
            const tone = toneStyles[c.tone];
            return (
              <div key={c.id} className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={cn("size-2 shrink-0 rounded-full", tone.dot)} aria-hidden="true" />
                      <span className="truncate text-sm font-medium">{c.label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{c.source}</span>
                      <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-muted-foreground/40" />
                      <span>{c.state}</span>
                    </div>
                  </div>
                  <div className="text-right text-sm font-semibold tabular-nums">{c.value}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${Math.round(c.progress)}%` }} />
                  </div>
                  <span className="w-8 text-right text-xs leading-none text-muted-foreground tabular-nums">{Math.round(c.progress)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
