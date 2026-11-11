"use client";

import { SparklesIcon } from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { CopilotoPanel } from "./copiloto-panel";

/** Páginas del Banco con el copiloto a la derecha: plegable en escritorio, Sheet en móvil. */
export type ResumenEvals = { readonly aprobados: number; readonly total: number };

export function CopilotoShell({ children, resumenEvals }: { readonly children: ReactNode; readonly resumenEvals: ResumenEvals }) {
  const mobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    // Abierto por defecto en pantallas anchas; en móvil se abre a pedido.
    if (window.matchMedia("(min-width: 1024px)").matches) setOpen(true);
  }, []);

  return (
    <div className="flex min-h-0 flex-1">
      <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">{children}</div>
      <CopilotoPanel key={nonce} resumenEvals={resumenEvals} open={open} mobile={mobile} onOpenChange={setOpen} onNewConversation={() => setNonce((n) => n + 1)} />
      {open ? null : (
        <Button type="button" size="sm" className="fixed right-4 bottom-4 z-30 shadow-md" onClick={() => setOpen(true)}>
          <SparklesIcon />
          Copiloto
        </Button>
      )}
    </div>
  );
}
