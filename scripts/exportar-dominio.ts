// KPIs de negocio, riesgo y cumplimiento calculados con el mismo código del dominio que usan los agentes.
// Uso: node scripts/exportar-dominio.ts   (escribe apps/web/data/dominio.json)
import { mkdirSync, writeFileSync } from "node:fs";
import { armarExpediente } from "../lib/expediente.ts";
import { analizarCartera } from "../lib/monitor.ts";

const CASOS = ["FE-1001", "FE-2002", "FE-3003"];
const solicitudes = CASOS.map((numero) => {
  const e = armarExpediente(numero)!;
  return {
    factura: numero,
    pyme: e.pyme.rut.razonSocial,
    valorCOP: e.factura.valor,
    score: e.score.score,
    banda: e.score.banda,
    decision: e.politicas.decision,
    desembolsoNetoCOP: e.oferta?.hayOferta ? e.oferta.desembolsoNeto : null,
  };
});

const cartera = analizarCartera();
const snapshot = { generadoEn: new Date().toISOString(), solicitudes, cartera };
mkdirSync("apps/web/data", { recursive: true });
writeFileSync("apps/web/data/dominio.json", `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`apps/web/data/dominio.json: ${solicitudes.length} solicitudes, ${cartera.alertas.length} alertas`);
