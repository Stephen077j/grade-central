import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, Field, Page, PageHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trimestersOfYear, uid, update, useDB } from "@/lib/store";

export const Route = createFileRoute("/annees")({
  head: () => ({
    meta: [
      { title: "Années scolaires et trimestres — Bulletins CEG" },
      {
        name: "description",
        content:
          "Créer, activer et archiver les années scolaires, et définir les trimestres rattachés à chaque année.",
      },
      { property: "og:title", content: "Années scolaires et trimestres — Bulletins CEG" },
      {
        property: "og:description",
        content: "Gestion des années scolaires et de leurs trimestres.",
      },
    ],
  }),
  component: AnneesPage,
});

function AnneesPage() {
  const db = useDB();
  const [nom, setNom] = useState("");

  const ajouter = () => {
    const label = nom.trim();
    if (!label) return;
    const yearId = uid();
    update((d) => ({
      ...d,
      years: [...d.years, { id: yearId, nom: label, actif: false }],
      trimesters: [
        ...d.trimesters,
        { id: uid(), nom: "Trimestre 1", yearId },
        { id: uid(), nom: "Trimestre 2", yearId },
        { id: uid(), nom: "Trimestre 3", yearId },
      ],
    }));
    setNom("");
    toast.success(`Année ${label} créée avec ses 3 trimestres`);
  };

  const activer = (id: string) => {
    update((d) => ({
      ...d,
      years: d.years.map((y) => ({ ...y, actif: y.id === id })),
      selection: {
        ...d.selection,
        yearId: id,
        trimesterId: d.trimesters.find((t) => t.yearId === id)?.id ?? null,
      },
    }));
  };

  const supprimer = (id: string) => {
    const trimIds = db.trimesters.filter((t) => t.yearId === id).map((t) => t.id);
    update((d) => ({
      ...d,
      years: d.years.filter((y) => y.id !== id),
      trimesters: d.trimesters.filter((t) => t.yearId !== id),
      students: d.students.filter((s) => s.yearId !== id),
      grades: d.grades.filter((g) => !trimIds.includes(g.trimesterId)),
      selection:
        d.selection.yearId === id
          ? { ...d.selection, yearId: null, trimesterId: null }
          : d.selection,
    }));
    toast.success("Année supprimée");
  };

  const ajouterTrimestre = (yearId: string) => {
    const n = trimestersOfYear(db, yearId).length + 1;
    update((d) => ({
      ...d,
      trimesters: [...d.trimesters, { id: uid(), nom: `Trimestre ${n}`, yearId }],
    }));
  };

  return (
    <Page>
      <PageHeader
        titre="Années scolaires & trimestres"
        description="Chaque année contient ses trimestres. Les notes sont rattachées à un trimestre précis."
      />

      <div className="panel mb-8 flex flex-wrap items-end gap-3 p-5">
        <Field label="Nouvelle année" className="min-w-56 flex-1">
          <Input
            value={nom}
            placeholder="2026-2027"
            onChange={(e) => setNom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ajouter()}
          />
        </Field>
        <Button onClick={ajouter}>Créer l'année</Button>
      </div>

      {db.years.length === 0 ? (
        <EmptyState message="Aucune année scolaire. Créez la première ci-dessus." />
      ) : (
        <div className="space-y-4">
          {db.years.map((y) => {
            const trimestres = trimestersOfYear(db, y.id);
            const effectif = db.students.filter((s) => s.yearId === y.id).length;
            return (
              <section key={y.id} className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-semibold">
                      {y.nom}{" "}
                      <span
                        className={
                          y.actif
                            ? "ml-2 rounded-full bg-primary px-2.5 py-0.5 align-middle text-xs font-semibold text-primary-foreground"
                            : "ml-2 rounded-full bg-muted px-2.5 py-0.5 align-middle text-xs font-semibold text-muted-foreground"
                        }
                      >
                        {y.actif ? "Active" : "Archivée"}
                      </span>
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {effectif} élève(s) · {trimestres.length} trimestre(s)
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!y.actif && (
                      <Button variant="secondary" size="sm" onClick={() => activer(y.id)}>
                        Activer
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => ajouterTrimestre(y.id)}
                    >
                      + Trimestre
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => supprimer(y.id)}
                    >
                      Supprimer
                    </Button>
                  </div>
                </div>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {trimestres.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-1.5 text-sm"
                    >
                      <Input
                        value={t.nom}
                        className="h-7 w-36 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                        onChange={(e) =>
                          update((d) => ({
                            ...d,
                            trimesters: d.trimesters.map((x) =>
                              x.id === t.id ? { ...x, nom: e.target.value } : x,
                            ),
                          }))
                        }
                      />
                      <button
                        aria-label={`Supprimer ${t.nom}`}
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          update((d) => ({
                            ...d,
                            trimesters: d.trimesters.filter((x) => x.id !== t.id),
                            grades: d.grades.filter((g) => g.trimesterId !== t.id),
                            selection:
                              d.selection.trimesterId === t.id
                                ? { ...d.selection, trimesterId: null }
                                : d.selection,
                          }))
                        }
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </Page>
  );
}
