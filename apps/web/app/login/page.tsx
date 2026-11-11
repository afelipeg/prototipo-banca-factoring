import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/app/brand-logo";
import { DEMO_USER_CHIPS } from "@/lib/demo-users";
import { getSession, homeFor } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const user = await getSession();
  if (user) redirect(homeFor(user));

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-background">
      <header className="flex w-full items-center justify-between px-6 py-5 sm:px-10">
        <BrandLogo />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-12 sm:px-10">
        <div className="flex w-full max-w-md flex-col items-center gap-6">
          <LoginForm chips={DEMO_USER_CHIPS} />
          <p className="max-w-sm text-center text-xs font-medium text-balance text-muted-foreground">
            Prototipo con datos sintéticos
          </p>
        </div>
      </main>
    </div>
  );
}
