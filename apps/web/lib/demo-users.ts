import { FACTURAS, NIT_PYME_1, NIT_PYME_2, NIT_PYME_3, PYMES, USUARIOS } from "../../../lib/data/pymes";
import type { SessionUser } from "./session";

/** Usuarios de demostración (datos sintéticos del agente, solo lectura). */
export type DemoUser = SessionUser & { readonly password: string; readonly empresa?: string };

export const DEMO_USERS: readonly DemoUser[] = USUARIOS.map((u) => ({
  email: u.email,
  password: u.password,
  name: u.nombre,
  role: u.rol === "analista" ? ("banco" as const) : ("pyme" as const),
  nit: u.nitPyme,
  empresa: u.nitPyme ? PYMES.find((p) => p.nit === u.nitPyme)?.rut.razonSocial : "Banco Pyme Directo",
}));

/** Guía de demo: qué recorrido muestra cada usuario (la factura sale de los datos sintéticos). */
const RECORRIDO: Record<string, string> = {
  [NIT_PYME_1]: "aprobación automática",
  [NIT_PYME_2]: "pasa al comité humano",
  [NIT_PYME_3]: "fraude bloqueado",
};

function escenario(u: DemoUser): string {
  if (u.role === "banco") return "Bandeja del comité, Copiloto y métricas";
  const factura = FACTURAS.find((f) => f.nit === u.nit)?.numero;
  return [factura, u.nit ? RECORRIDO[u.nit] : undefined].filter(Boolean).join(" · ");
}

/** Lo que la pantalla de acceso puede ver: sin contraseñas. */
export type DemoUserChip = {
  readonly email: string;
  readonly name: string;
  readonly empresa: string;
  readonly escenario: string;
  readonly role: SessionUser["role"];
};

export const DEMO_USER_CHIPS: readonly DemoUserChip[] = DEMO_USERS.map((u) => ({
  email: u.email,
  name: u.name,
  empresa: u.empresa ?? "",
  escenario: escenario(u),
  role: u.role,
}));

export function authenticate(email: string, password: string): SessionUser | null {
  const found = DEMO_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!found || found.password !== password) return null;
  return { email: found.email, name: found.name, role: found.role, nit: found.nit };
}
