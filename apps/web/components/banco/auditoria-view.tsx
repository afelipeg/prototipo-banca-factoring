"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ShieldCheckIcon } from "lucide-react";
import { useMemo } from "react";
import { DataTable } from "@/components/app/data-table";
import { Badge } from "@/components/reui/badge";
import type { DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { formatTime } from "@/lib/format";
import type { AuditRow } from "@/lib/trace";
import { SessionError, SessionLoading } from "./session-states";
import { useSessionTrace } from "./use-session-trace";

const CATEGORIA: Record<AuditRow["categoria"], { label: string; variant: "outline" | "success-light" | "warning-light" | "destructive-light" }> = {
  fuente: { label: "Fuente consultada", variant: "outline" },
  hallazgo: { label: "Hallazgo", variant: "success-light" },
  bloqueo: { label: "Bloqueo", variant: "destructive-light" },
  inyeccion: { label: "Intento de manipulación", variant: "warning-light" },
};

function Stat({ label, value }: { readonly label: string; readonly value: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
    </div>
  );
}

export function AuditoriaView({ sessionId, onRetry }: { readonly sessionId: string; readonly onRetry: () => void }) {
  const { agent, audit, loading } = useSessionTrace(sessionId);

  const columns = useMemo<ColumnDef<DataGridFeatures, AuditRow>[]>(
    () => [
      { accessorKey: "at", header: ({ column }) => <DataGridColumnHeader title="Hora" column={column} />, cell: ({ row }) => formatTime(row.original.at) },
      {
        accessorKey: "categoria",
        header: "Tipo",
        cell: ({ row }) => {
          const c = CATEGORIA[row.original.categoria];
          return <Badge variant={c.variant}>{c.label}</Badge>;
        },
      },
      { accessorKey: "agente", header: ({ column }) => <DataGridColumnHeader title="Agente" column={column} /> },
      { accessorKey: "herramienta", header: "Herramienta" },
      { accessorKey: "fuente", header: ({ column }) => <DataGridColumnHeader title="Fuente" column={column} /> },
      {
        accessorKey: "simulado",
        header: "Datos",
        cell: ({ row }) => (row.original.simulado ? <Badge variant="outline">simulado</Badge> : <span className="text-muted-foreground">—</span>),
      },
      { accessorKey: "resultado", header: "Resultado", cell: ({ row }) => <span className="whitespace-normal">{row.original.resultado}</span> },
    ],
    [],
  );

  if (loading && audit.length === 0) return <SessionLoading />;
  if (agent.error && audit.length === 0) return <SessionError message={agent.error.message} onRetry={onRetry} />;

  const hallazgos = audit.filter((r) => r.categoria === "hallazgo" || r.categoria === "bloqueo").length;
  const bloqueos = audit.filter((r) => r.categoria === "bloqueo").length;
  const inyecciones = audit.filter((r) => r.categoria === "inyeccion").length;
  const fuentes = new Set(audit.map((r) => r.fuente)).size;

  return (
    <div className="flex flex-col gap-4">
      {agent.error ? <SessionError message={agent.error.message} onRetry={onRetry} /> : null}
      <Frame>
        <FramePanel className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          <Stat label="Hallazgos del Guardián" value={hallazgos} />
          <Stat label="Casos bloqueados" value={bloqueos} />
          <Stat label="Intentos de inyección" value={inyecciones} />
          <Stat label="Fuentes distintas" value={fuentes} />
        </FramePanel>
      </Frame>
      <Frame>
        <FrameHeader>
          <FrameTitle>Registro de auditoría</FrameTitle>
          <FrameDescription>Hallazgos, bloqueos y cada fuente consultada en la sesión</FrameDescription>
        </FrameHeader>
        {audit.length === 0 ? (
          <FramePanel>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldCheckIcon />
                </EmptyMedia>
                <EmptyTitle>Sin eventos de auditoría</EmptyTitle>
                <EmptyDescription>La sesión aún no consultó fuentes ni registró hallazgos.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </FramePanel>
        ) : (
          <DataTable data={audit} columns={columns} />
        )}
      </Frame>
    </div>
  );
}
