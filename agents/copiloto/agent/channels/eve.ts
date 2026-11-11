import { eveChannel } from "eve/channels/eve";
import { localDev, vercelOidc } from "eve/channels/auth";
import { demoSessionAuth } from "#lib/eve-auth.ts";

export default eveChannel({
  auth: [
    // Lets the eve TUI and your Vercel deployments reach the deployed agent.
    vercelOidc(),
    // Open on localhost for `eve dev` and the REPL; ignored in production.
    localDev(),
    // Usuarios que iniciaron sesión en la app web (cookie firmada).
    demoSessionAuth,
  ],
});
