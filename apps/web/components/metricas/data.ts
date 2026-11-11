/**
 * Vista de "Calidad y métricas": todo sale de instantáneas versionadas en apps/web/data/,
 * generadas con datos reales (ver scripts/exportar-*.ts). La página no llama APIs en vivo.
 */
import dominio from "@/data/dominio.json";
import evals from "@/data/evals.json";
import telemetria from "@/data/telemetria.json";

export type Tone = "danger" | "success" | "warning" | "info";
export type BadgeVariant = "success-light" | "warning-light" | "destructive-light" | "info-light" | "secondary";

export type MetricCard = {
  id: string;
  title: string;
  label: string;
  value: string;
  delta: string;
  deltaVariant: BadgeVariant;
  detail: string;
  tone: Tone;
  sparkline: number[];
};

export type EvalCase = (typeof evals.casos)[number];

const num = (n: number, d = 0) => n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
const usd = (n: number, d = 2) => `USD ${num(n, d)}`;
const seg = (ms: number) => `${num(ms / 1000, 1)} s`;
const pct = (f: number, d = 0) => `${num(f * 100, d)} %`;

export const corte = {
  evals: evals.generadoEn,
  telemetria: telemetria.generadoEn,
  dominio: dominio.generadoEn,
  ventana: telemetria.ventana,
  juez: evals.juez,
};

// ---- Evals -----------------------------------------------------------------
export const casos = evals.casos;
const aprobados = casos.filter((c) => c.veredicto === "passed").length;
const juicios = casos.flatMap((c) => c.aserciones.filter((a) => a.nombre.startsWith("judge")));
const puntajeJuez = juicios.reduce((s, a) => s + a.puntaje, 0) / Math.max(1, juicios.length);
const caso = (id: string) => casos.find((c) => c.id === id);
const costoEmpresario = caso("asesor/camino-feliz")?.costoUsd ?? 0;
const copiloto = casos.filter((c) => c.agente === "copiloto");
const costoCopiloto = copiloto.reduce((s, c) => s + c.costoUsd, 0) / Math.max(1, copiloto.length);
const adversariales = casos.filter((c) => c.tags.includes("adversarial"));
const adversarialesOk = adversariales.filter((c) => c.veredicto === "passed").length;

const CATEGORIAS: { nombre: string; tags: string[] }[] = [
  { nombre: "Flujo", tags: ["flujo"] },
  { nombre: "Handoff", tags: ["handoff"] },
  { nombre: "Adversarial", tags: ["adversarial"] },
  { nombre: "Privacidad", tags: ["privacidad"] },
  { nombre: "Jev", tags: ["jev", "degradacion"] },
  { nombre: "Gobierno", tags: ["cumplimiento", "gobierno"] },
  { nombre: "Monitor", tags: ["monitor"] },
];
export const evalsPorCategoria = CATEGORIAS.map(({ nombre, tags }) => {
  const grupo = casos.filter((c) => c.tags.some((t) => tags.includes(t)));
  const ok = grupo.flatMap((c) => c.aserciones).filter((a) => a.aprobada);
  return {
    name: nombre,
    deterministas: ok.filter((a) => !a.nombre.startsWith("judge")).length,
    juez: ok.filter((a) => a.nombre.startsWith("judge")).length,
  };
});

// ---- Telemetría (AI Gateway) ---------------------------------------------
const gw = telemetria.gateway;
const modelo = (id: string) => gw.porModelo.find((m) => m.modelo === id);
const opus = modelo("anthropic/claude-opus-5.5");
const NOMBRE_MODELO: Record<string, string> = {
  "anthropic/claude-opus-5.5": "Opus 5.5",
  "anthropic/claude-sonnet-5.5": "Sonnet 5.5",
  "anthropic/claude-haiku-5.5": "Haiku 5.5",
  "typesafe-ai/jev": "Jev",
};
export const latenciaPorModelo = gw.porModelo.map((m) => ({
  name: NOMBRE_MODELO[m.modelo] ?? m.modelo,
  p50: Number((m.latenciaP50Ms / 1000).toFixed(2)),
  p95: Number((m.latenciaP95Ms / 1000).toFixed(2)),
  solicitudes: m.solicitudes,
  costoUsd: m.costoUsd,
}));
export const traficoHorario = gw.serieHoraria.map((h) => ({
  key: h.hora,
  tick: new Date(h.hora).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" }),
  solicitudes: h.solicitudes,
  costo: h.costoUsd,
}));
export const gatewayResumen = {
  costo: usd(gw.costoUsd),
  solicitudes: num(gw.solicitudes),
  exito: gw.tasaExito == null ? "s. d." : pct(gw.tasaExito, 1),
};

