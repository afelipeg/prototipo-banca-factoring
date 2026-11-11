export const LAST_SESSION_KEY = "banco-pyme:ultima-sesion";

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
