"use client";

import type { ReactNode } from "react";
import { BarsChart } from "@/components/charts/bars";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import { formatCop } from "@/lib/format";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = "—"): string => (typeof v === "string" && v.length > 0 ? v : typeof v === "number" ? String(v) : fallback);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const strs = (v: unknown): string[] => arr(v).filter((x): x is string => typeof x === "string");
const obj = (v: unknown): Obj => (isObj(v) ? v : {});

const pctFmt = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 });
const pct = (fraction: number) => `${pctFmt.format(Math.round(fraction * 1000) / 10)} %`;

const MOTIVO_LABEL: Record<string, string> = {
  calidad_pagador: "Calidad del pagador",
  historial_pyme: "Historial de crédito de la empresa",
  concentracion: "Concentración en un pagador",
  monto_vs_ventas: "Monto frente a ventas",
  estado_factura: "Estado de la factura en RADIAN",
  sin_riesgo_relevante: "Sin riesgo relevante",
};
const ALERTA_LABEL: Record<string, string> = {
  vencida: "Operación vencida",
  vencimiento_proximo: "Vencimiento próximo",
  concentracion_pagador: "Concentración por pagador",
  pagador_baja_calificacion: "Pagador de baja calificación",
};
const compact = new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 });

/** Herramientas del copiloto que tienen tarjeta propia. */
export const CARD_TOOLS: ReadonlySet<string> = new Set([
  "consultar_expediente",
  "predecir_riesgo_jev",
  "analizar_cartera",
  "redactar_acta",
  "redactar_borrador_ros",
]);

/** Tarjeta del resultado de una herramienta del copiloto; null si no hay una o la salida no sirve. */
export function ToolResultCard({ name, output }: { readonly name: string; readonly output: unknown }) {
  if (!isObj(output)) return null;
  switch (name) {
    case "consultar_expediente":
      return <ExpedienteCard o={output} />;
    case "predecir_riesgo_jev":
      return <JevCard o={output} />;
    case "analizar_cartera":
      return <CarteraCard o={output} />;
    case "redactar_acta":
      return <ActaCard o={output} />;
    case "redactar_borrador_ros":
      return <RosCard o={output} />;
    default:
      return null;
  }
}

function CardFrame({ title, description, badge, children }: { title: string; description?: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <Frame spacing="sm" className="w-full">
      <FrameHeader className="flex-row items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <FrameTitle>{title}</FrameTitle>
          {description ? <FrameDescription>{description}</FrameDescription> : null}
        </div>
        {badge}
      </FrameHeader>
      <FramePanel className="flex flex-col gap-4">{children}</FramePanel>
    </Frame>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="text-xs font-medium text-muted-foreground">{title}</h4>
      {children}
    </section>
  );
}

