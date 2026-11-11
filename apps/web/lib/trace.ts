import {
  type CallObservation,
  type CallState,
  callPreview,
  calls,
  interactions,
  type SessionView,
  session as sessionOf,
  turn as turnOf,
  usage,
} from "eve/events";
import type { EveMessage, UseEveAgentReturn } from "eve/react";
import { formatCop } from "./format";

type Agents = UseEveAgentReturn["agents"];

export const AGENT_LABELS: Record<string, string> = {
  asesor: "Asesor Pyme",
  kyc_onboarding: "KYC y onboarding",
  guardian_cumplimiento: "Guardián de cumplimiento",
  analista_riesgo: "Analista de riesgo",
  acompanamiento: "Acompañamiento",
};

export const TOOL_LABELS: Record<string, string> = {
  evaluar_solicitud: "Evaluación de la solicitud",
  escalar_a_comite: "Transferencia al comité de crédito",
  formalizar_desembolso: "Formalización y desembolso",
  consultar_rut_dian: "Consulta de RUT en DIAN",
  consultar_camara_comercio: "Consulta de Cámara de Comercio",
  consultar_listas_sarlaft: "Consulta de listas SARLAFT",
  registrar_consentimiento: "Registro de consentimiento de datos",
  verificar_factura_radian: "Verificación de endoso en RADIAN",
  detectar_inyeccion: "Análisis de manipulación del mensaje",
  registrar_auditoria: "Registro en bitácora de auditoría",
  consultar_auditoria: "Consulta de bitácora de auditoría",
  consultar_facturas_radian: "Consulta de facturas en RADIAN",
  consultar_pagador: "Consulta del pagador",
  consultar_buro_credito: "Consulta de buró de crédito",
  calcular_score: "Cálculo del score de riesgo",
  calcular_oferta: "Cálculo de la oferta",
  evaluar_politicas: "Evaluación de políticas de crédito",
  consultar_cartera: "Consulta de cartera",
  sugerir_siguiente_producto: "Sugerencia de siguiente producto",
  programar_recordatorio: "Programación de recordatorio",
};

export const STATE_LABELS: Record<CallState, string> = {
  requested: "Solicitada",
  approval: "Espera su firma",
  running: "En curso",
  blocked: "Espera una respuesta",
  completed: "Completada",
  failed: "Con error",
  rejected: "Rechazada",
  cancelled: "Detenida",
};

export type StepKind = "tool" | "workflow" | "handoff" | "approval" | "agent-result";

export type TraceStep = {
  readonly id: string;
  readonly callId: string;
  readonly name: string;
  readonly label: string;
  readonly kind: StepKind;
  readonly state: CallState;
  readonly actor: string;
  readonly actorLabel: string;
  readonly fuentes: readonly string[];
  readonly simulado: boolean;
  readonly summary?: string;
  readonly etapa?: string;
  readonly approval?: "pendiente" | "firmado" | "rechazado";
  readonly startedAt?: string;
  readonly endedAt?: string;
  readonly input?: unknown;
  readonly output?: unknown;
};

export type TraceActor = {
  readonly key: string;
  readonly sessionId: string;
  readonly label: string;
  readonly steps: readonly TraceStep[];
  readonly working: boolean;
  readonly startedAt?: string;
};

export type Trace = {
  readonly actors: readonly TraceActor[];
  readonly steps: readonly TraceStep[];
  readonly etapa?: string;
  readonly costUsd?: number;
  readonly hasCost: boolean;
  readonly childrenFollowed: number;
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 ? v : undefined);

export function collectFuentes(output: unknown): string[] {
  if (!isObj(output)) return [];
  const found = new Set<string>();
  const visit = (o: unknown, depth: number) => {
    if (!isObj(o) || depth > 3) return;
    const f = str(o.fuente);
    if (f) found.add(f);
    if (Array.isArray(o.fuentes)) for (const x of o.fuentes) if (typeof x === "string") found.add(x);
    for (const value of Object.values(o)) if (isObj(value)) visit(value, depth + 1);
  };
  visit(output, 0);
  return [...found];
}

function isSimulated(output: unknown): boolean {
  if (!isObj(output)) return false;
  if (output.simulado === true) return true;
  return Object.values(output).some((v) => isObj(v) && v.simulado === true);
}

const DECISIONS: Record<string, string> = {
  aprobacion_automatica: "Aprobación automática",
  comite_humano: "Comité humano",
  rechazo: "Rechazo",
  aprobar: "Aprobar",
  rechazar: "Rechazar",
  solicitar_informacion: "Solicitar información",
};

