"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2Icon, InboxIcon } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { DataTable } from "@/components/app/data-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import type { DataGridFeatures } from "@/components/reui/data-grid/data-grid";
import { DataGridColumnHeader } from "@/components/reui/data-grid/data-grid-column-header";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { CASO_SEMILLA, type CasoComite, casoDesdeEvaluacion, DECISION_LABEL, type DecisionComite } from "@/lib/comite";
import { formatCop, formatPct } from "@/lib/format";
import { readLastSession } from "@/lib/session-store";
import { useSessionTrace } from "./use-session-trace";

type Resultado = { readonly tipo: "ok" | "sin-caso" | "error"; readonly mensaje: string };

/**
 * Si la última sesión terminó en comité humano, aporta ese caso real a la bandeja.
 * El caso se deriva en el render y se entrega por render-prop: copiarlo al estado del padre
 * desde un efecto encadenaba un render por cada evento del stream y saturaba React.
 * No sigue subagentes: el caso completo está en el resultado de `evaluar_solicitud`.
 */
function LiveCase({
  sessionId,
  children,
}: {
  readonly sessionId: string;
  readonly children: (liveCase: CasoComite | undefined) => ReactNode;
}) {
  const { trace } = useSessionTrace(sessionId, { followAgents: false });
  const liveCase = useMemo(() => {
    const step = [...trace.steps].reverse().find((s) => s.name === "evaluar_solicitud" && casoDesdeEvaluacion(s.input, s.output));
    return step ? casoDesdeEvaluacion(step.input, step.output) : undefined;
  }, [trace]);
  return children(liveCase);
}

function SectionTitle({ children }: { readonly children: string }) {
  return <h3 className="text-sm font-semibold tracking-tight">{children}</h3>;
}

