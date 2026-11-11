import { eveChannel, type EveAuthFn } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";
import { demoSessionAuth } from "#lib/eve-auth.ts";

// Solo en desarrollo local: permite que `eve eval` simule herramientas (p. ej. Jev caído).
const devLocal = localDev();
const localConStubs: EveAuthFn = async (request) => {
  const caller = await devLocal(request);
  return caller ? { ...caller, allowToolStubs: true } : null;
};

export default eveChannel({
  auth: [
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localConStubs,
    // Usuarios que iniciaron sesión en la app web (cookie firmada).
    demoSessionAuth,
  ],
});
