import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, type SessionUser, verifySessionToken } from "./session";

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function requireSession(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export function homeFor(user: SessionUser): string {
  return user.role === "banco" ? "/banco/comite" : "/asesor";
}
