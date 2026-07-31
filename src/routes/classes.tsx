import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, Field, Page, PageHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uid, update, useDB } from "@/lib/store";

export const Route = createFileRoute("/classes")({
  head: () => ({
    meta: [
      { title: "Classes — Bulletins CEG" },
      {
        name: "description",
        content: "Gérer les classes du collège (6ème, 5ème, 4ème, 3ème) et leurs effectifs.",
      },
      { property: "og:title", content: "Classes — Bulletins CEG" },
      { property: "og:description", content: "Créer et renommer les classes du collège." },
    ],
  }),
  component: ClassesPage,
});

function ClassesPage() {
  const db = useDB();
  const [nom, setNom] = useState("");

  const ajouter = () => {
    const label = nom.trim();
    if (!label) return;
    update((d) => ({ ...d, classes: [...d.classes, { id: uid(), nom: label }] }));
    setNom("");
    toast.success(`Classe ${label} ajoutée`);
  };

  return (
    <Page>
      <PageHeader
        titre="Classes"
        description="Les classes sont communes à toutes les années scolaires ; les élèves sont rattachés à une classe et à une année."
      />

      <div className="panel mb-8 flex flex-wrap items-end gap-3 p-5">
        <Field label="Nouvelle classe" className="min-w-56 flex-1">
          <Input
            value={nom}
            placeholder="6ème A"
            onChange={(e) => setNom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ajouter()}
          />
        </Field>
        <Button onClick={ajouter}>Ajouter</Button>
      </div>

      {db.classes.length === 0 ? (
        <EmptyState message="Aucune classe enregistrée." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {db.classes.map((c) => {
            const effectif = db.students.filter(
              (s) => s.classeId === c.id && s.yearId === db.selection.yearId,
            ).length;
            return (
              <div key={c.id} className="panel p-5">
                <Input
                  value={c.nom}
                  className="border-0 bg-transparent px-0 font-display text-xl font-semibold shadow-none focus-visible:ring-0"
                  onChange={(e) =>
                    update((d) => ({
                      ...d,
                      classes: d.classes.map((x) =>
                        x.id === c.id ? { ...x, nom: e.target.value } : x,
                      ),
                    }))
                  }
                />
                <p className="mt-1 text-sm text-muted-foreground">
                  {effectif} élève(s) cette année
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 px-0 text-destructive"
                  onClick={() => {
                    const studentIds = db.students
                      .filter((s) => s.classeId === c.id)
                      .map((s) => s.id);
                    update((d) => ({
                      ...d,
                      classes: d.classes.filter((x) => x.id !== c.id),
                      students: d.students.filter((s) => s.classeId !== c.id),
                      grades: d.grades.filter((g) => !studentIds.includes(g.studentId)),
                      selection:
                        d.selection.classeId === c.id
                          ? { ...d.selection, classeId: null }
                          : d.selection,
                    }));
                    toast.success("Classe supprimée");
                  }}
                >
                  Supprimer
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Page>
  );
}
