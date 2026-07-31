import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ContextBar,
  EmptyState,
  Page,
  PageHeader,
} from "@/components/shell";
import { activeYear, studentsOf, useDB } from "@/lib/store";
import { formatNote, resultatsClasse, statistiques } from "@/lib/calcul";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tableau de bord — Bulletins CEG" },
      {
        name: "description",
        content:
          "Vue d'ensemble de l'année scolaire : effectifs, matières, notes saisies et statistiques de classe.",
      },
      { property: "og:title", content: "Tableau de bord — Bulletins CEG" },
      {
        property: "og:description",
        content: "Effectifs, avancement de la saisie des notes et statistiques par classe.",
      },
    ],
  }),
  component: Dashboard,
});

const etapes = [
  { to: "/annees", label: "1. Créer l'année et les trimestres" },
  { to: "/classes", label: "2. Vérifier les classes" },
  { to: "/matieres", label: "3. Définir les matières et coefficients" },
  { to: "/eleves", label: "4. Inscrire les élèves" },
  { to: "/notes", label: "5. Saisir les notes (devoir / composition)" },
  { to: "/bulletins", label: "6. Générer et imprimer les bulletins" },
] as const;

function Dashboard() {
  const db = useDB();
  const year = activeYear(db);
  const { yearId, classeId, trimesterId } = db.selection;
  const eleves = studentsOf(db, yearId, classeId);
  const resultats = resultatsClasse(db, yearId, classeId, trimesterId);
  const stats = statistiques(resultats);
  const classe = db.classes.find((c) => c.id === classeId);
  const trimestre = db.trimesters.find((t) => t.id === trimesterId);
  const totalEleves = db.students.filter((s) => s.yearId === yearId).length;

  return (
    <Page>
      <PageHeader
        titre="Tableau de bord"
        description={`Année ${year?.nom ?? "—"} · toutes les données sont enregistrées localement sur cet ordinateur, sans connexion internet.`}
      />
      <ContextBar />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Élèves inscrits" valeur={String(totalEleves)} detail="sur l'année" />
        <Stat
          label={`Effectif ${classe?.nom ?? "—"}`}
          valeur={String(eleves.length)}
          detail={trimestre?.nom ?? "—"}
        />
        <Stat
          label="Moyenne de classe"
          valeur={formatNote(stats.moyenneClasse)}
          detail={`${stats.notes} élève(s) noté(s)`}
        />
        <Stat
          label="Taux de réussite"
          valeur={stats.tauxReussite === null ? "—" : `${stats.tauxReussite.toFixed(0)} %`}
          detail={`${stats.admis} élève(s) ≥ 10`}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-6">
          <h2 className="font-display text-xl font-semibold">Meilleurs résultats</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {classe?.nom ?? "—"} · {trimestre?.nom ?? "—"}
          </p>
          {resultats.length === 0 ? (
            <div className="mt-4">
              <EmptyState message="Aucun élève dans cette classe. Commencez par en inscrire." />
            </div>
          ) : (
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Rang</th>
                  <th className="py-2">Élève</th>
                  <th className="py-2 text-right">Moyenne</th>
                  <th className="py-2 text-right">Mention</th>
                </tr>
              </thead>
              <tbody>
                {resultats.slice(0, 8).map((r) => (
                  <tr key={r.student.id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 font-semibold text-primary">{r.rang}</td>
                    <td className="py-2">
                      {r.student.nom} {r.student.prenom}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {formatNote(r.moyenneGenerale)}
                    </td>
                    <td className="py-2 text-right text-muted-foreground">{r.mention}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="panel p-6">
          <h2 className="font-display text-xl font-semibold">Déroulement</h2>
          <ol className="mt-4 space-y-2 text-sm">
            {etapes.map((e) => (
              <li key={e.to}>
                <Link
                  to={e.to}
                  className="block rounded-md border border-border px-3 py-2 transition-colors hover:border-primary hover:bg-secondary"
                >
                  {e.label}
                </Link>
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">
            {db.subjects.length} matière(s) · {db.grades.length} note(s) enregistrée(s)
          </p>
        </section>
      </div>
    </Page>
  );
}

function Stat({
  label,
  valeur,
  detail,
}: {
  label: string;
  valeur: string;
  detail: string;
}) {
  return (
    <div className="panel p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 font-display text-3xl font-semibold text-primary">{valeur}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}