// ---- Dominio ---------------------------------------------------------------
const decisiones = dominio.solicitudes;
const automaticas = decisiones.filter((s) => s.decision === "aprobacion_automatica").length;
const cartera = dominio.cartera;
const concentracion = cartera.exposicionPorPagador[0];

// ---- Tarjetas KPI ----------------------------------------------------------
export const metricCards: MetricCard[] = [
  {
    id: "evals",
    title: "Evals aprobados",
    label: `Juez ${evals.juez} · modelo real`,
    value: `${aprobados}/${casos.length}`,
    delta: pct(aprobados / Math.max(1, casos.length)),
    deltaVariant: aprobados === casos.length ? "success-light" : "destructive-light",
    detail: `puntaje juez ${num(puntajeJuez, 2)}`,
    tone: aprobados === casos.length ? "success" : "danger",
    sparkline: casos.map((c) => Math.min(...c.aserciones.map((a) => a.puntaje))),
  },
  {
    id: "costo",
    title: "Costo IA por solicitud",
    label: "Flujo Empresario completo",
    value: usd(costoEmpresario),
    delta: `Copiloto ${usd(costoCopiloto)}`,
    deltaVariant: "info-light",
    detail: "por consulta",
    tone: "info",
    sparkline: casos.map((c) => c.costoUsd),
  },
  {
    id: "latencia",
    title: "Latencia del Asesor",
    label: "p50 por llamada · Opus 5.5",
    value: opus ? seg(opus.latenciaP50Ms) : "s. d.",
    delta: opus ? `p95 ${seg(opus.latenciaP95Ms)}` : "s. d.",
    deltaVariant: "warning-light",
    detail: opus ? `primer token ${seg(opus.ttftP50Ms)}` : "",
    tone: "warning",
    sparkline: traficoHorario.map((h) => h.solicitudes),
  },
  {
    id: "autonomia",
    title: "Decisiones con persona",
    label: "Comité o rechazo explicado (casos demo)",
    value: `${decisiones.length - automaticas} de ${decisiones.length}`,
    delta: `${automaticas} automática`,
    deltaVariant: "success-light",
    detail: "dentro de política",
    tone: "success",
    sparkline: decisiones.map((s) => s.score),
  },
];

// ---- Alertas y controles ---------------------------------------------------
export const carriles: {
  id: string;
  label: string;
  source: string;
  state: string;
  value: string;
  progress: number;
  tone: Tone;
}[] = [
  {
    id: "00",
    label: "Concentración por pagador",
    source: concentracion?.pagador ?? "",
    state: "Alerta de riesgo",
    value: concentracion ? `${num(concentracion.participacionPct, 1)} %` : "s. d.",
    progress: concentracion?.participacionPct ?? 0,
    tone: "danger",
  },
  ...cartera.alertas
    .filter((a) => a.tipo === "vencimiento_proximo")
    .map((a) => ({
      id: "01",
      label: `Vencimiento ${a.operacion ?? ""}`.trim(),
      source: "Monitor de cartera",
      state: "Seguimiento",
      value: /(\d+) días/.exec(a.detalle)?.[0] ?? "",
      progress: 100 - Math.min(100, Number(/(\d+) días/.exec(a.detalle)?.[1] ?? 0) * 3),
      tone: "warning" as const,
    })),
  {
    id: "02",
    label: "Ataques resistidos",
    source: "Guardián + evals adversariales",
    state: "Bloqueados",
    value: `${adversarialesOk}/${adversariales.length}`,
    progress: (adversarialesOk / Math.max(1, adversariales.length)) * 100,
    tone: "success",
  },
  {
    id: "03",
    label: "Pagadas a tiempo",
    source: "Cartera histórica",
    state: "Indicador de pago",
    value: `${num(cartera.kpis.pagadasATiempoPct)} %`,
    progress: cartera.kpis.pagadasATiempoPct,
    tone: "info",
  },
];

