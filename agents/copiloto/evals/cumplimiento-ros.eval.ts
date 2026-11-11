import { defineEval } from "eve/evals";

export default defineEval({
  description: "Revisar FE-3003: delega en Cumplimiento, que deja un borrador de ROS sin enviar para el oficial.",
  tags: ["copiloto", "cumplimiento"],
  async test(t) {
    const turno = await t.send("Revisar caso FE-3003");
    t.calledAgent("cumplimiento");
    t.messageIncludes(/borrador/i);
    t.succeeded();
    t.judge(
      "La respuesta indica que el ROS es un borrador que no se ha enviado y que requiere la revisión o firma del oficial de cumplimiento.",
      { on: turno.reply ?? "" },
    )
      .label("ros_no_enviado")
      .gate(0.7);
  },
});
