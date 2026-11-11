import { withEve } from "eve/vercel";

const config = await withEve({
  services: {
    web: {
      framework: "nextjs",
      root: "apps/web",
      buildCommand: "node ../../node_modules/next/dist/bin/next build",
    },
  },
  routes: [
    { src: "^(.*)$", destination: { type: "service", service: "web" } },
  ],
});

// Los endpoints de canales propios del agente no se publican solos (ver docs de eve,
// "Compose agents with other Vercel services"): /comite/* debe llegar al servicio `eve`.
// La Bandeja del comité (apps/web) lo invoca desde el servidor de Next, en el mismo origen.
const eveService = config.services?.eve as { routes?: unknown[] } | undefined;
eveService?.routes?.push({
  src: "^/comite/(.*)$",
  transforms: [{ args: "/comite/$1", op: "set", type: "request.path" }],
});
config.routes?.unshift({
  src: "^/comite/(.*)$",
  destination: { type: "service", service: "eve" },
});

export default config;
