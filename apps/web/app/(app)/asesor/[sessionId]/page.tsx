import { AgentChat } from "@/app/_components/agent-chat";
import { requireSession } from "@/lib/auth";

export default async function AsesorSessionPage({
  params,
}: {
  readonly params: Promise<{ readonly sessionId: string }>;
}) {
  const [user, { sessionId }] = await Promise.all([requireSession(), params]);
  return <AgentChat key={sessionId} sessionId={sessionId} userKey={user.email} />;
}