function CaseDetail({
  caso,
  analista,
  decidido,
  onDecidido,
}: {
  readonly caso: CasoComite;
  readonly analista: string;
  readonly decidido: DecisionComite | undefined;
  readonly onDecidido: (d: DecisionComite) => void;
}) {
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState<DecisionComite>();
  const [resultado, setResultado] = useState<Resultado>();

  const decidir = async (decision: DecisionComite) => {
    setEnviando(decision);
    setResultado(undefined);
    try {
      const res = await fetch(`/api/comite/${encodeURIComponent(caso.numeroFactura)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, analista, ...(comentario.trim() ? { comentario: comentario.trim() } : {}) }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        onDecidido(decision);
        setResultado({ tipo: "ok", mensaje: `Decisión registrada: ${DECISION_LABEL[decision].toLowerCase()}. El Asesor se lo comunicará al empresario.` });
      } else if (res.status === 404) {
        setResultado({
          tipo: "sin-caso",
          mensaje: "No hay una sesión esperando decisión para esta factura (inicie el flujo 2 en la vista Empresario).",
        });
      } else {
        setResultado({ tipo: "error", mensaje: data.error ?? `No se pudo registrar la decisión (código ${res.status}).` });
      }
    } catch {
      setResultado({ tipo: "error", mensaje: "No fue posible comunicarse con el servidor. Intente de nuevo." });
    } finally {
      setEnviando(undefined);
    }
  };

  return (
    <Frame>
      <FrameHeader className="flex-row flex-wrap items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <FrameTitle>
            {caso.numeroFactura} · {caso.razonSocial}
          </FrameTitle>
          <FrameDescription>
            NIT {caso.nit} · Factura por {formatCop(caso.monto)}
          </FrameDescription>
        </div>
        {decidido ? (
          <Badge variant="success-light">{DECISION_LABEL[decidido]}</Badge>
        ) : (
          <Badge variant="warning-light">Pendiente de decisión</Badge>
        )}
      </FrameHeader>

      <FramePanel className="flex flex-col gap-3">
        <SectionTitle>Resumen en 30 segundos</SectionTitle>
        <p className="text-sm text-pretty text-foreground">{caso.resumen}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="info-light">
            Score {caso.score} · banda {caso.banda}
          </Badge>
          {caso.motivos.map((m) => (
            <Badge key={m} variant="warning-light">
              {m}
            </Badge>
          ))}
          <Badge variant="outline">
            Pagador: {caso.pagador.nombre} ({caso.pagador.calificacion})
          </Badge>
        </div>
      </FramePanel>

      <FramePanel className="flex flex-col gap-3">
        <SectionTitle>Factores del score</SectionTitle>
        <ul className="flex flex-col gap-2">
          {caso.factores.map((f) => (
            <li key={f.nombre} className="flex items-start justify-between gap-3 text-sm">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="font-medium">{f.nombre}</span>
                <span className="text-xs text-muted-foreground">{f.explicacion}</span>
              </div>
              {f.impacto !== undefined ? (
                <span className="shrink-0 font-medium tabular-nums">{f.impacto > 0 ? `+${f.impacto}` : f.impacto}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </FramePanel>

      <FramePanel className="flex flex-col gap-3">
        <SectionTitle>Oferta</SectionTitle>
        {caso.oferta ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Metric label="Desembolso neto" value={formatCop(caso.oferta.desembolsoNeto)} />
            <Metric label="Tasa mensual" value={formatPct(caso.oferta.tasaMensual)} />
            <Metric label="Costo efectivo anual (EA)" value={formatPct(caso.oferta.costoEfectivoAnual)} />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Este caso no tiene oferta calculada.</p>
        )}
      </FramePanel>

      <FramePanel className="flex flex-col gap-3">
        <SectionTitle>Fuentes consultadas</SectionTitle>
        <ul className="flex flex-col gap-1.5">
          {caso.fuentes.map((fuente) => (
            <li key={fuente} className="flex flex-wrap items-center gap-2 text-sm">
              <span>{fuente}</span>
              {fuente.includes("sintético") ? <Badge variant="outline">simulado</Badge> : null}
            </li>
          ))}
        </ul>
      </FramePanel>

      <FramePanel className="flex flex-col gap-4">
        <SectionTitle>Su decisión</SectionTitle>
        <FieldGroup className="gap-3">
          <Field className="gap-2">
            <FieldLabel htmlFor="comite-analista">Analista</FieldLabel>
            <Input id="comite-analista" value={analista} readOnly />
          </Field>
          <Field className="gap-2">
            <FieldLabel htmlFor="comite-comentario">Comentario (opcional)</FieldLabel>
            <Textarea
              id="comite-comentario"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Motivo de la decisión o la información que necesita"
              rows={3}
            />
          </Field>
        </FieldGroup>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={enviando !== undefined} onClick={() => void decidir("aprobar")}>
            {enviando === "aprobar" ? <Spinner /> : null}
            Aprobar
          </Button>
          <Button type="button" variant="destructive" disabled={enviando !== undefined} onClick={() => void decidir("rechazar")}>
            {enviando === "rechazar" ? <Spinner /> : null}
            Rechazar
          </Button>
          <Button type="button" variant="outline" disabled={enviando !== undefined} onClick={() => void decidir("solicitar_informacion")}>
            {enviando === "solicitar_informacion" ? <Spinner /> : null}
            Solicitar información
          </Button>
        </div>
        {resultado ? (
          <Alert variant={resultado.tipo === "ok" ? "success" : resultado.tipo === "sin-caso" ? "warning" : "destructive"}>
            <CheckCircle2Icon />
            <AlertTitle>
              {resultado.tipo === "ok" ? "Decisión enviada" : resultado.tipo === "sin-caso" ? "Sin caso en espera" : "No se pudo enviar"}
            </AlertTitle>
            <AlertDescription>{resultado.mensaje}</AlertDescription>
          </Alert>
        ) : null}
      </FramePanel>
    </Frame>
  );
}

function Metric({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
    </div>
  );
}

export function ComiteInbox({ analista }: { readonly analista: string }) {
  const [lastSession, setLastSession] = useState<string>();
  useEffect(() => setLastSession(readLastSession()), []);

  if (!lastSession) return <InboxBody analista={analista} liveCase={undefined} />;
  return (
    <LiveCase sessionId={lastSession}>{(liveCase) => <InboxBody analista={analista} liveCase={liveCase} />}</LiveCase>
  );
}

function InboxBody({ analista, liveCase }: { readonly analista: string; readonly liveCase: CasoComite | undefined }) {
  const [selected, setSelected] = useState<string>();
  const [decisiones, setDecisiones] = useState<Record<string, DecisionComite>>({});

  // Un caso real de la sesión reemplaza al sembrado si es la misma factura.
  const casos = useMemo<CasoComite[]>(() => {
    if (!liveCase) return [CASO_SEMILLA];
    return liveCase.numeroFactura === CASO_SEMILLA.numeroFactura ? [liveCase] : [CASO_SEMILLA, liveCase];
  }, [liveCase]);
  const caso = casos.find((c) => c.numeroFactura === selected) ?? casos[0];

  const columns = useMemo<ColumnDef<DataGridFeatures, CasoComite>[]>(
    () => [
      { accessorKey: "numeroFactura", header: "Factura", cell: ({ row }) => <span className="font-medium">{row.original.numeroFactura}</span> },
      { accessorKey: "razonSocial", header: "Empresa" },
      {
        accessorKey: "monto",
        header: ({ column }) => <DataGridColumnHeader title="Monto" column={column} />,
        cell: ({ row }) => formatCop(row.original.monto),
        meta: { headerClassName: "text-end [&>div]:justify-end", cellClassName: "text-end tabular-nums" },
      },
      { id: "score", header: "Score", cell: ({ row }) => `${row.original.score} · banda ${row.original.banda}` },
      {
        id: "motivos",
        header: "Motivos",
        cell: ({ row }) => (
          <Badge variant="warning-light">
            {row.original.motivos.length} {row.original.motivos.length === 1 ? "motivo" : "motivos"} de comité
          </Badge>
        ),
      },
      {
        id: "estado",
        header: "Estado",
        cell: ({ row }) => {
          const d = decisiones[row.original.numeroFactura];
          return d ? <Badge variant="success-light">{DECISION_LABEL[d]}</Badge> : <Badge variant="warning-light">Pendiente</Badge>;
        },
      },
    ],
    [decisiones],
  );

  return (
    <div className="flex flex-col gap-6 px-4 pb-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold tracking-tight">Bandeja del comité</h1>
        <p className="text-sm text-muted-foreground">Casos que esperan la decisión de una persona.</p>
      </div>

      <Frame>
        <FrameHeader>
          <FrameTitle>Casos en espera</FrameTitle>
          <FrameDescription>{casos.length} {casos.length === 1 ? "caso" : "casos"}; seleccione uno para revisarlo</FrameDescription>
        </FrameHeader>
        {casos.length === 0 ? (
          <FramePanel>
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <InboxIcon />
                </EmptyMedia>
                <EmptyTitle>No hay casos en espera</EmptyTitle>
                <EmptyDescription>Cuando el asesor transfiera una solicitud, aparecerá aquí.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          </FramePanel>
        ) : (
          <DataTable data={casos} columns={columns} onRowClick={(c) => setSelected(c.numeroFactura)} />
        )}
      </Frame>

      {caso ? (
        <CaseDetail
          key={caso.numeroFactura}
          caso={caso}
          analista={analista}
          decidido={decisiones[caso.numeroFactura]}
          onDecidido={(d) => setDecisiones((prev) => ({ ...prev, [caso.numeroFactura]: d }))}
        />
      ) : null}
    </div>
  );
}