function summarize(name: string, state: CallState, output: unknown, error?: string): string | undefined {
  if (state === "failed") return error ?? "La llamada falló.";
  if (state === "rejected") return "El usuario no la autorizó.";
  if (!isObj(output)) return undefined;
  switch (name) {
    case "calcular_score":
      return typeof output.score === "number" ? `Score ${output.score} · banda ${String(output.banda)}` : str(output.mensaje);
    case "calcular_oferta":
      return output.hayOferta === true
        ? `Desembolso neto ${formatCop(Number(output.desembolsoNeto))}`
        : "Sin oferta para esta banda";
    case "evaluar_politicas":
      return `Decisión: ${DECISIONS[String(output.decision)] ?? String(output.decision)}`;
    case "verificar_factura_radian":
      return output.encontrado === false
        ? "Factura no encontrada en RADIAN"
        : `RADIAN: ${String(output.estadoRadian)}${output.posibleDobleFinanciacion === true ? " · posible doble financiación" : ""}`;
    case "detectar_inyeccion":
      return output.sospechoso === true ? `Mensaje sospechoso (severidad ${String(output.severidad)})` : "Sin intentos de manipulación";
    case "evaluar_solicitud":
      return output.decision ? `Decisión: ${DECISIONS[String(output.decision)] ?? String(output.decision)}` : str(output.etapa);
    case "escalar_a_comite": {
      const estado = str(output.estado);
      if (estado === "resuelto") return `Decisión del comité: ${DECISIONS[String(output.decision)] ?? String(output.decision)} (${str(output.analista) ?? "analista"})`;
      return estado;
    }
    case "formalizar_desembolso":
      return `Operación ${String(output.operacion)} · ${String(output.estado)}`;
    default:
      return str(output.mensaje) ?? (output.encontrado === false ? "Sin resultados" : undefined);
  }
}

function stepFor(view: SessionView, c: CallObservation, actor: string, approvals: ReturnType<typeof interactions>): TraceStep {
  const preview = callPreview(view, c.callId);
  const progress = isObj(preview?.output) ? str(preview.output.etapa) : undefined;
  const output = c.output ?? undefined;
  const etapa = (isObj(output) ? str(output.etapa) : undefined) ?? progress;
  const approvalReq = approvals.find((i) => i.request.kind === "approval" && i.call?.callId === c.callId);
  let approval: TraceStep["approval"];
  if (approvalReq) {
    if (approvalReq.status === "open") approval = "pendiente";
    else approval = approvalReq.answer && "optionId" in approvalReq.answer && approvalReq.answer.optionId === "deny" ? "rechazado" : c.state === "rejected" ? "rechazado" : "firmado";
  }
  const kind: StepKind =
    c.name === "escalar_a_comite" ? "handoff" : approvalReq ? "approval" : c.name === "evaluar_solicitud" ? "workflow" : c.kind === "agent" ? "agent-result" : "tool";
  return {
    id: c.callId,
    callId: c.callId,
    name: c.name,
    label: TOOL_LABELS[c.name] ?? c.label,
    kind,
    state: c.state,
    actor,
    actorLabel: AGENT_LABELS[actor] ?? actor,
    fuentes: collectFuentes(output),
    simulado: isSimulated(output),
    summary: summarize(c.name, c.state, output, c.error?.message),
    etapa,
    approval,
    startedAt: c.startedAt,
    endedAt: c.endedAt,
    input: c.input,
    output,
  };
}

function actorSteps(view: SessionView, actor: string, skipAgentCalls: (c: CallObservation) => boolean): TraceStep[] {
  const approvals = interactions(view);
  return calls(view)
    .filter((c) => !c.hidden && c.kind !== "control" && !skipAgentCalls(c))
    .map((c) => stepFor(view, c, actor, approvals));
}

/** Pasos y agentes de una sesión, a partir del `view` raíz y de los hijos que el hook sigue. */
export function buildTrace(sessionId: string, view: SessionView, agents: Agents): Trace {
  const actors: TraceActor[] = [];
  const followedCalls = new Set<string>();
  let childrenFollowed = 0;

  const childActors: TraceActor[] = [];
  for (const child of Object.values(agents)) {
    const obs = child.observation;
    if (obs.status === "not-followed" || obs.status === "unavailable") continue;
    const cview = obs.conversation.view;
    const cSteps = actorSteps(cview, child.name, () => false);
    if (child.callId) followedCalls.add(child.callId);
    childrenFollowed += 1;
    childActors.push({
      key: child.sessionId,
      sessionId: child.sessionId,
      label: AGENT_LABELS[child.name] ?? child.name,
      steps: cSteps,
      working: cSteps.some((s) => s.state === "running" || s.state === "requested") || obs.status === "following",
      startedAt: sessionOf(cview).startedAt ?? cSteps[0]?.startedAt,
    });
  }
  childActors.sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? ""));

  const rootSteps = actorSteps(view, "asesor", (c) => c.kind === "agent" && followedCalls.has(c.callId));
  actors.push({
    key: "root",
    sessionId,
    label: AGENT_LABELS.asesor,
    steps: rootSteps,
    working: rootSteps.some((s) => s.state === "running" || s.state === "requested"),
    startedAt: sessionOf(view).startedAt,
  });
  actors.push(...childActors);

  const all = actors.flatMap((a) => a.steps);
  const etapaStep = [...rootSteps].reverse().find((s) => s.name === "evaluar_solicitud" && s.etapa);

  let cost = 0;
  let hasCost = false;
  for (const v of [view, ...Object.values(agents).flatMap((a) => (a.observation.status === "not-followed" || a.observation.status === "unavailable" ? [] : [a.observation.conversation.view]))]) {
    const c = usage(v).total.costUsd;
    if (typeof c === "number") {
      cost += c;
      hasCost = true;
    }
  }

  return { actors, steps: all, etapa: etapaStep?.etapa, costUsd: hasCost ? cost : undefined, hasCost, childrenFollowed };
}

