import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Onboarding y KYC de la pyme: valida RUT (DIAN), Cámara de Comercio y listas SARLAFT, y registra el consentimiento de tratamiento de datos (Ley 1581). Envíale el NIT, la razón social declarada y si el usuario aceptó el consentimiento. Devuelve un dictamen KYC estructurado con inconsistencias y fuentes consultadas. No evalúa riesgo de crédito.",
  // Sin bash, archivos ni web: el agente solo usa las tools del dominio (superficie mínima).
  defaultTools: false,
  model: "anthropic/claude-haiku-5.5",
  reasoning: "low",
});
