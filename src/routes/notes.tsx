import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useRef, useState } from "react";
import { Download, Upload, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { ContextBar, EmptyState, Page, PageHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { findGrade, importGrades, setGrade, studentsOf, useDB } from "@/lib/store";
import { formatNote, moyenneMatiere, resultatsClasse, statistiques } from "@/lib/calcul";
import { generateTemplate, parseImport, type ImportResult } from "@/lib/excel";

export const Route = createFileRoute("/notes")({
  head: () => ({
    meta: [
      { title: "Saisie des notes — Bulletins CEG" },
      {
        name: "description",
        content:
          "Saisir les notes de devoir et de composition par élève et par matière, avec calcul immédiat des moyennes. Import et export Excel.",
      },
      { property: "og:title", content: "Saisie des notes — Bulletins CEG" },
      {
        property: "og:description",
        content: "Tableau de saisie des notes, import et export Excel.",
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const parse = (v: string): number | null => {
    if (v.trim() === "") return null;
    const n = Number(v.replace(",", "."));
    if (!Number.isFinite(n)) return null;
    return Math.min(20, Math.max(0, n));
  };

  const classe = db.classes.find((c) => c.id === classeId);
  const trimestre = db.trimesters.find((t) => t.id === trimesterId);
  const peutExcel = Boolean(yearId && classeId && trimesterId && eleves.length > 0);

  const telechargerModele = () => {
    if (!classe || !trimesterId || !trimestre) {
      toast.error("Sélectionnez une classe et un trimestre");
      return;
    }
    generateTemplate(db, yearId!, classeId!, trimesterId, classe.nom, trimestre.nom);
    toast.success("Modèle Excel téléchargé");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!trimesterId) {
      toast.error("Sélectionnez un trimestre");
      e.target.value = "";
      return;
    }
    try {
      const buf = await file.arrayBuffer();
      const result = parseImport(db, buf, trimesterId);
      if (result.updates.length === 0) {
        setImportResult(result);
      } else {
        importGrades(trimesterId, result.updates);
        setImportResult(result);
        toast.success(`${result.updates.length} note(s) importée(s)`);
      }
    } catch {
      toast.error("Impossible de lire le fichier Excel");
    }
    e.target.value = "";
  };

  return (
    <Page>
      <PageHeader
        titre="Saisie des notes"
        description="Notes sur 20. Dev = devoir, Comp = composition. Tout est enregistré automatiquement."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={telechargerModele}
            disabled={!peutExcel}
            title={peutExcel ? "" : "Sélectionnez une classe et un trimestre"}
          >
            <Download className="size-4" />
            Modèle Excel
          </Button>
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={!trimesterId || eleves.length === 0}
          >
            <Upload className="size-4" />
            Importer Excel
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={onFile}
          />
        </div>
      </PageHeader>
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

      <Dialog open={importResult !== null} onOpenChange={(o) => !o && setImportResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              Résultat de l'import
            </DialogTitle>
            <DialogDescription>
              {importResult && importResult.updates.length > 0
                ? `${importResult.updates.length} note(s) enregistrée(s).`
                : "Aucune note importée."}
            </DialogDescription>
          </DialogHeader>
          {importResult && <ImportDetails result={importResult} />}
        </DialogContent>
      </Dialog>
    </Page>
  );
}

function ImportDetails({ result }: { result: ImportResult }) {
  const aWarnings = result.warnings.length;
  const aEleves = result.elevesManquants.length;
  const aMatieres = result.matieresManquantes.length;
  const aucunSouci = aWarnings === 0 && aEleves === 0 && aMatieres === 0;

  return (
    <div className="space-y-3 text-sm">
      {aucunSouci && result.updates.length > 0 ? (
        <p className="text-muted-foreground">Tout est en ordre, aucune anomalie détectée.</p>
      ) : null}

      {result.warnings.map((w, i) => (
        <p
          key={i}
          className="rounded-md border border-gold/50 bg-gold/15 px-3 py-2 text-gold-foreground"
        >
          {w}
        </p>
      ))}

      {aEleves > 0 && (
        <div>
          <p className="font-medium">Élèves non reconnus ({aEleves}) :</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {result.elevesManquants.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-muted-foreground">
            Vérifiez l'orthographe ou inscrivez-les dans la page Élèves.
          </p>
        </div>
      )}

      {aMatieres > 0 && (
        <div>
          <p className="font-medium">Matières non reconnues ({aMatieres}) :</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {result.matieresManquantes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
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
