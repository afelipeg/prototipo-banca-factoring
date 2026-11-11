"use client";

import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert, AlertDescription } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { Frame, FramePanel } from "@/components/reui/frame";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import type { DemoUserChip } from "@/lib/demo-users";
import { loginAction, type LoginState } from "./actions";

const INITIAL: LoginState = {};

export function LoginForm({ chips }: { readonly chips: readonly DemoUserChip[] }) {
  const [state, action, pending] = useActionState(loginAction, INITIAL);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Frame spacing="lg" className="w-full max-w-md">
      <FramePanel className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-xl font-semibold tracking-tight text-balance text-foreground">Ingrese a su cuenta</h1>
          <p className="text-sm text-pretty text-muted-foreground">Descuente sus facturas electrónicas con el banco.</p>
        </div>

        <form className="flex flex-col gap-4" action={action}>
          <FieldGroup className="gap-3.5">
            <Field className="gap-2">
              <FieldLabel htmlFor="login-email">Correo electrónico</FieldLabel>
              <InputGroup className="w-full">
                <InputGroupInput id="login-email" name="email" type="email" autoComplete="username" placeholder="usted@empresa.co" />
              </InputGroup>
            </Field>
            <Field className="gap-2">
              <FieldLabel htmlFor="login-password">Contraseña</FieldLabel>
              <InputGroup className="w-full">
                <InputGroupInput
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Ingrese su contraseña"
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    type="button"
                    size="icon-xs"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </Field>
          </FieldGroup>

          {state.error ? (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Spinner /> : null}
            Ingresar
          </Button>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">Usuarios de demostración</span>
            <Separator className="flex-1" />
          </div>

          <div className="flex flex-col gap-2">
            {chips.map((chip) => (
              <Button
                key={chip.email}
                type="submit"
                name="chip"
                value={chip.email}
                variant="outline"
                disabled={pending}
                className="h-auto justify-between gap-3 py-2 text-left"
                title={`${chip.name} · ${chip.email}`}
              >
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate font-medium">{chip.empresa}</span>
                  <span className="truncate text-xs font-normal text-muted-foreground">{chip.escenario}</span>
                </span>
                <Badge variant={chip.role === "banco" ? "info-light" : "primary-light"}>
                  {chip.role === "banco" ? "Banco" : "Empresario"}
                </Badge>
              </Button>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Contraseña de todos los usuarios de demostración: demo2026
          </p>
        </form>
      </FramePanel>
    </Frame>
  );
}
