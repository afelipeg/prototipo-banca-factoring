"use client";

import { CircleCheckIcon, CircleXIcon } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/reui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";

import type { EvalCase } from "./data";

const num = (n: number, d = 0) => n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
const AGENTE: Record<string, string> = { asesor: "Asesor", copiloto: "Copiloto" };

/** Nombre legible de una aserción de eve (`judge.boolean [x]`, `calledTool(y)`, ...). */
function nombreAsercion(nombre: string) {
  return nombre
    .replace(/^judge\.boolean\.?/, "Juez: ")
    .replace(/^judge\.boolean \[(.+)\]$/, "Juez: $1")
    .replace(/^Juez: \[(.+)\]$/, "Juez: $1")
    .replace(/_/g, " ");
}

// c-trace-18: cada caso abre su detalle; los fallos abren primero.
export function EvalsTrace({ casos }: { casos: readonly EvalCase[] }) {
  const [soloFallos, setSoloFallos] = useState(false);
  const fallidos = casos.filter((c) => c.veredicto !== "passed");
  const visibles = soloFallos ? fallidos : casos;

  return (
    <div className="flex w-full flex-col gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Switch id="solo-fallos" size="sm" checked={soloFallos} onCheckedChange={setSoloFallos} />
        <Label htmlFor="solo-fallos">Solo fallos</Label>
      </div>
      <Trace>
        {visibles.map((c) => {
          const ok = c.veredicto === "passed";
          const minimo = Math.min(...c.aserciones.map((a) => a.puntaje));
          return (
            <TraceCollapsible key={c.id} defaultOpen={!ok && c.id === fallidos[0]?.id}>
              <TraceCollapsibleTrigger>
                <TraceLine status={ok ? undefined : "error"}>
                  <TraceIcon>{ok ? <CircleCheckIcon /> : <CircleXIcon />}</TraceIcon>
                  <TraceTitle>
                    {ok ? "" : "Falló: "}
                    {AGENTE[c.agente] ?? c.agente} · {c.descripcion}
                  </TraceTitle>
                  <TraceDescription>
                    {num(minimo, 2)} · {num(c.duracionMs / 1000, 0)} s · USD {num(c.costoUsd, 3)}
                  </TraceDescription>
                </TraceLine>
              </TraceCollapsibleTrigger>
              <TraceCollapsibleContent>
                <div className="flex flex-col gap-3 py-1 text-xs">
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" radius="full">
                      {c.id}
                    </Badge>
                    {c.tags.map((t) => (
                      <Badge key={t} variant="info-light" radius="full">
                        {t}
                      </Badge>
                    ))}
                    <Badge variant="secondary" radius="full">
                      {num(c.herramientas)} llamadas · {num(c.tokens)} tokens
                    </Badge>
                  </div>
                  <dl className="flex flex-col gap-1.5">
                    {c.aserciones.map((a, i) => (
                      <div key={`${a.nombre}-${i}`} className="flex gap-3">
                        <dt className={a.aprobada ? "w-5 shrink-0 text-success" : "w-5 shrink-0 text-destructive"}>
                          {a.aprobada ? "✓" : "✗"}
                        </dt>
                        <dd className="min-w-0 text-foreground">
                          <span className="font-medium">{nombreAsercion(a.nombre)}</span>
                          <span className="text-muted-foreground">
                            {" "}
                            · {num(a.puntaje, 2)}
                            {a.umbral != null ? ` (umbral ${num(a.umbral, 2)}, ${a.severidad === "gate" ? "bloqueante" : "medido"})` : ""}
                          </span>
                          {a.criterio ? <p className="text-muted-foreground">{a.criterio}</p> : null}
                          {a.detalle ? <p className="text-destructive">{a.detalle}</p> : null}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {c.respuesta ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground">Respuesta del agente</span>
                      <p className="min-w-0 whitespace-pre-line text-foreground">{c.respuesta.replace(/\*\*/g, "")}</p>
                    </div>
                  ) : null}
                </div>
              </TraceCollapsibleContent>
            </TraceCollapsible>
          );
        })}
        {soloFallos && fallidos.length === 0 ? (
          <TraceLine>
            <TraceTitle>Sin fallos en esta corrida: {casos.length} casos aprobados.</TraceTitle>
          </TraceLine>
        ) : null}
      </Trace>
    </div>
  );
}
