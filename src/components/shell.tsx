import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  activeYear,
  trimestersOfYear,
  update,
  useDB,
} from "@/lib/store";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const nav = [
  { to: "/", label: "Tableau de bord" },
  { to: "/annees", label: "Années & trimestres" },
  { to: "/classes", label: "Classes" },
  { to: "/matieres", label: "Matières" },
  { to: "/eleves", label: "Élèves" },
  { to: "/notes", label: "Saisie des notes" },
  { to: "/bulletins", label: "Bulletins" },
] as const;

export function AppNav() {
  return (
    <nav className="no-print border-b border-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-md bg-sidebar-primary font-display text-lg font-bold text-sidebar-primary-foreground">
            B
          </span>
          <span className="leading-tight">
            <span className="block font-display text-base font-semibold">Bulletins CEG</span>
            <span className="block text-xs text-sidebar-foreground/70">Gestion des examens</span>
          </span>
        </Link>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeOptions={{ exact: item.to === "/" }}
              className="rounded-md px-3 py-1.5 text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className:
                  "bg-sidebar-accent text-sidebar-accent-foreground font-semibold hover:bg-sidebar-accent",
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export function PageHeader({
  titre,
  description,
  children,
}: {
  titre: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="no-print mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">{titre}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </header>
  );
}

export function Page({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>;
}

/** Barre de contexte : année / trimestre / classe, persistée dans la base locale. */
export function ContextBar({ withClasse = true }: { withClasse?: boolean }) {
  const db = useDB();
  const year = activeYear(db);
  const trimestres = trimestersOfYear(db, year?.id);

  const set = (patch: Partial<typeof db.selection>) =>
    update((d) => ({ ...d, selection: { ...d.selection, ...patch } }));

  return (
    <div className="no-print mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-secondary/60 p-4">
      <Field label="Année scolaire">
        <Select
          value={db.selection.yearId ?? ""}
          onValueChange={(v) => {
            const first = db.trimesters.find((t) => t.yearId === v);
            set({ yearId: v, trimesterId: first?.id ?? null });
          }}
        >
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {db.years.map((y) => (
              <SelectItem key={y.id} value={y.id}>
                {y.nom}
                {y.actif ? " (actif)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Trimestre">
        <Select
          value={db.selection.trimesterId ?? ""}
          onValueChange={(v) => set({ trimesterId: v })}
        >
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {trimestres.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {withClasse ? (
        <Field label="Classe">
          <Select
            value={db.selection.classeId ?? ""}
            onValueChange={(v) => set({ classeId: v })}
          >
            <SelectTrigger className="w-44 bg-card">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {db.classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      ) : null}
    </div>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5 text-sm", className)}>
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-dashed border-border bg-muted/40 px-6 py-10 text-center text-sm text-muted-foreground">
      {message}
    </p>
  );
}
