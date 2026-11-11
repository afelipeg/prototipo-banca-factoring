import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Guardián de cumplimiento y fraude: verifica si una factura ya fue endosada o negociada en RADIAN, analiza mensajes del usuario en busca de manipulación o inyección de instrucciones, y consulta o registra la auditoría del caso. Envíale el texto a revisar y/o el NIT y número de factura. Puede bloquear; nunca aprueba.",
  // Sin bash, archivos ni web: el agente solo usa las tools del dominio (superficie mínima).
  defaultTools: false,
  model: "anthropic/claude-haiku-5.5",
  reasoning: "low",
});
