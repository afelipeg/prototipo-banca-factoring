import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/auth";

export default async function Home() {
  const user = await getSession();
  redirect(user ? homeFor(user) : "/login");
}
