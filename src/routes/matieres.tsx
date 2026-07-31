import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, Field, Page, PageHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uid, update, useDB } from "@/lib/store";

export const Route = createFileRoute("/matieres")({
  head: () => ({
    meta: [
      { title: "Matières et coefficients — Bulletins CEG" },
      {
        name: "description",
        content:
          "Définir les matières enseignées et leur coefficient, utilisés pour le calcul de la moyenne générale.",
      },
      { property: "og:title", content: "Matières et coefficients — Bulletins CEG" },
      {
        property: "og:description",
        content: "Matières et coefficients servant au calcul des moyennes pondérées.",
      },
    ],
  }),
  component: MatieresPage,
});

function MatieresPage() {
  const db = useDB();
  const [nom, setNom] = useState("");
  const [coef, setCoef] = useState("2");
  const totalCoef = db.subjects.reduce((a, s) => a + s.coefficient, 0);

  const ajouter = () => {
    const label = nom.trim();
    const c = Number(coef);
    if (!label || !Number.isFinite(c) || c <= 0) {
      toast.error("Nom et coefficient valides requis");
      return;
    }
    update((d) => ({
      ...d,
      subjects: [...d.subjects, { id: uid(), nom: label, coefficient: c }],
    }));
    setNom("");
    setCoef("2");
    toast.success(`${label} ajoutée`);
  };

  return (
    <Page>
      <PageHeader
        titre="Matières & coefficients"
        description="Moyenne d'une matière = (devoir + composition) / 2. Moyenne générale = Σ (moyenne × coefficient) / Σ coefficients."
      />

      <div className="panel mb-8 flex flex-wrap items-end gap-3 p-5">
        <Field label="Matière" className="min-w-56 flex-1">
          <Input
            value={nom}
            placeholder="Mathématiques"
            onChange={(e) => setNom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ajouter()}
          />
        </Field>
        <Field label="Coefficient">
          <Input
            type="number"
            min={1}
            step={1}
            value={coef}
            className="w-28"
            onChange={(e) => setCoef(e.target.value)}
          />
        </Field>
        <Button onClick={ajouter}>Ajouter</Button>
      </div>

      {db.subjects.length === 0 ? (
        <EmptyState message="Aucune matière enregistrée." />
      ) : (
        <section className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Matière</th>
                <th className="px-5 py-3 w-40">Coefficient</th>
                <th className="px-5 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {db.subjects.map((s) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-5 py-2">
                    <Input
                      value={s.nom}
                      className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      onChange={(e) =>
                        update((d) => ({
                          ...d,
                          subjects: d.subjects.map((x) =>
                            x.id === s.id ? { ...x, nom: e.target.value } : x,
                          ),
                        }))
                      }
                    />
                  </td>
                  <td className="px-5 py-2">
                    <Input
                      type="number"
                      min={1}
                      value={s.coefficient}
                      className="h-9 w-24"
                      onChange={(e) =>
                        update((d) => ({
                          ...d,
                          subjects: d.subjects.map((x) =>
                            x.id === s.id
                              ? { ...x, coefficient: Number(e.target.value) || 1 }
                              : x,
                          ),
                        }))
                      }
                    />
                  </td>
                  <td className="px-5 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        update((d) => ({
                          ...d,
                          subjects: d.subjects.filter((x) => x.id !== s.id),
                          grades: d.grades.filter((g) => g.subjectId !== s.id),
                        }))
                      }
                    >
                      Supprimer
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-secondary/40 font-semibold">
                <td className="px-5 py-3">Total des coefficients</td>
                <td className="px-5 py-3">{totalCoef}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </section>
      )}
    </Page>
  );
}
