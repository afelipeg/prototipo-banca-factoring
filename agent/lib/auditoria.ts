// Registro de auditoria EN MEMORIA: suficiente para el prototipo; se pierde al reiniciar el proceso.

export type EventoAuditoria = {
  id: string;
  timestamp: string;
  caseId?: string;
  agente: string;
  accion: string;
  fuentes: string[];
  resultado: string;
};

const eventos: EventoAuditoria[] = [];

export function registrarAuditoria(evento: Omit<EventoAuditoria, "id" | "timestamp">): EventoAuditoria {
  const completo: EventoAuditoria = {
    id: `AUD-${String(eventos.length + 1).padStart(5, "0")}`,
    timestamp: new Date().toISOString(),
    ...evento,
  };
  eventos.push(completo);
  return completo;
}

export function listarAuditoria(caseId?: string): EventoAuditoria[] {
  return caseId ? eventos.filter((e) => e.caseId === caseId) : [...eventos];
}
