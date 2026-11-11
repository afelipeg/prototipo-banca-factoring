"use client";

import { useEveAgent } from "eve/react";
import { useMemo } from "react";
import { WEB_CHAT_AGENT } from "@/app/eve-agent";
import { buildAudit, buildTimeline, buildTrace } from "@/lib/trace";

/**
 * Lectura de solo lectura de una sesión existente: pone al día el stream (`followWhile` cierra
 * la conexión al terminar) y sigue las sesiones hijas de los subagentes. Montar con `key`
 * distinta para volver a leer.
 */
export function useSessionTrace(sessionId: string) {
  const agent = useEveAgent({
    agent: WEB_CHAT_AGENT,
    initialSession: { sessionId, streamIndex: 0 },
    resume: true,
    followAgents: true,
    followWhile: () => false,
  });
  const trace = useMemo(() => buildTrace(sessionId, agent.view, agent.agents), [sessionId, agent.view, agent.agents]);
  const timeline = useMemo(() => buildTimeline(agent.view, agent.messages, trace), [agent.view, agent.messages, trace]);
  const audit = useMemo(() => buildAudit(trace), [trace]);
  return { agent, trace, timeline, audit, loading: agent.status === "resuming" };
}
