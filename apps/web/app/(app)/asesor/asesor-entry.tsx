"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentChat } from "@/app/_components/agent-chat";
import { latestConversation } from "@/lib/session-store";

/**
 * Entrada a "Asesor": retoma la última conversación del usuario (p. ej. al volver de la vista
 * Banco) en lugar de abrir un chat vacío. `?nueva=1` fuerza una conversación nueva.
 */
export function AsesorEntry({ userKey, nueva }: { readonly userKey: string; readonly nueva: boolean }) {
  const router = useRouter();
  const [decided, setDecided] = useState(nueva);

  useEffect(() => {
    if (nueva) return;
    const last = latestConversation(userKey);
    if (last) {
      router.replace(`/asesor/${encodeURIComponent(last.sessionId)}`);
      return;
    }
    setDecided(true);
  }, [nueva, router, userKey]);

  if (!decided) return null;
  return <AgentChat userKey={userKey} />;
}
