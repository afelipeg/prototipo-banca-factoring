import { defineEvalConfig } from "eve/evals";

// Juez: Jev (typesafe-ai/jev) vía AI Gateway. Los evals corren contra el modelo real.
export default defineEvalConfig({
  judge: { model: "typesafe-ai/jev" },
  maxConcurrency: 2,
  timeoutMs: 480_000,
});
