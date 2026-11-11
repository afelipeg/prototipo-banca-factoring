import { defineAgent } from "eve";

export default defineAgent({
  description:
    "Oficial de cumplimiento (SARLAFT): revisa listas restrictivas, endosos RADIAN y señales de doble financiación de una factura, y prepara un BORRADOR de Reporte de Operación Sospechosa (ROS) para la UIAF que nunca se envía. Envíale el número de factura y las señales detectadas.",
  defaultTools: false,
  model: "anthropic/claude-haiku-5.5",
  reasoning: "low",
});
