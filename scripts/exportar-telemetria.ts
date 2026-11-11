// Instantánea de telemetría de Vercel (AI Gateway + Agent Runs) para /banco/metricas.
// Usa las credenciales de la Vercel CLI del operador; la app no guarda ningún token.
// Uso: node scripts/exportar-telemetria.ts --key-name <nombre de la clave del Gateway> [--since 7d]
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const EQUIPO = "team_QM0JjeXOpTCdZqiBZ1KRq467";
const PROYECTO = "prototipo-banca-factoring";
const arg = (n: string) => {
  const i = process.argv.indexOf(n);
  return i > 0 ? process.argv[i + 1] : undefined;
};
// Nombre (no el valor) de la clave del AI Gateway exclusiva del prototipo: el gasto se atribuye por clave.
const NOMBRE_CLAVE = arg("--key-name");
if (!NOMBRE_CLAVE) throw new Error("Falta --key-name <nombre de la clave del AI Gateway>");
const DESDE = arg("--since") ?? "7d";
const SALIDA = "apps/web/data/telemetria.json";

function vercel(args: string[]): any {
  const out = execFileSync("vercel", ["--scope", EQUIPO, ...args, "--json"], {
    encoding: "utf8",
    maxBuffer: 1 << 26,
    stdio: ["ignore", "pipe", "ignore"],
  });
  return JSON.parse(out.slice(out.indexOf("{")));
}

type Fila = Record<string, string | number>;
function metrica(nombre: string, agregacion: string, extra: string[] = []): { summary: Fila[]; data: Fila[] } {
  return vercel([
    "metrics", `vercel.ai_gateway.request.${nombre}`, "-a", agregacion, "--all", "--since", DESDE,
    "-f", `keyName:"${NOMBRE_CLAVE}"`, ...extra,
  ]);
}

const valor = (f: Fila) => Number(Object.entries(f).find(([k]) => k.startsWith("vercel_"))?.[1] ?? 0);
const porModelo = (r: { summary: Fila[] }) =>
  Object.fromEntries(r.summary.map((f) => [String(f.aiModel || "otro"), valor(f)]));
const total = (r: { summary: Fila[] }) => r.summary.reduce((s, f) => s + valor(f), 0);

const costo = metrica("cost", "sum", ["--group-by", "aiModel"]);
const solicitudes = metrica("count", "count", ["--group-by", "aiModel"]);
const exitosas = metrica("succeeded_requests", "sum");
const entrada = metrica("input_tokens", "sum", ["--group-by", "aiModel"]);
const salida = metrica("output_tokens", "sum", ["--group-by", "aiModel"]);
const p50 = metrica("request_duration_ms", "p50", ["--group-by", "aiModel"]);
const p95 = metrica("request_duration_ms", "p95", ["--group-by", "aiModel"]);
const ttft = metrica("time_to_first_token_ms", "p50", ["--group-by", "aiModel"]);
// Serie horaria de las últimas 24 h (la ventana completa queda en los totales).
const costoHorario = metrica("cost", "sum", ["-g", "1h", "--since", "24h"]);
const solicitudesHorarias = metrica("count", "count", ["-g", "1h", "--since", "24h"]);

const modelos = Object.keys(porModelo(costo));
const runs = vercel(["agent-runs", "list", "--project", PROYECTO, "--since", DESDE, "--limit", "100"]);

const hora = (f: Fila) => String(f.timestamp ?? f.time ?? f.bucket ?? "");
const serie = new Map<string, { hora: string; costoUsd: number; solicitudes: number }>();
for (const f of costoHorario.data) serie.set(hora(f), { hora: hora(f), costoUsd: Number(valor(f).toFixed(4)), solicitudes: 0 });
for (const f of solicitudesHorarias.data) {
  const d = serie.get(hora(f)) ?? { hora: hora(f), costoUsd: 0, solicitudes: 0 };
  d.solicitudes = valor(f);
  serie.set(hora(f), d);
}

const nSolicitudes = total(solicitudes);
const snapshot = {
  generadoEn: new Date().toISOString(),
  ventana: DESDE,
  fuente: `Vercel AI Gateway (clave del prototipo) y Vercel Agent Runs (${PROYECTO})`,
  nota: "Incluye tráfico de desarrollo, evals y producción de la clave del prototipo.",
  gateway: {
    costoUsd: Number(total(costo).toFixed(4)),
    solicitudes: nSolicitudes,
    tasaExito: nSolicitudes ? Number((total(exitosas) / nSolicitudes).toFixed(4)) : null,
    porModelo: modelos.map((m) => ({
      modelo: m,
      costoUsd: Number((porModelo(costo)[m] ?? 0).toFixed(4)),
      solicitudes: porModelo(solicitudes)[m] ?? 0,
      tokensEntrada: porModelo(entrada)[m] ?? 0,
      tokensSalida: porModelo(salida)[m] ?? 0,
      latenciaP50Ms: Math.round(porModelo(p50)[m] ?? 0),
      latenciaP95Ms: Math.round(porModelo(p95)[m] ?? 0),
      ttftP50Ms: Math.round(porModelo(ttft)[m] ?? 0),
    })),
    serieHoraria: [...serie.values()].filter((d) => d.hora).sort((a, b) => a.hora.localeCompare(b.hora)),
  },
  agentRuns: {
    resumen: runs.summary,
    porEstado: runs.runs.reduce((acc: Record<string, number>, r: any) => ((acc[r.status] = (acc[r.status] ?? 0) + 1), acc), {}),
    tokens: runs.runs.reduce((s: number, r: any) => s + (r.usage?.totalTokens ?? 0), 0),
    confianza: runs.meta?.dataConfidence ?? null,
  },
};

mkdirSync("apps/web/data", { recursive: true });
writeFileSync(SALIDA, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`${SALIDA}: USD ${snapshot.gateway.costoUsd}, ${nSolicitudes} solicitudes, ${modelos.length} modelos`);
