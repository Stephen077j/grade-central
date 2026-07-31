import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ContextBar, EmptyState, Field, Page, PageHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activeYear, update, useDB } from "@/lib/store";
import { formatNote, ordinal, resultatsClasse, statistiques } from "@/lib/calcul";

export const Route = createFileRoute("/bulletins")({
  head: () => ({
    meta: [
      { title: "Bulletins trimestriels — Bulletins CEG" },
      {
        name: "description",
        content:
          "Générer les bulletins trimestriels avec notes, moyennes, rang, mention et appréciations, prêts à imprimer ou à enregistrer en PDF.",
      },
      { property: "og:title", content: "Bulletins trimestriels — Bulletins CEG" },
      {
        property: "og:description",
        content: "Bulletins imprimables avec moyennes, rang, mention et signature du responsable.",
      },
    ],
  }),
  component: BulletinsPage,
});

function BulletinsPage() {
  const db = useDB();
  const { yearId, classeId, trimesterId } = db.selection;
  const year = activeYear(db);
  const classe = db.classes.find((c) => c.id === classeId);
  const trimestre = db.trimesters.find((t) => t.id === trimesterId);
  const resultats = resultatsClasse(db, yearId, classeId, trimesterId);
  const stats = statistiques(resultats);
  const [seul, setSeul] = useState<string>("tous");

  const aImprimer =
    seul === "tous" ? resultats : resultats.filter((r) => r.student.id === seul);

  return (
    <Page>
      <PageHeader
        titre="Bulletins"
        description="Utilisez « Imprimer » puis choisissez « Enregistrer au format PDF » pour obtenir les bulletins en PDF."
      >
        <Button onClick={() => window.print()} disabled={aImprimer.length === 0}>
          Imprimer / PDF
        </Button>
      </PageHeader>
      <ContextBar />

      <div className="no-print panel mb-8 flex flex-wrap items-end gap-4 p-5">
        <Field label="Nom de l'établissement" className="min-w-56 flex-1">
          <Input
            value={db.etablissement.nom}
            onChange={(e) =>
              update((d) => ({
                ...d,
                etablissement: { ...d.etablissement, nom: e.target.value },
              }))
            }
          />
        </Field>
        <Field label="Responsable des examens" className="min-w-56 flex-1">
          <Input
            value={db.etablissement.responsable}
            onChange={(e) =>
              update((d) => ({
                ...d,
                etablissement: { ...d.etablissement, responsable: e.target.value },
              }))
            }
          />
        </Field>
        <Field label="Élève">
          <select
            value={seul}
            onChange={(e) => setSeul(e.target.value)}
            className="h-9 rounded-md border border-input bg-card px-3 text-sm"
          >
            <option value="tous">Toute la classe ({resultats.length})</option>
            {resultats.map((r) => (
              <option key={r.student.id} value={r.student.id}>
                {r.student.nom} {r.student.prenom}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {aImprimer.length === 0 ? (
        <EmptyState message="Aucun bulletin à générer : vérifiez la classe, le trimestre et les élèves inscrits." />
      ) : (
        <div className="space-y-8">
          {aImprimer.map((r) => (
            <article
              key={r.student.id}
              className="bulletin-page panel bg-card p-8 print:p-4"
            >
              <header className="border-b-2 border-primary pb-4 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  République de Madagascar · Ministère de l'Éducation Nationale
                </p>
                <h2 className="mt-2 font-display text-2xl font-semibold">
                  {db.etablissement.nom || "CEG"}
                </h2>
                <p className="mt-1 text-sm">
                  Bulletin de notes — {trimestre?.nom ?? "—"} · Année scolaire{" "}
                  {year?.nom ?? "—"}
                </p>
              </header>

              <div className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
                <Ligne label="Nom et prénom" valeur={`${r.student.nom} ${r.student.prenom}`} />
                <Ligne label="Classe" valeur={classe?.nom ?? "—"} />
                <Ligne
                  label="Matricule"
                  valeur={r.student.matricule || "—"}
                />
                <Ligne label="Sexe" valeur={r.student.sexe === "M" ? "Garçon" : "Fille"} />
                <Ligne label="Effectif de la classe" valeur={String(resultats.length)} />
              </div>

              <table className="mt-5 w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-secondary text-left text-xs uppercase tracking-wide">
                    <th className="border border-border px-3 py-2">Matière</th>
                    <th className="border border-border px-3 py-2 text-center">Coef</th>
                    <th className="border border-border px-3 py-2 text-center">Devoir</th>
                    <th className="border border-border px-3 py-2 text-center">Composition</th>
                    <th className="border border-border px-3 py-2 text-center">Moyenne</th>
                    <th className="border border-border px-3 py-2 text-center">Moy × Coef</th>
                    <th className="border border-border px-3 py-2">Appréciation</th>
                  </tr>
                </thead>
                <tbody>
                  {r.lignes.map((l) => {
                    const g = db.grades.find(
                      (gr) =>
                        gr.studentId === r.student.id &&
                        gr.subjectId === l.subject.id &&
                        gr.trimesterId === trimesterId,
                    );
                    return (
                      <tr key={l.subject.id}>
                        <td className="border border-border px-3 py-1.5">{l.subject.nom}</td>
                        <td className="border border-border px-3 py-1.5 text-center">
                          {l.subject.coefficient}
                        </td>
                        <td className="border border-border px-3 py-1.5 text-center">
                          {formatNote(l.devoir, 1)}
                        </td>
                        <td className="border border-border px-3 py-1.5 text-center">
                          {formatNote(l.composition, 1)}
                        </td>
                        <td className="border border-border px-3 py-1.5 text-center font-medium">
                          {formatNote(l.moyenne)}
                        </td>
                        <td className="border border-border px-3 py-1.5 text-center">
                          {l.moyenne === null
                            ? "—"
                            : formatNote(l.moyenne * l.subject.coefficient)}
                        </td>
                        <td className="border border-border px-3 py-1.5 text-muted-foreground">
                          {g?.appreciation || "—"}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-secondary/60 font-semibold">
                    <td className="border border-border px-3 py-2">Totaux</td>
                    <td className="border border-border px-3 py-2 text-center">
                      {r.totalCoef}
                    </td>
                    <td className="border border-border px-3 py-2" colSpan={3} />
                    <td className="border border-border px-3 py-2 text-center">
                      {formatNote(r.totalCoef > 0 ? r.totalPoints : null)}
                    </td>
                    <td className="border border-border px-3 py-2" />
                  </tr>
                </tbody>
              </table>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Bloc label="Moyenne générale" valeur={`${formatNote(r.moyenneGenerale)} / 20`} />
                <Bloc
                  label="Rang"
                  valeur={
                    r.moyenneGenerale === null
                      ? "—"
                      : `${ordinal(r.rang)} / ${resultats.length}`
                  }
                />
                <Bloc label="Mention" valeur={r.mention} />
              </div>

              <p className="mt-4 text-xs text-muted-foreground">
                Moyenne de la classe : {formatNote(stats.moyenneClasse)} · plus forte moyenne :{" "}
                {formatNote(stats.plusForte)} · plus faible moyenne :{" "}
                {formatNote(stats.plusFaible)}
              </p>

              <div className="mt-8 flex items-end justify-between text-xs">
                <div className="w-40">
                  <div className="border-t border-border pt-1">Visa des parents</div>
                </div>
                <div className="w-48 text-center">
                  <div className="min-h-[3rem]" />
                  <div className="border-t border-border pt-1">
                    {db.etablissement.responsable}
                  </div>
                  <p className="mt-0.5 text-muted-foreground">Responsable des examens</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </Page>
  );
}

function Ligne({ label, valeur }: { label: string; valeur: string }) {
  return (
    <p>
      <span className="text-muted-foreground">{label} : </span>
      <span className="font-medium">{valeur}</span>
    </p>
  );
}

function Bloc({ label, valeur }: { label: string; valeur: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/40 px-4 py-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-semibold text-primary">{valeur}</p>
    </div>
  );
}
