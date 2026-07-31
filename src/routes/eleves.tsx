import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ContextBar, EmptyState, Field, Page, PageHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { studentsOf, uid, update, useDB, type Sexe } from "@/lib/store";

export const Route = createFileRoute("/eleves")({
  head: () => ({
    meta: [
      { title: "Élèves — Bulletins CEG" },
      {
        name: "description",
        content:
          "Inscrire les élèves avec nom, prénom, sexe, classe et année scolaire, et gérer les listes par classe.",
      },
      { property: "og:title", content: "Élèves — Bulletins CEG" },
      { property: "og:description", content: "Listes d'élèves par classe et par année scolaire." },
    ],
  }),
  component: ElevesPage,
});

function ElevesPage() {
  const db = useDB();
  const { yearId, classeId } = db.selection;
  const eleves = studentsOf(db, yearId, classeId);
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [sexe, setSexe] = useState<Sexe>("M");

  const ajouter = () => {
    if (!yearId || !classeId) {
      toast.error("Choisissez une année et une classe");
      return;
    }
    if (!nom.trim() || !prenom.trim()) {
      toast.error("Nom et prénom obligatoires");
      return;
    }
    update((d) => ({
      ...d,
      students: [
        ...d.students,
        {
          id: uid(),
          nom: nom.trim().toUpperCase(),
          prenom: prenom.trim(),
          sexe,
          classeId,
          yearId,
        },
      ],
    }));
    setNom("");
    setPrenom("");
    toast.success("Élève inscrit");
  };

  return (
    <Page>
      <PageHeader
        titre="Élèves"
        description="Sélectionnez l'année et la classe, puis inscrivez les élèves un par un."
      />
      <ContextBar />

      <div className="panel mb-8 flex flex-wrap items-end gap-3 p-5">
        <Field label="Nom" className="min-w-40 flex-1">
          <Input value={nom} placeholder="RAKOTO" onChange={(e) => setNom(e.target.value)} />
        </Field>
        <Field label="Prénom" className="min-w-40 flex-1">
          <Input
            value={prenom}
            placeholder="Jean"
            onChange={(e) => setPrenom(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ajouter()}
          />
        </Field>
        <Field label="Sexe">
          <Select value={sexe} onValueChange={(v) => setSexe(v as Sexe)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="M">Garçon</SelectItem>
              <SelectItem value="F">Fille</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Button onClick={ajouter}>Inscrire</Button>
      </div>

      {eleves.length === 0 ? (
        <EmptyState message="Aucun élève dans cette classe pour l'année sélectionnée." />
      ) : (
        <section className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-5 py-3 w-12">N°</th>
                <th className="px-5 py-3">Nom</th>
                <th className="px-5 py-3">Prénom</th>
                <th className="px-5 py-3 w-32">Sexe</th>
                <th className="px-5 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {eleves.map((s, i) => (
                <tr key={s.id} className="border-t border-border">
                  <td className="px-5 py-2 text-muted-foreground">{i + 1}</td>
                  <td className="px-5 py-2">
                    <Input
                      value={s.nom}
                      className="border-0 bg-transparent px-0 font-medium shadow-none focus-visible:ring-0"
                      onChange={(e) =>
                        update((d) => ({
                          ...d,
                          students: d.students.map((x) =>
                            x.id === s.id ? { ...x, nom: e.target.value } : x,
                          ),
                        }))
                      }
                    />
                  </td>
                  <td className="px-5 py-2">
                    <Input
                      value={s.prenom}
                      className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                      onChange={(e) =>
                        update((d) => ({
                          ...d,
                          students: d.students.map((x) =>
                            x.id === s.id ? { ...x, prenom: e.target.value } : x,
                          ),
                        }))
                      }
                    />
                  </td>
                  <td className="px-5 py-2">
                    <Select
                      value={s.sexe}
                      onValueChange={(v) =>
                        update((d) => ({
                          ...d,
                          students: d.students.map((x) =>
                            x.id === s.id ? { ...x, sexe: v as Sexe } : x,
                          ),
                        }))
                      }
                    >
                      <SelectTrigger className="h-9 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Garçon</SelectItem>
                        <SelectItem value="F">Fille</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-5 py-2 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        update((d) => ({
                          ...d,
                          students: d.students.filter((x) => x.id !== s.id),
                          grades: d.grades.filter((g) => g.studentId !== s.id),
                        }))
                      }
                    >
                      Retirer
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </Page>
  );
}
