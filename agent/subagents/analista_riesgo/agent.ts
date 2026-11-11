import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Analista de riesgo de factoring: consulta facturas en RADIAN, buró de crédito y calificación del pagador, calcula un score explicable, aplica las políticas de crédito y, si corresponde, calcula la oferta de descuento. Envíale el NIT y el número de factura. Recomienda; nunca aprueba montos por encima del umbral ni casos de comité.",
  // Sin bash, archivos ni web: el agente solo usa las tools del dominio (superficie mínima).
  defaultTools: false,
  model: "anthropic/claude-haiku-5.5",
  reasoning: "medium",
  // Solo se invoca desde el workflow `evaluar_solicitud`, después del Guardián.
  tool: false,
});
