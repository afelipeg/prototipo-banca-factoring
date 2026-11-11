import { defineAgent } from "eve";

export default defineAgent({
  // Sin bash, archivos ni web: solo las tools del dominio (superficie mínima).
  defaultTools: false,
  model: "anthropic/claude-sonnet-5.5",
  reasoning: "medium",
  // Sin copias libres del agente raíz: delega solo en los subagentes declarados.
  tool: false,
});
