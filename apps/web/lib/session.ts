import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "bp_session";
export const SESSION_ISSUER = "banco-pyme-demo";
export const SESSION_AUDIENCE = "pyme-factoring-agent";
const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type SessionRole = "pyme" | "banco";

export type SessionUser = {
  readonly email: string;
  readonly name: string;
  readonly role: SessionRole;
  readonly nit?: string;
};

function secretKey(): Uint8Array {
  const secret = process.env.DEMO_SESSION_SECRET;
  if (!secret) throw new Error("DEMO_SESSION_SECRET no está configurada.");
  return new TextEncoder().encode(secret);
}

/** JWT HS256 con las claims que verifica el agente en producción. */
export async function signSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    role: user.role,
    name: user.name,
    ...(user.nit ? { nit: user.nit } : {}),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setSubject(user.email)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** Verifica firma, emisor, audiencia y vencimiento. Devuelve null si algo falla. */
export async function verifySessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });
    const role = payload.role;
    if (typeof payload.sub !== "string" || (role !== "pyme" && role !== "banco")) return null;
    return {
      email: payload.sub,
      name: typeof payload.name === "string" ? payload.name : payload.sub,
      role,
      nit: typeof payload.nit === "string" ? payload.nit : undefined,
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: SESSION_TTL_SECONDS,
};
