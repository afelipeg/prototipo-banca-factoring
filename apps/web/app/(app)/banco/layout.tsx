import type { ReactNode } from "react";
import { CopilotoShell } from "@/components/copiloto/copiloto-shell";
import evals from "@/data/evals.json";

// Resumen de la última corrida de evals del Copiloto (instantánea versionada); enlaza a /banco/metricas.
const copiloto = evals.casos.filter((c) => c.agente === "copiloto");
const resumenEvals = { aprobados: copiloto.filter((c) => c.veredicto === "passed").length, total: copiloto.length };

export default function BancoLayout({ children }: { readonly children: ReactNode }) {
  return <CopilotoShell resumenEvals={resumenEvals}>{children}</CopilotoShell>;
}