// ---- Tablero de indicadores (las 7 familias que pide el reto) --------------
export type Indicador = { categoria: string; indicador: string; valor: string; meta: string; fuente: string; estado: "ok" | "alerta" | "pendiente" };
export const indicadores: Indicador[] = [
  { categoria: "Producto", indicador: "Decisión automática dentro de política", valor: `${automaticas} de ${decisiones.length} casos demo`, meta: "≥ 50 % de solicitudes elegibles", fuente: "Motor de políticas", estado: "pendiente" },
  { categoria: "Producto", indicador: "Tiempo de solicitud a desembolso (flujo feliz)", valor: seg(caso("asesor/camino-feliz")?.duracionMs ?? 0), meta: "< 10 min", fuente: "Eval camino-feliz", estado: "ok" },
  { categoria: "Experiencia", indicador: "Latencia del Asesor p50 / p95", valor: opus ? `${seg(opus.latenciaP50Ms)} / ${seg(opus.latenciaP95Ms)}` : "s. d.", meta: "p95 < 15 s por respuesta", fuente: "AI Gateway", estado: "ok" },
  { categoria: "Adopción", indicador: "Sesiones de agente registradas", valor: num(telemetria.agentRuns.resumen.runs), meta: "Definir con el banco (piloto)", fuente: "Vercel Agent Runs", estado: "pendiente" },
  { categoria: "Calidad de agentes", indicador: "Evals aprobados (gates)", valor: `${aprobados}/${casos.length}`, meta: "100 % antes de cada despliegue", fuente: "eve eval + juez Jev", estado: aprobados === casos.length ? "ok" : "alerta" },
  { categoria: "Calidad de agentes", indicador: "Puntaje medio del juez", valor: num(puntajeJuez, 2), meta: "≥ 0,80", fuente: "eve eval + juez Jev", estado: puntajeJuez >= 0.8 ? "ok" : "alerta" },
  { categoria: "Costo", indicador: "Costo IA por solicitud (Empresario)", valor: usd(costoEmpresario), meta: "< USD 0,50", fuente: "Eventos de uso (eval)", estado: costoEmpresario < 0.5 ? "ok" : "alerta" },
  { categoria: "Costo", indicador: `Gasto total del Gateway (${telemetria.ventana})`, valor: usd(gw.costoUsd), meta: "Tope de la clave: USD 50", fuente: "AI Gateway", estado: gw.costoUsd < 50 ? "ok" : "alerta" },
  { categoria: "Riesgo", indicador: "Concentración máxima por pagador", valor: concentracion ? `${num(concentracion.participacionPct, 1)} %` : "s. d.", meta: "≤ 40 % (supuesto a validar)", fuente: "Monitor de cartera", estado: (concentracion?.participacionPct ?? 0) > 40 ? "alerta" : "ok" },
  { categoria: "Riesgo", indicador: "Disponibilidad del Gateway", valor: gatewayResumen.exito, meta: "≥ 99,5 %", fuente: "AI Gateway", estado: (gw.tasaExito ?? 0) >= 0.995 ? "ok" : "alerta" },
  { categoria: "Cumplimiento", indicador: "Mensajes adversariales resistidos", valor: `${adversarialesOk}/${adversariales.length}`, meta: "100 %", fuente: "Evals adversariales", estado: adversarialesOk === adversariales.length ? "ok" : "alerta" },
  { categoria: "Cumplimiento", indicador: "Desembolso solo con firma del cliente", valor: caso("asesor/camino-feliz")?.veredicto === "passed" ? "Verificado" : "Revisar", meta: "Siempre", fuente: "Eval camino-feliz (aprobación obligatoria)", estado: caso("asesor/camino-feliz")?.veredicto === "passed" ? "ok" : "alerta" },
];
