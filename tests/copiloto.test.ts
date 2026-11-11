import assert from "node:assert/strict";
import { test } from "node:test";
import { armarExpediente } from "../lib/expediente.ts";
import { componerSemaforo, predecirConJev } from "../lib/jev.ts";
import { analizarCartera } from "../lib/monitor.ts";

test("expediente: FE-2002 va a comité con banda C y oferta; FE-3003 se rechaza sin oferta", () => {
  const e2 = armarExpediente("fe-2002");
  assert.equal(e2?.score.banda, "C");
  assert.equal(e2?.politicas.decision, "comite_humano");
  assert.equal(e2?.oferta?.hayOferta, true);
  const e3 = armarExpediente("FE-3003");
  assert.equal(e3?.politicas.decision, "rechazo");
  assert.equal(e3?.oferta, null);
  assert.equal(armarExpediente("FE-9999"), undefined);
});

test("semáforo: fraude alto o banda D es rojo; banda C es amarillo; sin señales es verde", () => {
  const limpio = { probImpago: 0.1, probDisputa: 0.1, probFraude: 0.05, probCoherencia: 0.9 };
  assert.equal(componerSemaforo(limpio, "A").semaforo, "verde");
  assert.equal(componerSemaforo(limpio, "C").semaforo, "amarillo");
  assert.equal(componerSemaforo(limpio, "D").semaforo, "rojo");
  assert.equal(componerSemaforo({ ...limpio, probFraude: 0.8 }, "A").semaforo, "rojo");
  assert.equal(componerSemaforo({ ...limpio, probImpago: 0.4 }, "A").semaforo, "amarillo");
});

test("Jev: sin clave no llama a la API y lo informa", async () => {
  const antes = process.env.TYPESAFE_API_KEY;
  delete process.env.TYPESAFE_API_KEY;
  const r = await predecirConJev(armarExpediente("FE-1001")!);
  assert.equal(r.disponible, false);
  if (antes !== undefined) process.env.TYPESAFE_API_KEY = antes;
});

test("Jev: interpreta la respuesta documentada de /v1/systemone", async (t) => {
  const antes = process.env.TYPESAFE_API_KEY;
  process.env.TYPESAFE_API_KEY = "test";
  let cuerpo: any;
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    cuerpo = JSON.parse(String(init.body));
    return new Response(
      JSON.stringify({
        model: "jev-latest",
        answers: {
          impago: { type: "score", score: 2.4, confidence: 0.7, probabilities: { "0": 0.05, "1": 0.15, "2": 0.3, "3": 0.4, "4": 0.1 } },
          disputa: { type: "noul", noul: 0.55 },
          fraude: { type: "noul", noul: 0.1 },
          coherencia: { type: "noul", noul: 0.8 },
          motivo: { type: "choice", choice: "calidad_pagador", confidence: 0.6, probabilities: { calidad_pagador: 0.6, concentracion: 0.4 } },
        },
        usage: { input_tokens: 512, output_tokens: 10 },
      }),
      { status: 200 },
    );
  });
  const r = await predecirConJev(armarExpediente("FE-2002")!);
  if (antes === undefined) delete process.env.TYPESAFE_API_KEY;
  else process.env.TYPESAFE_API_KEY = antes;

  assert.equal(cuerpo.model, "jev-latest");
  assert.deepEqual(Object.keys(cuerpo.questions), ["impago", "disputa", "fraude", "coherencia", "motivo"]);
  assert.equal(cuerpo.questions.impago.type, "score");
  assert.equal(r.disponible, true);
  if (!r.disponible) return;
  assert.equal(r.probImpago, 0.6);
  assert.equal(r.semaforo, "rojo");
  assert.equal(r.distribucionImpago.length, 5);
  assert.equal(r.motivoPrincipal, "calidad_pagador");
  assert.equal(r.tokens, 512);
});

test("monitor: sin operaciones vencidas; detecta el vencimiento próximo y la concentración", () => {
  const a = analizarCartera();
  const tipos = a.alertas.map((x) => x.tipo);
  assert.ok(!tipos.includes("vencida"));
  assert.ok(tipos.includes("vencimiento_proximo"));
  assert.ok(tipos.includes("concentracion_pagador"));
  assert.equal(a.kpis.operacionesActivas, 2);
  assert.equal(a.vencimientosPorSemana[0]?.semana, "S1");
});
