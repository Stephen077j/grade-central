import { createFileRoute } from "@tanstack/react-router";
import { Fragment } from "react";
import { ContextBar, EmptyState, Page, PageHeader } from "@/components/shell";
import { Input } from "@/components/ui/input";
import { findGrade, setGrade, studentsOf, useDB } from "@/lib/store";
import { formatNote, moyenneMatiere, resultatsClasse, statistiques } from "@/lib/calcul";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Saisie des notes — Bulletins CEG" },
      {
        name: "description",
        content:
          "Saisir les notes de devoir et de composition par élève et par matière, avec calcul immédiat des moyennes.",
      },
      { property: "og:title", content: "Saisie des notes — Bulletins CEG" },
      {
        property: "og:description",
        content: "Tableau de saisie des notes avec moyennes calculées automatiquement.",
      },
    ],
  }),
  component: NotesPage,
});

function NotesPage() {
  const db = useDB();
  const { yearId, classeId, trimesterId } = db.selection;
  const eleves = studentsOf(db, yearId, classeId);
  const resultats = resultatsClasse(db, yearId, classeId, trimesterId);
  const stats = statistiques(resultats);

  const parse = (v: string): number | null => {
    if (v.trim() === "") return null;
    const n = Number(v.replace(",", "."));
    if (!Number.isFinite(n)) return null;
    return Math.min(20, Math.max(0, n));
  };

  return (
    <Page>
      <PageHeader
        titre="Saisie des notes"
        description="Notes sur 20. Dev = devoir, Comp = composition. Tout est enregistré automatiquement."
      />
      <ContextBar />

      {!trimesterId || eleves.length === 0 ? (
        <EmptyState message="Sélectionnez une année, un trimestre et une classe contenant des élèves." />
      ) : (
        <>
          <div className="panel overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-secondary/70 text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="sticky left-0 z-10 bg-secondary px-4 py-3 text-left">Élève</th>
                  {db.subjects.map((s) => (
                    <th key={s.id} colSpan={3} className="border-l border-border px-3 py-2">
                      {s.nom}
                      <span className="ml-1 font-normal normal-case">(coef {s.coefficient})</span>
                    </th>
                  ))}
                  <th className="border-l border-border px-3 py-2">Moy. gén.</th>
                  <th className="px-3 py-2">Rang</th>
                </tr>
                <tr className="bg-secondary/40 text-[11px] uppercase text-muted-foreground">
                  <th className="sticky left-0 z-10 bg-secondary/90 px-4 py-1" />
                  {db.subjects.map((s) => (
                    <Fragment key={s.id}>
                      <th className="border-l border-border px-2 py-1">Dev</th>
                      <th className="px-2 py-1">Comp</th>
                      <th className="px-2 py-1">Moy</th>
                    </Fragment>
                  ))}
                  <th className="border-l border-border px-2 py-1" />
                  <th className="px-2 py-1" />
                </tr>
              </thead>
              <tbody>
                {eleves.map((el) => {
                  const res = resultats.find((r) => r.student.id === el.id);
                  return (
                    <tr key={el.id} className="border-t border-border">
                      <td className="sticky left-0 z-10 whitespace-nowrap bg-card px-4 py-1.5 font-medium">
                        {el.nom} {el.prenom}
                      </td>
                      {db.subjects.map((s) => {
                        const g = findGrade(db, el.id, s.id, trimesterId);
                        const moy = moyenneMatiere(g?.devoir ?? null, g?.composition ?? null);
                        return (
                          <Fragment key={s.id}>
                            <td className="border-l border-border px-1 py-1">
                              <Input
                                inputMode="decimal"
                                aria-label={`${s.nom} devoir ${el.nom}`}
                                value={g?.devoir ?? ""}
                                className="h-8 w-16 text-center"
                                onChange={(e) =>
                                  setGrade(el.id, s.id, trimesterId, "devoir", parse(e.target.value))
                                }
                              />
                            </td>
                            <td className="px-1 py-1">
                              <Input
                                inputMode="decimal"
                                aria-label={`${s.nom} composition ${el.nom}`}
                                value={g?.composition ?? ""}
                                className="h-8 w-16 text-center"
                                onChange={(e) =>
                                  setGrade(
                                    el.id,
                                    s.id,
                                    trimesterId,
                                    "composition",
                                    parse(e.target.value),
                                  )
                                }
                              />
                            </td>
                            <td className="px-2 py-1 text-center text-muted-foreground">
                              {formatNote(moy, 1)}
                            </td>
                          </Fragment>
                        );
                      })}
                      <td className="border-l border-border px-3 py-1 text-center font-semibold">
                        {formatNote(res?.moyenneGenerale ?? null)}
                      </td>
                      <td className="px-3 py-1 text-center font-semibold text-primary">
                        {res?.moyenneGenerale === null || !res ? "—" : res.rang}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <Info label="Moyenne de classe" valeur={formatNote(stats.moyenneClasse)} />
            <Info label="Plus forte moyenne" valeur={formatNote(stats.plusForte)} />
            <Info label="Plus faible moyenne" valeur={formatNote(stats.plusFaible)} />
            <Info
              label="Taux de réussite"
              valeur={stats.tauxReussite === null ? "—" : `${stats.tauxReussite.toFixed(0)} %`}
            />
          </div>
        </>
      )}
    </Page>
  );
}

function Info({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-xl font-semibold">{valeur}</p>
    </div>
  );
}
