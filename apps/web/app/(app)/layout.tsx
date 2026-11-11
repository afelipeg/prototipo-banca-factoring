import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";
import { requireSession } from "@/lib/auth";

export default async function AppLayout({ children }: { readonly children: ReactNode }) {
  const user = await requireSession();
  return <AppShell user={user}>{children}</AppShell>;
}
