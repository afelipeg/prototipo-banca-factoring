"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticate, DEMO_USERS } from "@/lib/demo-users";
import { SESSION_COOKIE, sessionCookieOptions, signSessionToken } from "@/lib/session";

export type LoginState = { readonly error?: string };

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const chip = formData.get("chip");
  let user;
  if (typeof chip === "string" && chip.length > 0) {
    // Acceso rápido del presentador: solo para los usuarios de demostración.
    const demo = DEMO_USERS.find((u) => u.email === chip);
    user = demo ? authenticate(demo.email, demo.password) : null;
  } else {
    user = authenticate(String(formData.get("email") ?? ""), String(formData.get("password") ?? ""));
  }
  if (!user) return { error: "Correo o contraseña incorrectos." };

  const store = await cookies();
  store.set(SESSION_COOKIE, await signSessionToken(user), sessionCookieOptions);
  redirect(user.role === "banco" ? "/banco/comite" : "/asesor");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
