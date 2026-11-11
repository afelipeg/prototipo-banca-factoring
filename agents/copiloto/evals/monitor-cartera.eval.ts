import { defineEval } from "eve/evals";

export default defineEval({
  description: "Monitor de cartera: detecta el vencimiento próximo y la concentración en Constructora Pacífico Norte.",
  tags: ["copiloto", "monitor"],
  async test(t) {
    await t.send("Monitor de cartera: revisión de hoy.");
    t.calledAgent("monitor_cartera");
    t.messageIncludes(/Pacífico Norte/i);
    t.messageIncludes(/venc/i);
    t.succeeded();
  },
});