export type AuditRow = {
  readonly id: string;
  readonly at?: string;
  readonly agente: string;
  readonly herramienta: string;
  readonly fuente: string;
  readonly simulado: boolean;
  readonly resultado: string;
  readonly categoria: "fuente" | "hallazgo" | "bloqueo" | "inyeccion";
  readonly severidad?: string;
};

/** Filas de auditoría: cada fuente consultada, y los hallazgos del Guardián. */
export function buildAudit(trace: Trace): AuditRow[] {
  const rows: AuditRow[] = [];
  for (const s of trace.steps) {
    const at = s.endedAt ?? s.startedAt;
    const out = isObj(s.output) ? s.output : undefined;

    if (s.name === "detectar_inyeccion" && out) {
      const sospechoso = out.sospechoso === true;
      rows.push({
        id: `${s.id}:inj`,
        at,
        agente: s.actorLabel,
        herramienta: s.label,
        fuente: str(out.fuente) ?? "Detector de prompt injection",
        simulado: true,
        resultado: sospechoso
          ? `Intento de manipulación (${Array.isArray(out.patrones) ? out.patrones.join(", ") : "patrones"})`
          : "Sin hallazgos",
        categoria: sospechoso ? "inyeccion" : "hallazgo",
        severidad: str(out.severidad),
      });
      continue;
    }
    if (s.name === "verificar_factura_radian" && out) {
      const doble = out.posibleDobleFinanciacion === true;
      rows.push({
        id: `${s.id}:rad`,
        at,
        agente: s.actorLabel,
        herramienta: s.label,
        fuente: str(out.fuente) ?? "DIAN RADIAN",
        simulado: true,
        resultado: doble ? "Posible doble financiación: factura endosada" : `Factura ${String(out.estadoRadian ?? "sin estado")}`,
        categoria: doble ? "bloqueo" : "hallazgo",
        severidad: doble ? "alta" : undefined,
      });
      continue;
    }
    if (s.name === "evaluar_solicitud" && out) {
      const g = isObj(out.guardian) ? out.guardian : undefined;
      if (g) {
        const bloqueado = g.veredicto === "bloqueo" || out.etapa === "bloqueado_por_guardian";
        rows.push({
          id: `${s.id}:g`,
          at,
          agente: AGENT_LABELS.guardian_cumplimiento,
          herramienta: "Veredicto del Guardián",
          fuente: "Guardián de cumplimiento (veredicto)",
          simulado: true,
          resultado: `${String(g.veredicto)}: ${Array.isArray(g.hallazgos) && g.hallazgos.length > 0 ? g.hallazgos.join("; ") : "sin hallazgos"}`,
          categoria: bloqueado ? "bloqueo" : "hallazgo",
          severidad: str(g.severidad),
        });
      }
    }
    if (s.fuentes.length > 0) {
      for (const fuente of s.fuentes) {
        rows.push({
          id: `${s.id}:${fuente}`,
          at,
          agente: s.actorLabel,
          herramienta: s.label,
          fuente,
          simulado: s.simulado,
          resultado: s.summary ?? STATE_LABELS[s.state],
          categoria: "fuente",
        });
      }
    }
  }
  return rows;
}

export type TimelineEntry =
  | { readonly id: string; readonly at: string; readonly kind: "message"; readonly role: "user" | "assistant"; readonly text: string }
  | { readonly id: string; readonly at: string; readonly kind: "step"; readonly step: TraceStep };

const FAR_FUTURE = "9999-12-31T00:00:00.000Z";

/** Mensajes y pasos (de todos los agentes) en un solo orden cronológico. */
export function buildTimeline(view: SessionView, messages: readonly EveMessage[], trace: Trace): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const m of messages) {
    const text = m.parts
      .flatMap((p) => (p.type === "text" ? [p.text] : []))
      .join("\n")
      .trim();
    if (!text) continue;
    const t = m.metadata?.turnId ? turnOf(view, m.metadata.turnId) : undefined;
    const at = m.role === "user" ? (t?.startedAt ?? "") : (t?.endedAt ?? FAR_FUTURE);
    entries.push({ id: `m:${m.id}`, at, kind: "message", role: m.role, text });
  }
  for (const s of trace.steps) entries.push({ id: `s:${s.id}`, at: s.startedAt ?? "", kind: "step", step: s });
  // Orden estable: los que no traen hora conservan su posición relativa.
  return entries
    .map((e, i) => ({ e, i }))
    .sort((a, b) => (a.e.at === b.e.at ? a.i - b.i : a.e.at < b.e.at ? -1 : 1))
    .map(({ e }) => e);
}
