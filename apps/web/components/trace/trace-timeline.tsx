"use client";

import { Alert, AlertDescription } from "@/components/reui/alert";
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
import { formatTime } from "@/lib/format";
import { STATE_LABELS, type Trace, type TraceActor, type TraceStep } from "@/lib/trace";

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

export function StepItem({ step, index }: { readonly step: TraceStep; readonly index: number }) {
  return (
    <TimelineItem step={index}>
      <TimelineHeader>
        <TimelineDate>{formatTime(step.startedAt)}</TimelineDate>
        <TimelineTitle>{step.label}</TimelineTitle>
      </TimelineHeader>
      <TimelineIndicator />
      <TimelineSeparator />
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
        {step.fuentes.slice(0, 4).map((fuente) => (
          <p key={fuente} className="text-xs text-muted-foreground">
            Fuente: {fuente}
          </p>
        ))}
        {step.fuentes.length > 4 ? (
          <p className="text-xs text-muted-foreground">y {step.fuentes.length - 4} fuentes más (vea el expediente)</p>
        ) : null}
      </TimelineContent>
    </TimelineItem>
  );
}

export function ActorBlock({ actor }: { readonly actor: TraceActor }) {
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
            <StepItem key={step.id} step={step} index={i + 1} />
          ))}
        </Timeline>
      )}
    </section>
  );
}

/** Agentes, herramientas, fuentes, handoffs y firmas de una sesión, en orden de aparición. */
export function TraceTimeline({ trace }: { readonly trace: Trace }) {
  const handoffs = trace.steps.filter((s) => s.kind === "handoff").length;
  const approvals = trace.steps.filter((s) => s.approval).length;
  return (
    <div className="flex flex-col gap-5">
      {trace.etapa ? (
        <Alert variant="info">
          <AlertDescription>Etapa de la evaluación: {trace.etapa}</AlertDescription>
        </Alert>
      ) : null}
      {handoffs > 0 || approvals > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {handoffs > 0 ? <Badge variant="warning-light">Transferencia a persona</Badge> : null}
          {approvals > 0 ? <Badge variant="primary-light">Firma / aprobación</Badge> : null}
        </div>
      ) : null}
      {trace.actors.map((actor) => (
        <ActorBlock key={actor.key} actor={actor} />
      ))}
    </div>
  );
}
