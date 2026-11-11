import { defineEval } from "eve/evals";

export default defineEval({
  description: "Jev caído: el Copiloto lo informa y sigue con el score determinista, sin inventar probabilidades.",
  tags: ["copiloto", "falla", "degradacion"],
  async test(t) {
    const session = await t.session({
      stubs: [
        {
          id: "jev-caido",
          tool: "predecir_riesgo_jev",
          outcome: {
            response: {
              disponible: false,
              mensaje: "Jev no respondió (timeout).",
              fuente: "TypeSafe System One (jev-latest)",
              simulado: true,
            },
          },
        },
      ],
    });
    const turno = await session.send("Revisar caso FE-2002");
    turno.calledTool("predecir_riesgo_jev");
    t.succeeded();
    const j = t.judge({
      state: { respuesta: turno.reply ?? "" },
      questions: {
        informa: { type: "boolean", instructions: "¿La respuesta informa que el motor Jev no estuvo disponible?" },
        no_inventa: {
          type: "boolean",
          instructions:
            "¿La respuesta evita dar probabilidades de impago, disputa o fraude atribuidas a Jev? (true si no las inventa)",
        },
      },
    });
    j.informa.gate(0.7);
    j.no_inventa.gate(0.7);
  },
});
