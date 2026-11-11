// Congela una corrida real de evals en apps/web/data/evals.json (lo que muestra /banco/metricas).
// Uso:
//   node scripts/exportar-evals.ts                       # corre ambas suites con el modelo real y exporta
//   node scripts/exportar-evals.ts asesor.json copiloto.json   # exporta salidas `eve eval --json` existentes (sin costo)
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const AGENTES = ["asesor", "copiloto"] as const;
const SALIDA = "apps/web/data/evals.json";

type Asercion = {
  name: string;
  key?: string;
  score: number;
  severity: "gate" | "soft";
  threshold?: number;
  passed: boolean;
  errored: boolean;
  message?: string;
  metadata?: { question?: { instructions?: string } };
};
type Resultado = {
  id: string;
  verdict: string;
  error?: string;
  startedAt: string;
  completedAt: string;
  assertions?: Asercion[];
  result?: { reply?: string; events?: { type: string; data?: any }[] };
};
type Reporte = { startedAt: string; completedAt: string; passed: number; failed: number; results: Resultado[] };

const leerJson = <T>(texto: string): T => JSON.parse(texto.slice(texto.indexOf("{")));

function correr(agente: string): string {
  try {
    return execFileSync("npx", ["eve", "eval", "--agent", agente, "--json"], { encoding: "utf8", maxBuffer: 1 << 28 });
  } catch (e: any) {
    return e.stdout as string; // exit 1 = hubo fallos; el reporte igual se exporta
  }
}

function catalogo(agente: string) {
  const lista = execFileSync("npx", ["eve", "eval", "--agent", agente, "--list"], { encoding: "utf8" });
  const m = new Map<string, { descripcion: string; tags: string[] }>();
  for (const linea of lista.split("\n")) {
    const r = /^(\S+) \[([^\]]*)\] — (.*)$/.exec(linea.trim());
    if (r) m.set(r[1]!, { tags: r[2]!.split(",").map((s) => s.trim()), descripcion: r[3]! });
  }
  return m;
}

const recortar = (s = "", n = 700) => (s.length > n ? `${s.slice(0, n)}…` : s);

const archivos = process.argv.slice(2);
const casos = [];
let inicio = "";
let fin = "";
for (const [i, agente] of AGENTES.entries()) {
  const reporte = leerJson<Reporte>(archivos[i] ? readFileSync(archivos[i]!, "utf8") : correr(agente));
  const meta = catalogo(agente);
  inicio = !inicio || reporte.startedAt < inicio ? reporte.startedAt : inicio;
  fin = reporte.completedAt > fin ? reporte.completedAt : fin;
  for (const r of reporte.results) {
    const eventos = r.result?.events ?? [];
    let costoUsd = 0;
    let tokens = 0;
    for (const e of eventos)
      if (e.type === "usage.recorded") {
        costoUsd += e.data?.usage?.costUsd ?? 0;
        tokens += (e.data?.usage?.inputTokens ?? 0) + (e.data?.usage?.outputTokens ?? 0);
      }
    casos.push({
      id: `${agente}/${r.id}`,
      agente,
      descripcion: meta.get(r.id)?.descripcion ?? r.id,
      tags: meta.get(r.id)?.tags ?? [],
      veredicto: r.verdict,
      error: r.error,
      duracionMs: Date.parse(r.completedAt) - Date.parse(r.startedAt),
      costoUsd: Number(costoUsd.toFixed(4)),
      tokens,
      herramientas: eventos.filter((e) => e.type === "call.requested").length,
      respuesta: recortar(r.result?.reply),
      aserciones: (r.assertions ?? []).map((a) => ({
        nombre: a.name,
        aprobada: a.passed,
        puntaje: a.score,
        umbral: a.threshold ?? null,
        severidad: a.severity,
        criterio: a.metadata?.question?.instructions ?? null,
        detalle: a.passed ? null : recortar(a.message, 400),
      })),
    });
  }
}

const snapshot = {
  generadoEn: fin,
  inicio,
  juez: "typesafe-ai/jev",
  modelos: {
    asesor: "anthropic/claude-opus-5.5 (subagentes claude-haiku-5.5)",
    copiloto: "anthropic/claude-sonnet-5.5 (subagentes claude-haiku-5.5)",
  },
  totales: {
    casos: casos.length,
    aprobados: casos.filter((c) => c.veredicto === "passed").length,
    costoUsd: Number(casos.reduce((s, c) => s + c.costoUsd, 0).toFixed(4)),
    duracionMs: Date.parse(fin) - Date.parse(inicio),
  },
  casos,
};

mkdirSync("apps/web/data", { recursive: true });
writeFileSync(SALIDA, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`${SALIDA}: ${snapshot.totales.aprobados}/${snapshot.totales.casos} aprobados, USD ${snapshot.totales.costoUsd}`);
