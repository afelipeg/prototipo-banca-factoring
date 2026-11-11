import { defineChannel, POST } from "eve/channels";
import { z } from "zod";

const body = z.object({
  decision: z.enum(["aprobar", "rechazar", "solicitar_informacion"]),
  analista: z.string().min(1),
  comentario: z.string().optional(),
});

/**
 * Bandeja del analista: entrega la decisión humana al workflow que espera en
 * `escalar_a_comite`. PROTOTIPO: la autorización es una clave compartida de demo
 * (`COMITE_DEMO_KEY`). En producción debe ser la identidad del analista (SSO) con
 * rol y segregación de funciones.
 */
export default defineChannel({
  routes: [
    POST("/comite/:numeroFactura/decision", async (request, { params }) => {
      const esperado = process.env.COMITE_DEMO_KEY;
      if (!esperado || request.headers.get("x-comite-key") !== esperado) {
        return Response.json({ error: "No autorizado" }, { status: 401 });
      }

      const parsed = body.safeParse(await request.json().catch(() => null));
      if (!parsed.success) {
        return Response.json({ error: "Cuerpo inválido", detalle: parsed.error.issues }, { status: 400 });
      }

      const { resumeHook } = await import("eve/workflow/api");
      try {
        await resumeHook(`comite-${params.numeroFactura}`, parsed.data);
      } catch (error) {
        return Response.json(
          { error: "No hay un caso esperando decisión para esta factura", detalle: String(error) },
          { status: 404 },
        );
      }
      return Response.json({ ok: true, numeroFactura: params.numeroFactura, ...parsed.data });
    }),
  ],
});
