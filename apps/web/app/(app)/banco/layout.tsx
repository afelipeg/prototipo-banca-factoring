import type { ReactNode } from "react";
import { CopilotoShell } from "@/components/copiloto/copiloto-shell";

export default function BancoLayout({ children }: { readonly children: ReactNode }) {
  return <CopilotoShell>{children}</CopilotoShell>;
}
