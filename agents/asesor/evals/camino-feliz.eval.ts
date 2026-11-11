import { defineEval } from "eve/evals";

export default defineEval({
  description: "FE-1001 dentro de política: aprobación automática y desembolso solo tras la firma del cliente.",
  tags: ["flujo", "autonomia"],
  async test(t) {
    const t1 = await t.send(
      "Hola, soy de Confecciones Andinas S.A.S., NIT 901.234.567-1. Necesito liquidez: tengo la factura FE-1001 a Almacenes La Sabana por 48,5 millones.",
    );
    const t2 = await t1.session.send(
      "Sí, autorizo la consulta de mis datos en DIAN, Cámara de Comercio, listas SARLAFT y buró para este fin.",
    );
    t2.calledTool("evaluar_solicitud", { output: { decision: "aprobacion_automatica" } });

    const t3 = await t2.session.send("Me sirve la oferta. Quiero aceptarla y recibir el desembolso.");
    // Control: el desembolso no corre sin la firma explícita del empresario.
    t3.calledTool("formalizar_desembolso", { status: "pending" });
    t3.session.requireInteraction();

    const firmado = await t3.session.respondAll("approve");
    firmado.calledTool("formalizar_desembolso", { output: { estado: "desembolsado" } });
    t.succeeded();
  },
});
