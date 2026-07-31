import * as XLSX from "xlsx";

import { findGrade, studentsOf, type DB } from "./store";

export interface GradeUpdate {
  studentId: string;
  subjectId: string;
  devoir: number | null;
  composition: number | null;
}

export interface ImportResult {
  updates: GradeUpdate[];
  warnings: string[];
  elevesManquants: string[];
  matieresManquantes: string[];
}

const FEUILLE = "Notes";

/**
 * Génère un fichier Excel pré-rempli : une ligne par élève, deux colonnes
 * (Devoir / Composition) par matière. Les notes déjà saisies sont incluses
 * pour permettre correction puis ré-import.
 */
export function generateTemplate(
  db: DB,
  yearId: string,
  classeId: string,
  trimesterId: string,
  classeNom: string,
  trimestreNom: string,
): void {
  const students = studentsOf(db, yearId, classeId);

  const header: (string | number)[] = ["Élève"];
  for (const s of db.subjects) {
    header.push(`${s.nom} - Devoir`);
    header.push(`${s.nom} - Composition`);
  }

  const rows: (string | number)[][] = [header];
  for (const st of students) {
    const row: (string | number)[] = [`${st.nom} ${st.prenom}`];
    for (const s of db.subjects) {
      const g = findGrade(db, st.id, s.id, trimesterId);
      row.push(g?.devoir ?? "");
      row.push(g?.composition ?? "");
    }
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, ...db.subjects.flatMap(() => [{ wch: 10 }, { wch: 12 }])];
  ws["!freeze"] = { xSplit: 1, ySplit: 1 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, FEUILLE);

  const safeClasse = classeNom.replace(/[^a-zA-Z0-9]/g, "");
  const safeTrim = trimestreNom.replace(/[^a-zA-Z0-9]/g, "");
  XLSX.writeFile(wb, `saisie-notes-${safeClasse}-${safeTrim}.xlsx`);
}

function parseNote(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  if (!Number.isFinite(n)) return null;
  return Math.min(20, Math.max(0, n));
}

function normaliserNom(s: string): string {
  return s.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Analyse un fichier Excel rempli et renvoie les notes à enregistrer.
 * Le rapprochement se fait par nom d'élève et nom de matière.
 */
export function parseImport(db: DB, data: ArrayBuffer, trimesterId: string): ImportResult {
  const wb = XLSX.read(data, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(ws, {
    header: 1,
    raw: true,
    defval: "",
  });

  const warnings: string[] = [];
  const elevesManquants: string[] = [];
  const matieresManquantes: string[] = [];

  if (rows.length < 2) {
    return { updates: [], warnings: ["Le fichier est vide ou ne contient que l'en-tête."], elevesManquants: [], matieresManquantes: [] };
  }

  const header = rows[0] as string[];
  type ColMap = { subjectId: string; field: "devoir" | "composition" };
  const colMap: Record<number, ColMap> = {};

  for (let c = 1; c < header.length; c++) {
    const titre = String(header[c] ?? "").trim();
    const m = titre.match(/^(.+?)\s*-\s*(Devoir|Composition)$/i);
    if (!m) continue;
    const nomMatiere = m[1].trim();
    const field = m[2].toLowerCase() === "devoir" ? "devoir" : "composition";
    const subject = db.subjects.find((s) => s.nom.toLowerCase() === nomMatiere.toLowerCase());
    if (!subject) {
      if (!matieresManquantes.includes(nomMatiere)) matieresManquantes.push(nomMatiere);
      continue;
    }
    colMap[c] = { subjectId: subject.id, field };
  }

  if (Object.keys(colMap).length === 0) {
    return {
      updates: [],
      warnings: ["Aucune colonne de matière reconnue. L'en-tête doit respecter le format « Matière - Devoir » et « Matière - Composition »."],
      elevesManquants: [],
      matieresManquantes,
    };
  }

  const parNom = new Map<string, string[]>();
  for (const st of db.students) {
    const key = normaliserNom(`${st.nom} ${st.prenom}`);
    const list = parNom.get(key);
    if (list) list.push(st.id);
    else parNom.set(key, [st.id]);
  }

  const accumulateur = new Map<string, GradeUpdate>();

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] as (string | number)[];
    const nomCell = String(row[0] ?? "").trim();
    if (!nomCell) continue;

    const key = normaliserNom(nomCell);
    const candidats = parNom.get(key);
    if (!candidats || candidats.length === 0) {
      if (!elevesManquants.includes(nomCell)) elevesManquants.push(nomCell);
      continue;
    }
    if (candidats.length > 1) {
      warnings.push(`Homonyme ignoré : « ${nomCell} » — plusieurs élèves portent ce nom.`);
      continue;
    }
    const studentId = candidats[0];

    for (const [cStr, map] of Object.entries(colMap)) {
      const c = Number(cStr);
      const valeur = parseNote(row[c]);
      const gradeKey = `${studentId}|${map.subjectId}`;
      const existing = accumulateur.get(gradeKey) ?? {
        studentId,
        subjectId: map.subjectId,
        devoir: null,
        composition: null,
      };
      existing[map.field] = valeur;
      accumulateur.set(gradeKey, existing);
    }
  }

  const updates = Array.from(accumulateur.values()).filter(
    (g) => g.devoir !== null || g.composition !== null,
  );

  if (updates.length === 0 && elevesManquants.length === 0) {
    warnings.push("Aucune note trouvée dans le fichier.");
  }

  return { updates, warnings, elevesManquants, matieresManquantes };
}