function Bullets({ items }: { items: readonly string[] }) {
  if (items.length === 0) return <p className="text-xs text-muted-foreground">Sin elementos.</p>;
  return (
    <ul className="flex list-disc flex-col gap-1 pl-4 text-sm marker:text-muted-foreground">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

function Fields({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex min-w-0 flex-col">
          <dt className="text-xs text-muted-foreground">{k}</dt>
          <dd className="break-words font-medium">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <Alert variant="info">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

const DECISIONS: Record<string, string> = {
  aprobacion_automatica: "Aprobación automática",
  comite_humano: "Comité humano",
  rechazo: "Rechazo",
};

function ExpedienteCard({ o }: { o: Obj }) {
  if (o.encontrado !== true) return <NotFound message={str(o.mensaje, "No se encontró el expediente.")} />;
  const empresa = obj(o.empresa);
  const factura = obj(o.factura);
  const pagador = obj(o.pagador);
  const score = obj(o.score);
  const politicas = obj(o.politicas);
  const oferta = obj(o.oferta);
  const decision = str(politicas.decision);
  return (
    <CardFrame
      title={str(empresa.razonSocial)}
      description={`NIT ${str(empresa.nit)} · factura ${str(factura.numero)}`}
      badge={<Badge variant="outline">Expediente</Badge>}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{str(score.score)}</span>
        <Badge variant="primary-light">Banda {str(score.banda)}</Badge>
        <Badge variant={decision === "rechazo" ? "destructive-light" : decision === "comite_humano" ? "warning-light" : "success-light"}>
          {DECISIONS[decision] ?? decision}
        </Badge>
      </div>
      <Fields
        rows={[
          ["Valor de la factura", formatCop(num(factura.valor))],
          ["Vence en", `${str(factura.diasAlVencimiento)} días`],
          ["Pagador", `${str(pagador.nombre)} (${str(pagador.calificacion)})`],
          ["Estado RADIAN", str(factura.estadoRadian)],
          ["SARLAFT", str(empresa.sarlaft)],
          ["Desembolso neto", oferta.hayOferta === true ? formatCop(num(oferta.desembolsoNeto)) : "Sin oferta"],
        ]}
      />
      {strs(politicas.motivos).length > 0 ? (
        <Section title="Motivos de la decisión">
          <Bullets items={strs(politicas.motivos)} />
        </Section>
      ) : null}
    </CardFrame>
  );
}

const SEMAFORO = {
  verde: { label: "Semáforo verde", variant: "success-light" },
  amarillo: { label: "Semáforo amarillo", variant: "warning-light" },
  rojo: { label: "Semáforo rojo", variant: "destructive-light" },
} as const;

const IMPAGO_COLORS = ["var(--success)", "var(--success)", "var(--warning)", "var(--destructive)", "var(--destructive)"];

function JevCard({ o }: { o: Obj }) {
  if (o.disponible !== true) return <NotFound message={str(o.mensaje, "El modelo Jev no está disponible para este caso.")} />;
  const semaforo = SEMAFORO[o.semaforo as keyof typeof SEMAFORO] ?? { label: str(o.semaforo), variant: "outline" as const };
  const dist = arr(o.distribucionImpago).map((d) => ({ label: str(obj(d).nivel), value: num(obj(d).probabilidad) }));
  const probs = [
    { label: "Impago", value: num(o.probImpago), color: "var(--destructive)" },
    { label: "Disputa", value: num(o.probDisputa), color: "var(--warning)" },
    { label: "Fraude", value: num(o.probFraude), color: "var(--destructive)" },
    { label: "Coherencia", value: num(o.probCoherencia), color: "var(--info)" },
  ];
  return (
    <CardFrame
      title={`Nivel de riesgo Jev · ${str(o.numeroFactura)}`}
      description={`Banda ${str(o.banda)} · score ${str(o.score)}`}
      badge={<Badge variant={semaforo.variant}>{semaforo.label}</Badge>}
    >
      <Section title="Distribución de la probabilidad de impago">
        <BarsChart
          data={dist.map((d, i) => ({ ...d, color: IMPAGO_COLORS[i] ?? "var(--info)" }))}
          format={pct}
          orientation="vertical"
          label="Distribución de la probabilidad de impago por nivel"
        />
      </Section>
      <Section title="Probabilidades del modelo">
        <BarsChart data={probs} format={pct} label="Probabilidades de impago, disputa, fraude y coherencia" />
      </Section>
      <Section title="Motivo principal">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium">{MOTIVO_LABEL[str(o.motivoPrincipal)] ?? str(o.motivoPrincipal)}</span>
          {o.motivoFuente === "regla" ? <Badge variant="outline">Regla RADIAN</Badge> : o.motivoFuente === "jev" ? <Badge variant="outline">Jev</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">{str(o.motivoDescripcion, "")}</p>
      </Section>
      {strs(o.razonesSemaforo).length > 0 ? (
        <Section title="Razones del semáforo">
          <Bullets items={strs(o.razonesSemaforo)} />
        </Section>
      ) : null}
      <p className="text-xs text-muted-foreground">Motor: Jev (TypeSafe) · complementa el score</p>
    </CardFrame>
  );
}

const SEVERIDAD = {
  alta: "destructive-light",
  media: "warning-light",
  baja: "info-light",
} as const;

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-card px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tracking-tight tabular-nums">{value}</span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );
}

function CarteraCard({ o }: { o: Obj }) {
  const k = obj(o.kpis);
  const aTiempo = num(k.pagadasATiempoPct);
  const expo = arr(o.exposicionPorPagador).map((r) => {
    const x = obj(r);
    return { label: str(x.pagador), value: num(x.montoCOP), note: `${compact.format(num(x.montoCOP))} · ${pctFmt.format(num(x.participacionPct))} %`, color: "var(--info)" };
  });
  const venc = arr(o.vencimientosPorSemana).map((r) => {
    const x = obj(r);
    const label = str(x.semana);
    return { label, value: num(x.montoCOP), color: label === "Vencidas" ? "var(--destructive)" : "var(--info)" };
  });
  const alertas = arr(o.alertas).map(obj);
  return (
    <CardFrame
      title="Monitor de cartera"
      description={`Corte al ${str(o.fechaCorte)}`}
      badge={<Badge variant={alertas.some((a) => a.severidad === "alta") ? "destructive-light" : "outline"}>{alertas.length} alertas</Badge>}
    >
      <div className="grid grid-cols-2 gap-2">
        <Kpi label="Operaciones activas" value={String(num(k.operacionesActivas))} />
        <Kpi label="Saldo anticipado" value={formatCop(num(k.saldoAnticipadoCOP))} />
        <Kpi
          label="Pagadas a tiempo"
          value={`${aTiempo <= 1 ? Math.round(aTiempo * 1000) / 10 : aTiempo} %`}
          hint={`${num(k.operacionesPagadas)} operaciones pagadas`}
        />
        <Kpi label="En trámite" value={String(num(k.solicitudesEnTramite))} hint={formatCop(num(k.montoEnTramiteCOP))} />
      </div>
      <Section title="Exposición por pagador (COP y participación)">
        <BarsChart data={expo} format={(v) => compact.format(v)} label="Exposición de la cartera por pagador" />
      </Section>
      <Section title="Vencimientos por semana (COP)">
        <BarsChart data={venc} format={(v) => compact.format(v)} orientation="vertical" label="Montos que vencen por semana" />
      </Section>
      <Section title="Alertas">
        {alertas.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin alertas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {alertas.map((a, i) => (
              <li key={`${str(a.tipo)}-${i}`} className="flex flex-col gap-1 rounded-lg border bg-card px-3 py-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={SEVERIDAD[a.severidad as keyof typeof SEVERIDAD] ?? "outline"}>{str(a.severidad)}</Badge>
                  <span className="text-sm font-medium">{ALERTA_LABEL[str(a.tipo)] ?? str(a.tipo)}</span>
                  {a.operacion ? <span className="text-xs text-muted-foreground">{str(a.operacion)}</span> : null}
                </div>
                <p className="text-sm text-muted-foreground">{str(a.detalle, "")}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </CardFrame>
  );
}

const RECOMENDACION = {
  aprobar: { label: "Aprobar", variant: "success-light" },
  aprobar_con_condiciones: { label: "Aprobar con condiciones", variant: "warning-light" },
  rechazar: { label: "Rechazar", variant: "destructive-light" },
} as const;

function ActaCard({ o }: { o: Obj }) {
  if (o.ok !== true) return <NotFound message={str(o.mensaje, "No fue posible redactar el acta.")} />;
  const caso = obj(o.caso);
  const rec = RECOMENDACION[o.recomendacion as keyof typeof RECOMENDACION] ?? { label: str(o.recomendacion), variant: "outline" as const };
  return (
    <CardFrame
      title={`Acta ${str(o.numeroActa)}`}
      description={`${str(caso.empresa)} · factura ${str(caso.factura)}`}
      badge={<Badge variant="warning-light">Borrador · pendiente de comité</Badge>}
    >
      <Fields
        rows={[
          ["Empresa", str(caso.empresa)],
          ["NIT", str(caso.nit)],
          ["Factura", str(caso.factura)],
          ["Valor", formatCop(num(caso.valor))],
          ["Pagador", str(caso.pagador)],
          ["Score", str(caso.score)],
        ]}
      />
      {strs(caso.reglas).length > 0 ? (
        <Section title="Reglas aplicadas">
          <Bullets items={strs(caso.reglas)} />
        </Section>
      ) : null}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Recomendación</span>
        <Badge variant={rec.variant}>{rec.label}</Badge>
      </div>
      <Section title="Fundamentos">
        <Bullets items={strs(o.fundamentos)} />
      </Section>
      <Section title="Condiciones">
        <Bullets items={strs(o.condiciones)} />
      </Section>
      <Section title="Firmas requeridas">
        <div className="flex flex-wrap gap-1.5">
          {strs(o.firmasRequeridas).map((f) => (
            <Badge key={f} variant="outline">
              {f}
            </Badge>
          ))}
        </div>
      </Section>
    </CardFrame>
  );
}

function RosCard({ o }: { o: Obj }) {
  const rep = obj(o.reportado);
  const op = obj(o.operacion);
  return (
    <CardFrame
      title={`Borrador ROS ${str(o.numeroBorrador)}`}
      description={`Destinatario: ${str(o.destinatario)}`}
      badge={<Badge variant="warning-light">Borrador · no enviado a la UIAF</Badge>}
    >
      <Fields
        rows={[
          ["Reportado", str(rep.razonSocial)],
          ["NIT", str(rep.nit)],
          ["Operación", str(op.tipo)],
          ["Factura / valor", `${str(op.factura)} · ${formatCop(num(op.valor))}`],
        ]}
      />
      <Section title="Hechos">
        <Bullets items={strs(o.hechos)} />
      </Section>
      <Section title="Señales de alerta">
        <Bullets items={strs(o.senalesDeAlerta)} />
      </Section>
      {o.requiere ? (
        <p className="text-xs text-muted-foreground">
          Requiere: {Array.isArray(o.requiere) ? strs(o.requiere).join("; ") : str(o.requiere)}
        </p>
      ) : null}
      {o.reservaLegal ? (
        <Alert variant="warning">
          <AlertTitle>Reserva legal</AlertTitle>
          <AlertDescription>{str(o.reservaLegal)}</AlertDescription>
        </Alert>
      ) : null}
    </CardFrame>
  );
}
