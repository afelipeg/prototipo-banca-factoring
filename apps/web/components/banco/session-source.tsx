"use client";

import { RefreshCwIcon } from "lucide-react";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { Frame, FrameDescription, FrameHeader, FramePanel, FrameTitle } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { readLastSession, writeLastSession } from "@/lib/session-store";

/**
 * Elige la sesión a revisar: la última del Asesor (localStorage `banco-pyme:ultima-sesion`)
 * o un id pegado por el analista. Entrega el id y un `reload` que vuelve a leer la sesión.
 */
export function SessionSource({
  render,
}: {
  readonly render: (sessionId: string, reloadKey: number) => ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const [sessionId, setSessionId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const last = readLastSession();
    setSessionId(last);
    setDraft(last ?? "");
    setReady(true);
  }, []);

  const open = (event: FormEvent) => {
    event.preventDefault();
    const id = draft.trim();
    if (!id) return;
    writeLastSession(id);
    setSessionId(id);
    setReloadKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-4">
      <Frame>
        <FrameHeader>
          <FrameTitle>Sesión a revisar</FrameTitle>
          <FrameDescription>La última del Asesor, o pegue un id de sesión</FrameDescription>
        </FrameHeader>
        <FramePanel>
          <form className="flex flex-wrap items-center gap-2" onSubmit={open}>
            <InputGroup className="min-w-0 flex-1 basis-64">
              <InputGroupAddon>
                <span className="text-xs text-muted-foreground">Id</span>
              </InputGroupAddon>
              <InputGroupInput
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="wrun_…"
                aria-label="Id de la sesión"
                spellCheck={false}
              />
            </InputGroup>
            <Button type="submit" size="sm" disabled={draft.trim().length === 0}>
              Abrir
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={!sessionId} onClick={() => setReloadKey((k) => k + 1)}>
              <RefreshCwIcon />
              Actualizar
            </Button>
          </form>
        </FramePanel>
      </Frame>

      {!ready ? (
        <Frame>
          <FramePanel className="flex flex-col gap-3" aria-busy="true">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </FramePanel>
        </Frame>
      ) : sessionId ? (
        render(sessionId, reloadKey)
      ) : (
        <Frame>
          <FramePanel>
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No hay una sesión para revisar</EmptyTitle>
                <EmptyDescription>
                  Inicie una conversación en la vista Empresario, o pegue arriba el id de una sesión.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          </FramePanel>
        </Frame>
      )}
    </div>
  );
}
