import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";

const body = z.object({
  decision: z.enum(["aprobar", "rechazar", "solicitar_informacion"]),
  analista: z.string().min(1),
  comentario: z.string().optional(),
});

/**
 * Reenvía la decisión del analista al canal `comite` del agente. La clave `x-comite-key`
 * vive solo en el servidor (COMITE_DEMO_KEY); el navegador nunca la ve.
 */
export async function POST(request: Request, { params }: { params: Promise<{ numeroFactura: string }> }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { numeroFactura } = await params;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Decisión inválida.", detalle: parsed.error.issues }, { status: 400 });
  }
  const key = process.env.COMITE_DEMO_KEY;
  if (!key) return NextResponse.json({ error: "El servidor no tiene configurada la clave del comité." }, { status: 500 });

  // El agente se publica en el mismo origen (vercel.ts enruta /comite/* al servicio `eve`).
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "");
  const base = process.env.AGENT_BASE_URL ?? (host ? `${proto}://${host}` : new URL(request.url).origin);
  let upstream: Response;
  try {
    upstream = await fetch(`${base}/comite/${encodeURIComponent(numeroFactura)}/decision`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-comite-key": key },
      body: JSON.stringify(parsed.data),
      cache: "no-store",
      redirect: "manual",
    });
  } catch {
    return NextResponse.json({ error: "No fue posible comunicarse con el agente." }, { status: 502 });
  }

  if (upstream.status === 404) {
    return NextResponse.json(
      { error: "No hay una sesión esperando decisión para esta factura (inicie el flujo 2 en la vista Empresario)." },
      { status: 404 },
    );
  }
  if (upstream.status === 401) {
    return NextResponse.json({ error: "El agente rechazó la clave del comité." }, { status: 502 });
  }
  const data = (await upstream.json().catch(() => ({}))) as unknown;
  return NextResponse.json(data, { status: upstream.status });
}
