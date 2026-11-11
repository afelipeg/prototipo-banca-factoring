/**
 * Memoria de conversaciones del prototipo.
 * - El historial completo de cada conversación vive en eve (sesión durable en el servidor);
 *   aquí solo se guarda el índice para encontrarlas: id, título y fecha, por usuario.
 * - `LAST_SESSION_KEY` es la última sesión de cualquier usuario en este navegador: la usa la
 *   vista Banco (modo demo) para abrir el expediente del caso que se acaba de ejecutar.
 */
export const LAST_SESSION_KEY = "banco-pyme:ultima-sesion";
const CONVERSATIONS_KEY = "banco-pyme:conversaciones";
const CHANGE_EVENT = "banco-pyme:conversaciones-cambiaron";
const MAX_CONVERSATIONS = 20;

export type Conversation = {
  readonly sessionId: string;
  readonly user: string;
  readonly title: string;
  readonly updatedAt: string;
};

export function readLastSession(): string | undefined {
  try {
    return window.localStorage.getItem(LAST_SESSION_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeLastSession(sessionId: string): void {
  try {
    window.localStorage.setItem(LAST_SESSION_KEY, sessionId);
  } catch {
    // Sin almacenamiento disponible: el Banco pedirá pegar el id.
  }
}

function readAll(): Conversation[] {
  try {
    const raw = window.localStorage.getItem(CONVERSATIONS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Conversation[]) : [];
  } catch {
    return [];
  }
}

/** Conversaciones del usuario, la más reciente primero. */
export function listConversations(user: string): Conversation[] {
  return readAll()
    .filter((c) => c.user === user)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function latestConversation(user: string): Conversation | undefined {
  return listConversations(user)[0];
}

/** Registra o actualiza una conversación. El título se fija con el primer mensaje y no se pisa. */
export function saveConversation(user: string, sessionId: string, firstMessage?: string): void {
  try {
    const all = readAll();
    const existing = all.find((c) => c.sessionId === sessionId);
    const title = existing?.title ?? tituloDesde(firstMessage);
    const next: Conversation = { sessionId, user, title, updatedAt: new Date().toISOString() };
    const rest = all.filter((c) => c.sessionId !== sessionId);
    window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify([next, ...rest].slice(0, MAX_CONVERSATIONS)));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Sin almacenamiento: la conversación sigue en eve, solo no aparece en la lista.
  }
}

/** Avisa cuando cambia la lista (en esta pestaña o en otra). */
export function onConversationsChange(listener: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === CONVERSATIONS_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

function tituloDesde(texto?: string): string {
  const limpio = (texto ?? "").replace(/\s+/g, " ").trim();
  if (!limpio) return "Conversación con el asesor";
  return limpio.length > 60 ? `${limpio.slice(0, 57)}…` : limpio;
}
