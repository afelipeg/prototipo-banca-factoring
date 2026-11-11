"use client";

import { ClientError, type MessagePart } from "eve/client";
import {
  activeTurn,
  activity,
  failure,
  interaction,
  interactions,
  turns,
  type Activity,
} from "eve/events";
import { useEveAgent } from "eve/react";
import { AlertCircleIcon, BrainIcon, PanelRightOpenIcon, PlusIcon, SquareIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
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
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import { Trace, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";
import { TracePanel } from "@/components/trace/trace-panel";
import { buildTrace } from "@/lib/trace";
import { writeLastSession } from "@/lib/session-store";
import { WEB_CHAT_AGENT } from "@/app/eve-agent";
import { AgentMessage } from "./agent-message";

const STARTERS = [
  {
    flujo: "Flujo 1",
    titulo: "Confecciones Andinas",
    prompt: "Tengo la factura FE-1001 por COP 48,5 millones (Confecciones Andinas, NIT 901.234.567-1)",
  },
  {
    flujo: "Flujo 2",
    titulo: "Metalmecánica del Valle",
    prompt: "Quiero descontar la factura FE-2002 por COP 385 millones (Metalmecánica del Valle, NIT 900.876.543-2)",
  },
  {
    flujo: "Flujo 3",
    titulo: "Distribuciones Caribe Express",
    prompt: "Necesito descontar la factura FE-3003 por COP 120 millones (Distribuciones Caribe Express, NIT 901.555.010-7)",
  },
] as const;

export function AgentChat({ sessionId }: { readonly sessionId?: string }) {
  const [cancellationError, setCancellationError] = useState<string>();
  const [hasInputText, setHasInputText] = useState(false);
  const [traceOpen, setTraceOpen] = useState(false);
  const hasSubmittedMessage = useRef(false);

  useEffect(() => {
    // Abierto por defecto en pantallas anchas; en pantallas angostas se abre a pedido.
    if (window.matchMedia("(min-width: 1024px)").matches) setTraceOpen(true);
  }, []);

  const replaceSessionRoute = (nextSessionId: string) => {
    if (sessionId !== undefined) return;
    // Framework routers (Next.js, TanStack Router) patch window.history; navigating
    // through them would remount this route and detach the active stream.
    History.prototype.replaceState.call(
      window.history,
      window.history.state,
      "",
      `/asesor/${encodeURIComponent(nextSessionId)}`,
    );
  };
  const agent = useEveAgent({
    agent: WEB_CHAT_AGENT,
    prewarm: hasInputText,
    // Las llamadas de los subagentes viven en sus sesiones hijas; el panel de trazabilidad las sigue.
    followAgents: true,
    initialSession:
      sessionId === undefined
        ? undefined
        : {
            sessionId,
            streamIndex: 0,
          },
    resume: sessionId !== undefined,
    onSessionChange(session) {
      if (session !== undefined) writeLastSession(session.sessionId);
      if (hasSubmittedMessage.current && session !== undefined) {
        replaceSessionRoute(session.sessionId);
      }
    },
  });

  const isBusy = agent.status === "busy";
  // A turn waiting on a person is open while the store is idle; it still takes steering and Stop.
  const turnOpen = activeTurn(agent.view) !== undefined;
  const isResuming = agent.status === "resuming";
  const isEmpty = agent.messages.length === 0;
  const lastMessage = agent.messages.at(-1);
  const isPendingAssistantShell =
    lastMessage?.role === "assistant" && lastMessage.parts.length === 0;
  const now = activity(agent.view);
  // Show what the agent is doing until its message has something to show, unless it waits on you.
  const showPendingThinking =
    isBusy &&
    now.kind !== "waiting-on-interaction" &&
    (lastMessage?.role !== "assistant" || isPendingAssistantShell);
  const failed =
    isBusy || isResuming ? undefined : failure(agent.view, turns(agent.view).at(-1)?.turnId);
  const turnFailure =
    failed?.code === "MODEL_CALL_FAILED"
      ? "El modelo no está disponible por el momento. Intente de nuevo."
      : failed?.message;
  const errorMessage = cancellationError ?? agent.error?.message ?? turnFailure;
  const showConversation = isResuming || !isEmpty || errorMessage !== undefined;
  const activeSessionId = sessionId ?? agent.session?.sessionId;
  // A session that ended outside eve never settles its requests, so they stay open, yet it
  // accepts no answer. Once the server says so, stop offering them.
  const sessionEnded =
    agent.error instanceof ClientError && agent.error.code === "session_not_active";
  // Answers are accepted while work runs; the server's settlement closes each request.
  const canRespond = (interactionId: string) =>
    !isResuming && !sessionEnded && interaction(agent.view, interactionId)?.status === "open";
  // A tool call can ask several questions at once, and its message part holds only the latest.
  const questionsFor = (callId: string) =>
    interactions(agent.view).filter(
      (input) => input.request.kind === "question" && input.call?.callId === callId,
    );

  const trace = useMemo(
    () => buildTrace(activeSessionId ?? "", agent.view, agent.agents),
    [activeSessionId, agent.view, agent.agents],
  );

  const requestCancellation = () => {
    setCancellationError(undefined);
    void agent.cancel().catch((error: unknown) => {
      setCancellationError(toErrorMessage(error));
    });
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();
    if ((text.length === 0 && message.files.length === 0) || isResuming) return;

    setHasInputText(false);
    setCancellationError(undefined);
    hasSubmittedMessage.current = true;
    if (agent.session !== undefined) replaceSessionRoute(agent.session.sessionId);
    const options = turnOpen ? { turnPolicy: "steer" as const } : undefined;

    if (message.files.length === 0) {
      await agent.send(text, options);
      return;
    }

    const parts: MessagePart[] = [];
    if (text.length > 0) {
      parts.push({ text, type: "text" });
    }
    for (const file of message.files) {
      parts.push({
        data: file.url,
        filename: file.filename,
        mediaType: file.mediaType,
        type: "file",
      });
    }

    await agent.send(parts, options);
  };

  const composer = (
    <PromptInput onSubmit={handleSubmit}>
      <PromptInputTextarea
        disabled={isResuming}
        onChange={(event) => setHasInputText(event.currentTarget.value.trim().length > 0)}
        placeholder="Escriba su mensaje…"
      />
      <ComposerAction
        hasInputText={hasInputText}
        canCancel={turnOpen}
        isResuming={isResuming}
        onCancel={requestCancellation}
      />
    </PromptInput>
  );

  return (
    <div className="relative flex min-h-0 flex-1 gap-3 px-3 pb-3">
      <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Conversación con el Asesor Pyme">
        <div className="flex h-9 shrink-0 items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Asesor Pyme</span>
            {isBusy ? <Badge variant="info-light">Trabajando</Badge> : null}
          </div>
          <div className="flex items-center gap-1.5">
            {activeSessionId !== undefined ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => window.location.assign("/asesor")}
              >
                <PlusIcon />
                Nueva conversación
              </Button>
            ) : null}
            {traceOpen ? null : (
              <Button type="button" variant="outline" size="sm" onClick={() => setTraceOpen(true)}>
                <PanelRightOpenIcon />
                Trazabilidad
              </Button>
            )}
          </div>
        </div>

        {showConversation ? (
          <Conversation
            className="min-h-0 flex-1"
            initial={sessionId === undefined ? undefined : false}
            resize={activeSessionId === undefined ? "smooth" : "instant"}
            scrollRestorationKey={
              isEmpty || activeSessionId === undefined
                ? undefined
                : `eve:web-chat-scroll:${activeSessionId}`
            }
          >
            <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-2 py-6 sm:px-4">
              {agent.messages.map((message) =>
                showPendingThinking &&
                isPendingAssistantShell &&
                message.id === lastMessage.id ? null : (
                  <AgentMessage
                    canRespond={canRespond}
                    key={message.id}
                    message={message}
                    questionsFor={questionsFor}
                    view={agent.view}
                    onAnswers={async (answers) => {
                      setCancellationError(undefined);
                      await agent.respond(answers).catch((cause: unknown) => {
                        setCancellationError(
                          cause instanceof Error ? cause.message : "No fue posible enviar la respuesta.",
                        );
                      });
                    }}
                  />
                ),
              )}
              {showPendingThinking ? <PendingActivity activity={now} /> : null}
              {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-y-auto py-6">
            <div className="flex flex-col items-center gap-1 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Asesor Pyme</h1>
              <p className="max-w-md text-sm text-muted-foreground">
                Cuénteme qué factura desea descontar y yo me encargo del resto. Elija un caso de ejemplo para comenzar.
              </p>
            </div>
            <div className="grid w-full max-w-3xl gap-2 sm:grid-cols-3">
              {STARTERS.map((starter) => (
                <Item key={starter.flujo} variant="outline" asChild>
                  <button type="button" className="items-start text-left" disabled={isResuming} onClick={() => void handleSubmit({ text: starter.prompt, files: [] })}>
                    <ItemContent>
                      <Badge variant="outline" className="w-fit">
                        {starter.flujo}
                      </Badge>
                      <ItemTitle>{starter.titulo}</ItemTitle>
                      <ItemDescription>{starter.prompt}</ItemDescription>
                    </ItemContent>
                  </button>
                </Item>
              ))}
            </div>
          </div>
        )}

        <div className="mx-auto w-full max-w-3xl shrink-0 px-2 pt-2 sm:px-4">{composer}</div>
      </section>

      {traceOpen ? (
        <aside
          aria-label="Trazabilidad en tiempo real"
          className="absolute inset-y-0 right-3 z-30 flex w-[calc(100%-1.5rem)] max-w-sm min-h-0 flex-col bg-background lg:static lg:z-auto lg:w-96 lg:max-w-none lg:shrink-0"
        >
          <TracePanel trace={trace} loading={isResuming} onClose={() => setTraceOpen(false)} />
        </aside>
      ) : null}
    </div>
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

  if (!canCancel || canSubmit) {
    return <PromptInputSubmit disabled={isResuming} />;
  }

  return (
    <PromptInputButton
      aria-label="Detener"
      className="absolute right-2.5 bottom-2.5"
      onClick={onCancel}
      variant="outline"
    >
      <SquareIcon className="size-3 fill-current" />
    </PromptInputButton>
  );
}

function ErrorMessage({ message }: { readonly message: string }) {
  return (
    <Message className="max-w-full" from="assistant">
      <MessageContent>
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertTitle>No se pudo completar la solicitud</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      </MessageContent>
    </Message>
  );
}

function PendingActivity({ activity }: { readonly activity: Activity }) {
  return (
    <Message aria-live="polite" from="assistant">
      <MessageContent>
        <Trace>
          <TraceLine status="running">
            <TraceIcon>
              <BrainIcon />
            </TraceIcon>
            <TraceTitle>{activityLabel(activity)}</TraceTitle>
          </TraceLine>
        </Trace>
      </MessageContent>
    </Message>
  );
}

function activityLabel(activity: Activity): string {
  switch (activity.kind) {
    case "calling":
      return activity.names.join(", ");
    case "waiting-on-tasks":
      return `Esperando ${activity.tasks.map((task) => task.name).join(", ")}`;
    case "compacting":
      return "Resumiendo la conversación";
    default:
      return "Pensando";
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "No fue posible cancelar la respuesta.";
}
