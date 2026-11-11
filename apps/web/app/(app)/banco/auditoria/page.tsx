"use client";

import { AuditoriaView } from "@/components/banco/auditoria-view";
import { SessionSource } from "@/components/banco/session-source";

export default function AuditoriaPage() {
  return (
    <div className="flex flex-col gap-6 px-4 pb-6">
      <div className="flex flex-col gap-0.5">
        <h1 className="text-xl font-semibold tracking-tight">Auditoría</h1>
        <p className="text-sm text-muted-foreground">Hallazgos del Guardián, bloqueos, intentos de inyección y fuentes consultadas.</p>
      </div>
      <SessionSource
        render={(sessionId, reloadKey) => (
          <AuditoriaView key={`${sessionId}:${reloadKey}`} sessionId={sessionId} onRetry={() => window.location.reload()} />
        )}
      />
    </div>
  );
}
