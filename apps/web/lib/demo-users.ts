import { PYMES, USUARIOS } from "../../../agent/lib/data/pymes";
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

/** Lo que la pantalla de acceso puede ver: sin contraseñas. */
export type DemoUserChip = { readonly email: string; readonly name: string; readonly empresa: string; readonly role: SessionUser["role"] };

export const DEMO_USER_CHIPS: readonly DemoUserChip[] = DEMO_USERS.map((u) => ({
  email: u.email,
  name: u.name,
  empresa: u.empresa ?? "",
  role: u.role,
}));

export function authenticate(email: string, password: string): SessionUser | null {
  const found = DEMO_USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!found || found.password !== password) return null;
  return { email: found.email, name: found.name, role: found.role, nit: found.nit };
}
