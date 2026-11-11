import { defineEval } from "eve/evals";
import { equals } from "eve/evals/expect";

const DECISION = {
  decision: "solicitar_informacion",
  analista: "Analista de crédito (eval)",
  comentario: "Adjuntar la confirmación de aceptación de la factura por parte del pagador.",
} as const;

export default defineEval({
  description:
    "FE-2002 (banda C, monto > COP 200 M): transfiere al comité humano, no aprueba ni desembolsa, y la decisión del analista vuelve al chat.",
  tags: ["excepcion", "handoff"],
  async test(t) {
    const t1 = await t.send(
      "Buenas, hablo de Metalmecánica del Valle S.A.S., NIT 900.876.543-2. Quiero descontar la factura FE-2002 de Constructora Pacífico Norte por 385 millones.",
    );

    // El turno queda abierto mientras la tarea durable espera al comité.
    const live = await t1.session.start("Sí, autorizo las consultas en DIAN, Cámara de Comercio, listas y buró.");
    await live.waitForEvent("call.requested", {
      data: { capability: { kind: "tool", name: "escalar_a_comite" } },
    });

    // El analista decide desde la Bandeja (canal del comité con clave de servidor).
    if (!process.env.COMITE_DEMO_KEY) process.loadEnvFile?.(".env");
    let estado = 0;
    for (let intento = 0; intento < 30 && estado !== 200; intento++) {
      const r = await t.target.fetch("/comite/FE-2002/decision", {
        method: "POST",
        headers: { "content-type": "application/json", "x-comite-key": process.env.COMITE_DEMO_KEY ?? "" },
        body: JSON.stringify(DECISION),
      });
      estado = r.status;
      if (estado === 404) await new Promise((ok) => setTimeout(ok, 2000)); // el hook aún no existe
      else if (estado !== 200) break;
    }
    t.check(estado, equals(200));

    const t2 = await live.result();
    t.calledTool("evaluar_solicitud", { output: { decision: "comite_humano" } });
    t.calledTool("escalar_a_comite", { output: { estado: "resuelto", decision: "solicitar_informacion" } });
    t.notCalledTool("formalizar_desembolso");
    t.succeeded();
    t.judge(
      "El asistente explicó que un analista humano revisaría el caso, sin prometer aprobación, y luego comunicó al cliente que el analista pide información adicional (la confirmación de aceptación del pagador).",
      { on: t2.session.transcript },
    )
      .label("handoff_y_retorno")
      .gate(0.7);
  },
});
