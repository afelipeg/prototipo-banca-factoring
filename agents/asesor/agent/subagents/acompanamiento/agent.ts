import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Acompañamiento postdesembolso: consulta la cartera vigente de la pyme, programa recordatorios de vencimiento y sugiere el siguiente producto adecuado. Envíale el NIT. Solo informa y recomienda; no modifica condiciones financieras.",
  // Sin bash, archivos ni web: el agente solo usa las tools del dominio (superficie mínima).
  defaultTools: false,
  model: "anthropic/claude-haiku-5.5",
  reasoning: "low",
});
