import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import appCss from "../styles.css?url";
import { AppNav } from "@/components/shell";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { hydrateStore } from "@/lib/store";
import { createAdmin, initSession, unlock, useSession, verifyPassword } from "@/lib/auth";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Bulletins CEG — Gestion des notes et bulletins" },
      {
        name: "description",
        content:
          "Application locale de gestion des années scolaires, classes, élèves, notes, moyennes, rangs et bulletins pour les CEG.",
      },
      { name: "author", content: "Responsable des examens" },
      { property: "og:title", content: "Bulletins CEG — Gestion des notes et bulletins" },
      {
        property: "og:description",
        content: "Saisie des notes, calcul des moyennes et rangs, génération des bulletins.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Karla:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const session = useSession();

  useEffect(() => {
    hydrateStore();
    initSession();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {session === "unlocked" ? (
        <>
          <AppNav />
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </>
      ) : (
        <AuthGate session={session} />
      )}
      <Toaster />
    </QueryClientProvider>
  );
}

function AuthGate({ session }: { session: "setup" | "locked" }) {
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");

  const setup = async () => {
    if (pwd.length < 4) return toast.error("Au moins 4 caractères");
    if (pwd !== pwd2) return toast.error("Les deux mots de passe ne correspondent pas");
    try {
      await createAdmin(pwd);
      unlock();
      toast.success("Compte administrateur créé");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const login = async () => {
    const ok = await verifyPassword(pwd);
    if (ok) {
      unlock();
      setPwd("");
    } else {
      toast.error("Mot de passe incorrect");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
            {session === "setup" ? (
              <ShieldCheck className="size-7 text-primary" />
            ) : (
              <Lock className="size-7 text-primary" />
            )}
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold">
            {session === "setup" ? "Premier démarrage" : "Application verrouillée"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {session === "setup"
              ? "Créez un mot de passe administrateur pour protéger l'application."
              : "Saisissez le mot de passe pour reprendre."}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label htmlFor="auth-pwd">
              {session === "setup" ? "Nouveau mot de passe" : "Mot de passe"}
            </Label>
            <Input
              id="auth-pwd"
              type="password"
              value={pwd}
              autoFocus
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (session === "setup") {
                    if (pwd2) setup();
                  } else {
                    login();
                  }
                }
              }}
            />
          </div>
          {session === "setup" && (
            <div>
              <Label htmlFor="auth-pwd2">Confirmer le mot de passe</Label>
              <Input
                id="auth-pwd2"
                type="password"
                value={pwd2}
                onChange={(e) => setPwd2(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && setup()}
              />
            </div>
          )}
          <Button className="w-full" onClick={session === "setup" ? setup : login}>
            {session === "setup" ? "Créer le compte" : "Déverrouiller"}
          </Button>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Les données restent sur cet ordinateur. Aucune connexion internet requise.
        </p>
      </div>
    </div>
  );
}
