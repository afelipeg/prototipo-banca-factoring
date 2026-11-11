"use client";

import { ActivityIcon, PanelRightCloseIcon } from "lucide-react";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { Trace } from "@/lib/trace";
import { TraceTimeline } from "./trace-timeline";

export function TracePanelSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-14 w-full" />
      <Skeleton className="h-14 w-full" />
    </div>
  );
}

/** Panel derecho, plegable: trazabilidad en tiempo real de la conversación actual. */
export function TracePanel({
  trace,
  loading,
  onClose,
}: {
  readonly trace: Trace;
  readonly loading: boolean;
  readonly onClose: () => void;
}) {
  const empty = trace.steps.length === 0 && trace.actors.every((a) => a.steps.length === 0);
  return (
    <Frame spacing="sm" className="h-full min-h-0">
      <FrameHeader className="flex-row items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <FrameTitle>Trazabilidad</FrameTitle>
          <FrameDescription>Agentes, herramientas y fuentes en vivo</FrameDescription>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Ocultar trazabilidad">
          <PanelRightCloseIcon />
        </Button>
      </FrameHeader>
      <FramePanel className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <TracePanelSkeleton />
        ) : empty ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ActivityIcon />
              </EmptyMedia>
              <EmptyTitle>Sin actividad todavía</EmptyTitle>
              <EmptyDescription>Cuando el asesor consulte una fuente o llame a otro agente, lo verá aquí.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <TraceTimeline trace={trace} />
        )}
      </FramePanel>
    </Frame>
  );
}
