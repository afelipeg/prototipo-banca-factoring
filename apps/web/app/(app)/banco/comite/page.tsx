import { ComiteInbox } from "@/components/banco/comite-inbox";
import { requireSession } from "@/lib/auth";

export default async function ComitePage() {
  const user = await requireSession();
  // El nombre del analista sale de la cookie firmada; el navegador no lo elige.
  return <ComiteInbox analista={user.name} />;
}
