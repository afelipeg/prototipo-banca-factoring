import { verifyJwtHmac, withAuthChallenges, type AuthFn } from "eve/channels/auth";

const COOKIE = "bp_session";

/**
 * Sesión de demo: la app web firma una cookie `bp_session` (JWT HS256 con DEMO_SESSION_SECRET)
 * al iniciar sesión. El navegador llama a /eve/v1/* en el mismo origen y la cookie viaja sola.
 * PROTOTIPO: en producción esto sería el IdP del banco (OIDC) con MFA.
 */
export const demoSessionAuth: AuthFn<Request> = withAuthChallenges(
  async (request) => {
    const secret = process.env.DEMO_SESSION_SECRET;
    if (!secret) return null;
    const token = leerCookie(request.headers.get("cookie"), COOKIE);
    if (!token) return null;
    const result = await verifyJwtHmac(token, {
      algorithm: "HS256",
      issuer: "banco-pyme-demo",
      audiences: ["pyme-factoring-agent"],
      secret,
    });
    return result.ok ? result.sessionAuth : null;
  },
  [{ scheme: "Bearer" }],
);

function leerCookie(header: string | null, nombre: string): string | undefined {
  if (!header) return undefined;
  for (const parte of header.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nombre) return decodeURIComponent(v.join("="));
  }
  return undefined;
}
