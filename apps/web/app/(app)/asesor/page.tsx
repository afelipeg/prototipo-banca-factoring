import { requireSession } from "@/lib/auth";
import { AsesorEntry } from "./asesor-entry";

export default async function AsesorPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ readonly nueva?: string }>;
}) {
  const [user, params] = await Promise.all([requireSession(), searchParams]);
  return <AsesorEntry userKey={user.email} nueva={params.nueva === "1"} />;
}
