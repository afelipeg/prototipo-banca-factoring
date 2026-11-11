import { redirect } from "next/navigation";

// Ruta heredada del starter: la conversación vive ahora en /asesor.
export default function LegacyNewSession() {
  redirect("/asesor");
}
