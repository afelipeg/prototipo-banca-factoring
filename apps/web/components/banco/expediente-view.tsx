"use client";

import { FileSearchIcon } from "lucide-react";
import { MessageResponse } from "@/components/ai-elements/message";
import { Badge } from "@/components/reui/badge";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
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
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { ActivityStepItem } from "@/components/trace/agent-activity-feed";
import { formatTime, formatUsd } from "@/lib/format";
import { useSessionTrace } from "./use-session-trace";
import { SessionError, SessionLoading } from "./session-states";

function Stat({ label, value, hint }: { readonly label: string; readonly value: string; readonly hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

export function ExpedienteView({ sessionId, onRetry }: { readonly sessionId: string; readonly onRetry: () => void }) {
  const { agent, trace, timeline, loading } = useSessionTrace(sessionId);

  if (loading && timeline.length === 0) return <SessionLoading />;
  if (agent.error && timeline.length === 0) return <SessionError message={agent.error.message} onRetry={onRetry} />;
  if (timeline.length === 0) {
    return (
      <Frame>
        <FramePanel>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FileSearchIcon />
              </EmptyMedia>
              <EmptyTitle>La sesión no tiene eventos</EmptyTitle>
              <EmptyDescription>Verifique el id o espere a que el Asesor registre actividad.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </FramePanel>
      </Frame>
    );
  }

  const tools = trace.steps.filter((s) => s.kind !== "agent-result").length;
  const sources = new Set(trace.steps.flatMap((s) => s.fuentes)).size;
  const handoffs = trace.steps.filter((s) => s.kind === "handoff").length;

  return (
    <div className="flex flex-col gap-4">
      {agent.error ? <SessionError message={agent.error.message} onRetry={onRetry} /> : null}
      <Frame>
        <FramePanel className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Agentes que actuaron" value={String(trace.actors.filter((a) => a.steps.length > 0 || a.key !== "root").length)} hint={`${trace.childrenFollowed} sesiones de subagentes leídas`} />
          <Stat label="Llamadas a herramientas" value={String(tools)} hint={`${sources} fuentes distintas`} />
          <Stat label="Transferencias a persona" value={String(handoffs)} />
          <Stat
            label="Costo del modelo"
            value={trace.hasCost && trace.costUsd !== undefined ? formatUsd(trace.costUsd) : "No disponible"}
            hint={trace.hasCost ? "Suma de usage.recorded" : "El agente no reportó costo"}
          />
        </FramePanel>
      </Frame>

      <Frame>
        <FrameHeader>
          <FrameTitle>Línea de tiempo</FrameTitle>
          <FrameDescription>Mensajes, agentes, herramientas, decisiones y firmas</FrameDescription>
        </FrameHeader>
        <FramePanel>
          <Timeline value={timeline.length}>
            {timeline.map((entry, i) =>
              entry.kind === "step" ? (
                <ActivityStepItem key={entry.id} step={entry.step} index={i + 1} detail showActor />
              ) : (
                <TimelineItem key={entry.id} step={i + 1}>
                  <TimelineHeader>
                    <TimelineDate>{formatTime(entry.at.startsWith("9999") ? undefined : entry.at)}</TimelineDate>
                    <TimelineTitle>{entry.role === "user" ? "Empresario" : "Asesor Pyme"}</TimelineTitle>
                  </TimelineHeader>
                  <TimelineIndicator />
                  <TimelineSeparator />
                  <TimelineContent className="flex flex-col gap-1.5">
                    <Badge variant="outline" className="w-fit">
                      Mensaje
                    </Badge>
                    <MessageResponse className="text-sm text-foreground">{entry.text}</MessageResponse>
                  </TimelineContent>
                </TimelineItem>
              ),
            )}
          </Timeline>
        </FramePanel>
      </Frame>
    </div>
  );
}
