"use client";

import {
  BotMessageSquareIcon,
  FileSearchIcon,
  InboxIcon,
  LogOutIcon,
  MonitorIcon,
  MoonIcon,
  MoreHorizontalIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  SunIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { logoutAction } from "@/app/login/actions";
import { BRAND_NAME, BrandMark } from "@/components/app/brand-logo";
import { Badge } from "@/components/reui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { SessionUser } from "@/lib/session";
import { type Conversation, listConversations, onConversationsChange } from "@/lib/session-store";
import { cn } from "@/lib/utils";

type View = "empresario" | "banco";

const NAV: Record<View, readonly { href: string; label: string; icon: ReactNode }[]> = {
  empresario: [
    { href: "/asesor", label: "Asesor", icon: <BotMessageSquareIcon /> },
    { href: "/operaciones", label: "Mis operaciones", icon: <ReceiptTextIcon /> },
  ],
  banco: [
    { href: "/banco/comite", label: "Bandeja del comité", icon: <InboxIcon /> },
    { href: "/banco/expediente", label: "Expediente y trazas", icon: <FileSearchIcon /> },
    { href: "/banco/auditoria", label: "Auditoría", icon: <ShieldCheckIcon /> },
  ],
};

const VIEW_HOME: Record<View, string> = { empresario: "/asesor", banco: "/banco/comite" };
const VIEW_LABEL: Record<View, string> = { empresario: "Empresario", banco: "Banco" };

function viewOf(pathname: string): View {
  return pathname.startsWith("/banco") ? "banco" : "empresario";
}

const THEMES = [
  { value: "light", label: "Claro", icon: <SunIcon aria-hidden="true" /> },
  { value: "dark", label: "Oscuro", icon: <MoonIcon aria-hidden="true" /> },
  { value: "system", label: "Sistema", icon: <MonitorIcon aria-hidden="true" /> },
] as const;

function ThemeItem() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = mounted ? (theme ?? "system") : "system";
  const index = Math.max(
    0,
    THEMES.findIndex((t) => t.value === current),
  );
  const next = THEMES[(index + 1) % THEMES.length];
  return (
    <DropdownMenuItem onSelect={(event) => event.preventDefault()} onClick={() => setTheme(next.value)}>
      {THEMES[index].icon}
      Tema: {THEMES[index].label}
      <span className="sr-only">. Cambiar a {next.label}</span>
    </DropdownMenuItem>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

function UserMenu({ user }: { readonly user: SessionUser }) {
  const { isMobile } = useSidebar();
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton aria-label="Abrir menú de usuario">
              <Avatar size="sm">
                <AvatarFallback>{initials(user.name)}</AvatarFallback>
              </Avatar>
              <span className="flex min-w-0 flex-col text-left in-data-[state=collapsed]:hidden">
                <span className="truncate text-sm font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </span>
              <MoreHorizontalIcon className="ml-auto opacity-50 in-data-[state=collapsed]:hidden" aria-hidden="true" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" sideOffset={8} className="w-60">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="flex flex-col gap-0.5 font-normal">
                <span className="text-sm font-medium text-foreground">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <ThemeItem />
            <DropdownMenuSeparator />
            <form action={logoutAction}>
              <DropdownMenuItem asChild>
                <button type="submit" className="w-full">
                  <LogOutIcon aria-hidden="true" />
                  Cerrar sesión
                </button>
              </DropdownMenuItem>
            </form>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function ViewToggle({ view }: { readonly view: View }) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className="hidden sm:inline-flex">
        modo demo
      </Badge>
      <ButtonGroup aria-label="Vista activa">
        {(Object.keys(VIEW_LABEL) as View[]).map((v) => (
          <Button key={v} asChild size="sm" variant={view === v ? "default" : "outline"} aria-pressed={view === v}>
            <Link href={VIEW_HOME[v]}>{VIEW_LABEL[v]}</Link>
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );
}

export function AppShell({ user, children }: { readonly user: SessionUser; readonly children: ReactNode }) {
  const pathname = usePathname();
  const view = viewOf(pathname);
  const items = NAV[view];
  const active = items.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));

  return (
    <TooltipProvider delayDuration={0}>
      <SidebarProvider
        className={cn(
          "h-dvh [--sidebar-width:260px] [--sidebar-border:transparent]",
          "[&_[data-slot=sidebar-menu-button][data-active=true]]:border [&_[data-slot=sidebar-menu-button][data-active=true]]:border-border/60",
          "[&_[data-slot=sidebar-menu-button][data-active=true]]:bg-background [&_[data-slot=sidebar-menu-button][data-active=true]]:text-foreground",
          "[&_[data-slot=sidebar-menu-button]>svg]:opacity-60 [&_[data-slot=sidebar-menu-button][data-active=true]>svg]:text-primary [&_[data-slot=sidebar-menu-button][data-active=true]>svg]:opacity-100",
        )}
      >
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader className="flex flex-row items-center justify-between in-data-[state=collapsed]:flex-col in-data-[state=collapsed]:items-start">
            <div className="inline-flex min-h-10 items-center gap-2 px-0.5">
              <BrandMark />
              <span className="text-sm font-medium in-data-[state=collapsed]:hidden">{BRAND_NAME}</span>
            </div>
            <SidebarTrigger className="opacity-60 hover:opacity-100" aria-label="Alternar barra lateral" />
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="in-data-[state=collapsed]:hidden">{VIEW_LABEL[view]}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={active?.href === item.href} tooltip={item.label}>
                        <Link href={item.href} aria-current={active?.href === item.href ? "page" : undefined}>
                          {item.icon}
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {view === "empresario" ? <ConversationsGroup userKey={user.email} pathname={pathname} /> : null}
          </SidebarContent>
          <SidebarFooter>
            <UserMenu user={user} />
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
          <header className="flex h-12 shrink-0 items-center justify-between gap-2 px-4">
            <div className="flex min-w-0 items-center gap-2">
              <SidebarTrigger className="-ml-1 md:hidden" aria-label="Abrir barra lateral" />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:flex">{VIEW_LABEL[view]}</BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:flex" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{active?.label ?? "Inicio"}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <ViewToggle view={view} />
          </header>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

/** Memoria de conversaciones: cada sesión con el asesor queda en la lista para retomarla. */
function ConversationsGroup({ userKey, pathname }: { readonly userKey: string; readonly pathname: string }) {
  const [items, setItems] = useState<Conversation[]>([]);

  useEffect(() => {
    const refresh = () => setItems(listConversations(userKey));
    refresh();
    return onConversationsChange(refresh);
  }, [userKey]);

  if (items.length === 0) return null;

  return (
    <SidebarGroup className="in-data-[state=collapsed]:hidden">
      <SidebarGroupLabel>Conversaciones</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((c) => {
            const href = `/asesor/${encodeURIComponent(c.sessionId)}`;
            const isActive = pathname === href;
            return (
              <SidebarMenuItem key={c.sessionId}>
                <SidebarMenuButton asChild size="sm" isActive={isActive} tooltip={c.title}>
                  <Link href={href} aria-current={isActive ? "page" : undefined}>
                    <span className="truncate">{c.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
