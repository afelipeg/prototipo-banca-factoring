"use client";

import { ClientError } from "eve/client";
import { activeTurn, interaction, interactions, turn as turnOf } from "eve/events";
import { useEveAgent } from "eve/react";
import { AlertCircleIcon, PanelRightCloseIcon, PlusIcon, SparklesIcon, SquareIcon } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { COPILOTO_AGENT } from "@/app/eve-agent";
import { AgentMessage } from "@/app/_components/agent-message";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AgentActivityFeed } from "@/components/trace/agent-activity-feed";
import { buildTrace } from "@/lib/trace";
import { CARD_TOOLS, ToolResultCard } from "./tool-cards";

export const COPILOTO_SESSION_KEY = "banco-pyme:copiloto-sesion";

const CHIPS = ["Revisar caso FE-2002", "Revisar caso FE-3003", "Monitor de cartera", "Redactar acta FE-2002"] as const;

function readStored(): string | undefined {
  try {
    return window.localStorage.getItem(COPILOTO_SESSION_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeStored(sessionId: string | undefined): void {
  try {
    if (sessionId === undefined) window.localStorage.removeItem(COPILOTO_SESSION_KEY);
    else window.localStorage.setItem(COPILOTO_SESSION_KEY, sessionId);
  } catch {
    // Sin almacenamiento local: la sesión simplemente no se recuerda.
  }
}

type ResultCard = { readonly callId: string; readonly name: string; readonly output: unknown };

/**
 * Sesión del copiloto + panel. Siempre montado (así el stream sobrevive al cerrar el panel);
 * en pantallas angostas el cuerpo va en un Sheet. Se vuelve a montar con otra `key` para una
 * conversación nueva.
 */
export function CopilotoPanel({
  open,
  mobile,
  onOpenChange,
  onNewConversation,
}: {
  readonly open: boolean;
  readonly mobile: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onNewConversation: () => void;
}) {
  const [stored] = useState(readStored);
  const [hasInputText, setHasInputText] = useState(false);
  const [sendError, setSendError] = useState<string>();

  const agent = useEveAgent({
    agent: COPILOTO_AGENT,
    prewarm: hasInputText,
    followAgents: true,
    initialSession: stored === undefined ? undefined : { sessionId: stored, streamIndex: 0 },
    resume: stored !== undefined,
    onSessionChange(session) {
      if (session !== undefined) writeStored(session.sessionId);
    },
  });

  const isBusy = agent.status === "busy";
  const isResuming = agent.status === "resuming";
  const turnOpen = activeTurn(agent.view) !== undefined;
  const sessionId = agent.session?.sessionId ?? stored ?? "";
  const sessionEnded = agent.error instanceof ClientError && agent.error.code === "session_not_active";
  const canRespond = (interactionId: string) =>
    !isResuming && !sessionEnded && interaction(agent.view, interactionId)?.status === "open";
  const questionsFor = (callId: string) =>
    interactions(agent.view).filter((i) => i.request.kind === "question" && i.call?.callId === callId);

  const trace = useMemo(() => buildTrace(sessionId, agent.view, agent.agents, COPILOTO_AGENT), [sessionId, agent.view, agent.agents]);

  // Tarjetas de resultados: las de herramientas propias salen del mensaje; las de subagentes, de sus
  // sesiones hijas, asignadas al turno cuyo intervalo contiene el paso.
  const cardsByMessage = useMemo(() => {
    const map = new Map<string, ResultCard[]>();
    const assistants = agent.messages.filter((m) => m.role === "assistant");
    const childCards = trace.steps.filter((s) => s.actor !== COPILOTO_AGENT && CARD_TOOLS.has(s.name) && s.output !== undefined);
    for (const m of assistants) {
      const own: ResultCard[] = m.parts.flatMap((p) =>
        p.type === "tool" && CARD_TOOLS.has(p.name) && p.output !== undefined ? [{ callId: p.callId, name: p.name, output: p.output }] : [],
      );
      const t = m.metadata?.turnId ? turnOf(agent.view, m.metadata.turnId) : undefined;
      const inTurn: ResultCard[] = childCards
        .filter((s) => {
          if (!t?.startedAt || !s.startedAt) return false;
          return s.startedAt >= t.startedAt && (t.endedAt === undefined || s.startedAt <= t.endedAt);
        })
        .map((s) => ({ callId: s.callId, name: s.name, output: s.output }));
      map.set(m.id, [...own, ...inTurn]);
    }
    // Pasos de subagentes sin turno que los reclame: van con el último mensaje del asistente.
    const claimed = new Set([...map.values()].flat().map((c) => c.callId));
    const last = assistants.at(-1);
    if (last) {
      const rest = childCards.filter((s) => !claimed.has(s.callId)).map((s) => ({ callId: s.callId, name: s.name, output: s.output }));
      if (rest.length > 0) map.set(last.id, [...(map.get(last.id) ?? []), ...rest]);
    }
    return map;
  }, [agent.messages, agent.view, trace.steps]);

  const errorMessage = sendError ?? agent.error?.message;
  const isEmpty = agent.messages.length === 0;

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if (text.length === 0 || isResuming) return;
    setHasInputText(false);
    setSendError(undefined);
    await agent.send(text, turnOpen ? { turnPolicy: "steer" as const } : undefined).catch((e: unknown) => {
      setSendError(e instanceof Error ? e.message : "No fue posible enviar el mensaje.");
    });
  };

  const newConversation = () => {
    writeStored(undefined);
    onNewConversation();
  };

  const chat = (
    <div className="flex min-h-0 flex-1 flex-col">
      {isResuming ? (
        <div className="flex flex-1 flex-col gap-3 p-3" aria-busy="true">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : isEmpty && !errorMessage ? (
        <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-3">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SparklesIcon />
              </EmptyMedia>
              <EmptyTitle>Copiloto del analista</EmptyTitle>
              <EmptyDescription>Pídame revisar un caso, el monitor de cartera o redactar un acta. Elija un atajo para comenzar.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </div>
      ) : (
        <Conversation className="min-h-0 flex-1" initial={stored === undefined ? undefined : false}>
          <ConversationContent className="gap-5 px-3 py-4">
            {agent.messages.map((message) => {
              const cards = cardsByMessage.get(message.id) ?? [];
              return (
                <div key={message.id} className="flex flex-col gap-3">
                  <AgentMessage
                    canRespond={canRespond}
                    message={message}
                    questionsFor={questionsFor}
                    view={agent.view}
                    onAnswers={async (answers) => {
                      setSendError(undefined);
                      await agent.respond(answers).catch((e: unknown) => {
                        setSendError(e instanceof Error ? e.message : "No fue posible enviar la respuesta.");
                      });
                    }}
                  />
                  {cards.map((c) => (
                    <ToolResultCard key={c.callId} name={c.name} output={c.output} />
                  ))}
                </div>
              );
            })}
            {errorMessage ? <ErrorAlert message={errorMessage} /> : null}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}
      <div className="flex shrink-0 flex-col gap-2 p-3 pt-2">
        <div className="flex flex-wrap gap-1.5">
          {CHIPS.map((chip) => (
            <Button key={chip} type="button" variant="outline" size="xs" disabled={isResuming} onClick={() => void handleSubmit({ text: chip, files: [] })}>
              {chip}
            </Button>
          ))}
        </div>
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea
            disabled={isResuming}
            onChange={(e) => setHasInputText(e.currentTarget.value.trim().length > 0)}
            placeholder="Escriba su consulta…"
          />
          <ComposerAction hasInputText={hasInputText} canCancel={turnOpen} isResuming={isResuming} onCancel={() => void agent.cancel().catch(() => undefined)} />
        </PromptInput>
      </div>
    </div>
  );

  const header = (
    <div className="flex shrink-0 items-center justify-between gap-2 px-3 pt-3">
      <div className="flex items-center gap-2">
        <SparklesIcon className="size-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold">Copiloto</span>
        {isBusy ? <Badge variant="info-light">Trabajando</Badge> : null}
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" variant="outline" size="sm" onClick={newConversation}>
          <PlusIcon />
          Nueva conversación
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onOpenChange(false)} aria-label="Ocultar el copiloto">
          <PanelRightCloseIcon />
        </Button>
      </div>
    </div>
  );

  const body = (
    <Tabs defaultValue="chat" className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="px-3">
        <TabsList>
          <TabsTrigger value="chat">Conversación</TabsTrigger>
          <TabsTrigger value="actividad">
            Actividad
            {trace.steps.length > 0 ? <Badge variant="outline">{trace.steps.length}</Badge> : null}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent value="chat" className="flex min-h-0 flex-1 flex-col">
        {chat}
      </TabsContent>
      <TabsContent value="actividad" className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {trace.steps.length === 0 && !isBusy ? (
          <p className="text-sm text-muted-foreground">Cuando el copiloto consulte una herramienta o llame a otro agente, lo verá aquí.</p>
        ) : (
          <AgentActivityFeed trace={trace} />
        )}
      </TabsContent>
    </Tabs>
  );

  if (mobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="sr-only">
            <SheetTitle>Copiloto del analista</SheetTitle>
            <SheetDescription>Conversación y actividad del copiloto</SheetDescription>
          </SheetHeader>
          {header}
          {body}
        </SheetContent>
      </Sheet>
    );
  }
  if (!open) return null;
  return (
    <aside aria-label="Copiloto del analista" className="flex min-h-0 w-[26rem] shrink-0 flex-col border-l bg-background xl:w-[30rem]">
      {header}
      {body}
    </aside>
  );
}

function ErrorAlert({ message }: { readonly message: string }): ReactNode {
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>No se pudo completar la solicitud</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function ComposerAction({
  hasInputText,
  canCancel,
  isResuming,
  onCancel,
}: {
  readonly hasInputText: boolean;
  readonly canCancel: boolean;
  readonly isResuming: boolean;
  readonly onCancel: () => void;
}) {
  const attachments = usePromptInputAttachments();
  const canSubmit = hasInputText || attachments.files.length > 0;
  if (!canCancel || canSubmit) return <PromptInputSubmit disabled={isResuming} />;
  return (
    <PromptInputButton aria-label="Detener" className="absolute right-2.5 bottom-2.5" onClick={onCancel} variant="outline">
      <SquareIcon className="size-3 fill-current" />
    </PromptInputButton>
  );
}
