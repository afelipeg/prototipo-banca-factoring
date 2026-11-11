import { defineAgent } from "eve";

export default defineAgent({
  // Sin bash, archivos ni web: el agente solo usa las tools del dominio (superficie mínima).
  defaultTools: false,
  model: "anthropic/claude-opus-5.5",
  reasoning: "high",
  // Sin copias libres del agente raíz: toda delegación pasa por subagentes declarados
  // o por el workflow `evaluar_solicitud`, para mantener el orden de controles.
  tool: false,
});
