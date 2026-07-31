import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Upload, Lock, ShieldCheck, Save } from "lucide-react";
import { toast } from "sonner";
import { Page, PageHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  changePassword,
  createAdmin,
  exportBackup,
  hasAdmin,
  importBackup,
  lock,
} from "@/lib/auth";
import { resetAll, useDB } from "@/lib/store";

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — Bulletins CEG" },
      {
        name: "description",
        content:
          "Sauvegarde et restauration des données, gestion du mot de passe administrateur et verrouillage de l'application.",
      },
      { property: "og:title", content: "Paramètres — Bulletins CEG" },
      {
        property: "og:description",
        content: "Sauvegarde, restauration, mot de passe et verrouillage.",
      },
    ],
  }),
  component: ParametresPage,
});

function ParametresPage() {
  const db = useDB();
  const adminExistant = hasAdmin();
  const fileRef = useRef<HTMLInputElement>(null);

  /* --- mot de passe --- */
  const [createPwd, setCreatePwd] = useState("");
  const [createPwd2, setCreatePwd2] = useState("");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");

  const creerMotDePasse = async () => {
    if (createPwd.length < 4) return toast.error("Au moins 4 caractères");
    if (createPwd !== createPwd2) return toast.error("Les deux mots de passe ne correspondent pas");
    try {
      await createAdmin(createPwd);
      setCreatePwd("");
      setCreatePwd2("");
      toast.success("Mot de passe administrateur créé");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const modifierMotDePasse = async () => {
    if (newPwd.length < 4) return toast.error("Le nouveau mot de passe doit faire au moins 4 caractères");
    if (newPwd !== newPwd2) return toast.error("Les deux mots de passe ne correspondent pas");
    try {
      await changePassword(oldPwd, newPwd);
      setOldPwd("");
      setNewPwd("");
      setNewPwd2("");
      toast.success("Mot de passe modifié");
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  /* --- sauvegarde --- */
  const exporter = () => {
    exportBackup();
    toast.success("Sauvegarde téléchargée");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importBackup(text);
      toast.success("Sauvegarde restaurée");
    } catch {
      toast.error("Fichier de sauvegarde invalide");
    }
    e.target.value = "";
  };

  const reinitialiser = () => {
    if (!confirm("Effacer TOUTES les données ? Cette action est irréversible.")) return;
    resetAll();
    toast.success("Données réinitialisées");
  };

  return (
    <Page>
      <PageHeader
        titre="Paramètres"
        description="Sauvegarde, restauration, sécurité et verrouillage de l'application."
      />

      <div className="space-y-8">
        {/* --- Sauvegarde --- */}
        <section className="panel p-6">
          <h2 className="font-display text-xl font-semibold">Sauvegarde des données</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Exportez régulièrement une copie de toutes vos données (années, classes, élèves,
            notes) dans un fichier. Conservez-le sur une clé USB.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={exporter}>
              <Download className="size-4" />
              Exporter une sauvegarde
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" />
              Restaurer une sauvegarde
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={onFile}
            />
          </div>
          <div className="mt-4 rounded-md border border-dashed border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground">
            {db.years.length} année(s) · {db.students.length} élève(s) · {db.grades.length}{" "}
            note(s) enregistrée(s)
          </div>
        </section>

        {/* --- Sécurité --- */}
        <section className="panel p-6">
          <h2 className="font-display text-xl font-semibold">
            Sécurité administrateur
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Le mot de passe protège l'application contre les modifications non autorisées. Il est
            stocké uniquement sur cet ordinateur.
          </p>

          {!adminExistant ? (
            <div className="mt-4 max-w-sm space-y-3">
              <p className="text-sm font-medium text-primary">
                Aucun mot de passe défini. Créez-en un maintenant.
              </p>
              <div>
                <Label htmlFor="cp1">Nouveau mot de passe</Label>
                <Input
                  id="cp1"
                  type="password"
                  value={createPwd}
                  onChange={(e) => setCreatePwd(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="cp2">Confirmer le mot de passe</Label>
                <Input
                  id="cp2"
                  type="password"
                  value={createPwd2}
                  onChange={(e) => setCreatePwd2(e.target.value)}
                />
              </div>
              <Button onClick={creerMotDePasse}>
                <ShieldCheck className="size-4" />
                Créer le mot de passe
              </Button>
            </div>
          ) : (
            <>
              <div className="mt-4 max-w-sm space-y-3">
                <p className="text-sm text-muted-foreground">
                  L'administrateur est configuré. Vous pouvez modifier le mot de passe ou
                  verrouiller l'application.
                </p>
                <div>
                  <Label htmlFor="op">Mot de passe actuel</Label>
                  <Input
                    id="op"
                    type="password"
                    value={oldPwd}
                    onChange={(e) => setOldPwd(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="np">Nouveau mot de passe</Label>
                  <Input
                    id="np"
                    type="password"
                    value={newPwd}
                    onChange={(e) => setNewPwd(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="np2">Confirmer le nouveau mot de passe</Label>
                  <Input
                    id="np2"
                    type="password"
                    value={newPwd2}
                    onChange={(e) => setNewPwd2(e.target.value)}
                  />
                </div>
                <Button onClick={modifierMotDePasse}>
                  <Save className="size-4" />
                  Modifier le mot de passe
                </Button>
              </div>
              <div className="mt-4">
                <Button variant="outline" onClick={() => lock()}>
                  <Lock className="size-4" />
                  Verrouiller maintenant
                </Button>
              </div>
            </>
          )}
        </section>

        {/* --- Zone dangereuse --- */}
        <section className="panel border-destructive/30 p-6">
          <h2 className="font-display text-xl font-semibold text-destructive">
            Zone de réinitialisation
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Efface toutes les données et remet l'application à son état initial. Effectuez une
            sauvegarde au préalable.
          </p>
          <Button variant="destructive" className="mt-4" onClick={reinitialiser}>
            Réinitialiser toutes les données
          </Button>
        </section>
      </div>
    </Page>
  );
}
