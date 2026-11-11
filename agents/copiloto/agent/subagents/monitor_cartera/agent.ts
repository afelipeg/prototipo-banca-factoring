import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Monitor de cartera de factoring: revisa vencimientos, operaciones vencidas, concentración por pagador y pagadores de baja calificación, y devuelve KPIs y alertas priorizadas. Envíale la instrucción de revisión (p. ej. 'revisión diaria').",
  defaultTools: false,
  model: "anthropic/claude-haiku-5.5",
  reasoning: "low",
});
