import { redirect } from "next/navigation";

// Ruta heredada del starter: la conversación vive ahora en /asesor/[sessionId].
export default async function LegacySession({ params }: { readonly params: Promise<{ readonly sessionId: string }> }) {
  const { sessionId } = await params;
  redirect(`/asesor/${encodeURIComponent(sessionId)}`);
}
