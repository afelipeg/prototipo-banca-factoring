"use client";

import { CheckCircle2Icon } from "lucide-react";
import { Badge } from "@/components/reui/badge";
import {
  Timeline,
  TimelineContent,
  TimelineDate,
  TimelineHeader,
  TimelineIndicator,
  TimelineItem,
  TimelineSeparator,
  TimelineTitle,
} from "@/components/reui/timeline";
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker";
import { Spinner } from "@/components/ui/spinner";
import { formatTime } from "@/lib/format";
import { STATE_LABELS, type Trace, type TraceActor, type TraceStep } from "@/lib/trace";
import { cn } from "@/lib/utils";

type BadgeVariant = "success-light" | "info-light" | "warning-light" | "destructive-light" | "outline";

const STATE_VARIANT: Record<TraceStep["state"], BadgeVariant> = {
  completed: "success-light",
  running: "info-light",
  requested: "info-light",
  approval: "warning-light",
  blocked: "warning-light",
  failed: "destructive-light",
  rejected: "destructive-light",
  cancelled: "outline",
};

const APPROVAL_LABEL = { pendiente: "Firma pendiente", firmado: "Firmado", rechazado: "Firma rechazada" } as const;
const APPROVAL_VARIANT = { pendiente: "warning-light", firmado: "success-light", rechazado: "destructive-light" } as const;

const isLive = (state: TraceStep["state"]) => state === "running" || state === "requested";

/** Anillo del indicador: color según el estado; el paso en curso lleva el spinner. */
function dotClass(state: TraceStep["state"]): string {
  if (isLive(state)) return "flex items-center justify-center border-0 text-info";
  if (state === "failed" || state === "rejected") return "border-destructive group-data-completed/timeline-item:border-destructive";
  if (state === "approval" || state === "blocked") return "border-warning group-data-completed/timeline-item:border-warning";
  if (state === "cancelled") return "border-border group-data-completed/timeline-item:border-border";
  return "border-success group-data-completed/timeline-item:border-success";
}

function stepDuration(step: TraceStep): string | undefined {
  if (!step.startedAt || !step.endedAt) return undefined;
  const ms = Date.parse(step.endedAt) - Date.parse(step.startedAt);
  if (!Number.isFinite(ms) || ms < 0) return undefined;
  if (ms < 1000) return "< 1 s";
  const s = ms / 1000;
  return s < 60 ? `${s.toLocaleString("es-CO", { maximumFractionDigits: 1 })} s` : `${Math.floor(s / 60)} min ${Math.round(s % 60)} s`;
}

/** Un paso: herramienta, estado, duración, resumen y, en modo detalle, las fuentes consultadas. */
export function ActivityStepItem({
  step,
  index,
  detail = false,
  showActor = false,
}: {
  readonly step: TraceStep;
  readonly index: number;
  readonly detail?: boolean;
  readonly showActor?: boolean;
}) {
  const live = isLive(step.state);
  const duration = stepDuration(step);
  const visibleFuentes = detail ? step.fuentes : step.fuentes.slice(0, 3);
  return (
    <TimelineItem step={index} className="not-last:pb-4">
      <TimelineIndicator className={dotClass(step.state)}>
        {live ? <Spinner className="size-3" role="presentation" aria-label={undefined} aria-hidden="true" /> : null}
      </TimelineIndicator>
      <TimelineSeparator />
      <TimelineHeader>
        <TimelineDate>
          {showActor ? `${step.actorLabel} · ` : ""}
          {formatTime(step.startedAt)}
          {duration ? ` · ${duration}` : ""}
        </TimelineDate>
        <TimelineTitle className={cn("text-foreground", live && "shimmer [--shimmer-duration:2.4s]")}>{step.label}</TimelineTitle>
      </TimelineHeader>
      <TimelineContent className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {step.kind === "handoff" ? <Badge variant="warning-light">Transferido a una persona</Badge> : null}
          {step.approval ? <Badge variant={APPROVAL_VARIANT[step.approval]}>{APPROVAL_LABEL[step.approval]}</Badge> : null}
          <Badge variant={STATE_VARIANT[step.state]}>{STATE_LABELS[step.state]}</Badge>
          {step.simulado ? <Badge variant="outline">simulado</Badge> : null}
        </div>
        {step.etapa && step.kind === "workflow" ? (
          <p className="text-xs text-foreground">
            Etapa: <span className="font-medium">{step.etapa}</span>
          </p>
        ) : null}
        {step.summary ? <p className="text-xs text-foreground">{step.summary}</p> : null}
        {visibleFuentes.map((fuente) => (
          <p key={fuente} className="text-xs text-muted-foreground">
            Fuente: {fuente}
          </p>
        ))}
        {!detail && step.fuentes.length > 3 ? (
          <p className="text-xs text-muted-foreground">y {step.fuentes.length - 3} fuentes más</p>
        ) : null}
      </TimelineContent>
    </TimelineItem>
  );
}

function ActorSection({ actor }: { readonly actor: TraceActor }) {
  return (
    <section className="flex flex-col gap-3" aria-label={actor.label}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold tracking-tight">{actor.label}</h3>
        {actor.working ? (
          <Badge variant="info-light">En curso</Badge>
        ) : actor.steps.length > 0 ? (
          <Badge variant="success-light">Actuó</Badge>
        ) : (
          <Badge variant="outline">Sin pasos</Badge>
        )}
      </div>
      {actor.steps.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aún no hay llamadas a herramientas.</p>
      ) : (
        <Timeline value={actor.steps.length}>
          {actor.steps.map((step, i) => (
            <ActivityStepItem key={step.id} step={step} index={i + 1} />
          ))}
        </Timeline>
      )}
    </section>
  );
}

/** Actividad de los agentes en vivo: un bloque por agente (raíz y subagentes), con sus pasos en orden. */
export function AgentActivityFeed({ trace, className }: { readonly trace: Trace; readonly className?: string }) {
  const working = trace.actors.some((a) => a.working);
  const total = trace.steps.length;
  const agents = trace.actors.filter((a) => a.steps.length > 0).length;
  const handoffs = trace.steps.filter((s) => s.kind === "handoff").length;
  const approvals = trace.steps.filter((s) => s.approval).length;
  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <Marker role="status" aria-live="polite" aria-busy={working} className="text-sm">
        <MarkerIcon className={cn("flex items-center justify-center", working ? "text-info" : "text-success")}>
          {working ? <Spinner role="presentation" aria-label={undefined} aria-hidden="true" /> : <CheckCircle2Icon />}
        </MarkerIcon>
        <MarkerContent>
          {working ? "Trabajando" : `${total} ${total === 1 ? "paso" : "pasos"} · ${agents} ${agents === 1 ? "agente" : "agentes"}`}
        </MarkerContent>
      </Marker>
      {trace.etapa ? (
        <p className="text-xs text-muted-foreground">
          Etapa de la evaluación: <span className="font-medium text-foreground">{trace.etapa}</span>
        </p>
      ) : null}
      {handoffs > 0 || approvals > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {handoffs > 0 ? <Badge variant="warning-light">Transferencia a persona</Badge> : null}
          {approvals > 0 ? <Badge variant="primary-light">Firma / aprobación</Badge> : null}
        </div>
      ) : null}
      {trace.actors.map((actor) => (
        <ActorSection key={actor.key} actor={actor} />
      ))}
    </div>
  );
}
