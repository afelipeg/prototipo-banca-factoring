import { AgentChat } from "@/app/_components/agent-chat";

export default async function AsesorSessionPage({
  params,
}: {
  readonly params: Promise<{ readonly sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <AgentChat key={sessionId} sessionId={sessionId} />;
}
