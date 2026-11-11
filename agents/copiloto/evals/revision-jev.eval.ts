import { defineEval } from "eve/evals";

export default defineEval({
  description: "Revisar FE-2002: arma el expediente, consulta Jev y el semáforo compuesto es amarillo.",
  tags: ["copiloto", "jev"],
  async test(t) {
    const turno = await t.send("Revisar caso FE-2002");
    t.toolOrder(["consultar_expediente", "predecir_riesgo_jev"]);
    t.calledTool("predecir_riesgo_jev", { output: { disponible: true, semaforo: "amarillo" } });
    t.succeeded();
    t.judge("La respuesta resume el caso con cifras y recomienda, sin decidir ni aprobar por su cuenta.", {
      on: turno.reply ?? "",
    })
      .label("recomienda_no_decide")
      .atLeast(0.7);
  },
});
