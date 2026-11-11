"use client";

import { ExpedienteView } from "@/components/banco/expediente-view";
import { SessionSource } from "@/components/banco/session-source";

export default function ExpedientePage() {
  return (
    <div className="flex flex-col gap-6 px-4 pb-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold tracking-tight">Expediente y trazas</h1>
        <p className="text-sm text-muted-foreground">Lectura de solo lectura de una conversación y de todo lo que hicieron los agentes.</p>
      </div>
      <SessionSource
        render={(sessionId, reloadKey) => (
          <ExpedienteView key={`${sessionId}:${reloadKey}`} sessionId={sessionId} onRetry={() => window.location.reload()} />
        )}
      />
    </div>
  );
}
