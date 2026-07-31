import { useSyncExternalStore } from "react";

export type Sexe = "M" | "F";

export interface Year {
  id: string;
  nom: string;
  actif: boolean;
}
export interface Trimester {
  id: string;
  nom: string;
  yearId: string;
}
export interface Classe {
  id: string;
  nom: string;
}
export interface Student {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  sexe: Sexe;
  classeId: string;
  yearId: string;
}
export interface Subject {
  id: string;
  nom: string;
  coefficient: number;
}
export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  trimesterId: string;
  devoir: number | null;
  composition: number | null;
  appreciation: string;
}
export interface Selection {
  yearId: string | null;
  trimesterId: string | null;
  classeId: string | null;
}

export interface Etablissement {
  nom: string;
  responsable: string;
}

export interface AdminAccount {
  passwordHash: string;
  salt: string;
}

export interface DB {
  years: Year[];
  trimesters: Trimester[];
  classes: Classe[];
  students: Student[];
  subjects: Subject[];
  grades: Grade[];
  selection: Selection;
  etablissement: Etablissement;
  admin: AdminAccount | null;
}

const KEY = "ceg-bulletins-v1";

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function seed(): DB {
  const yearId = "year-2025";
  const classes: Classe[] = [
    { id: "cl-6", nom: "6ème" },
    { id: "cl-5", nom: "5ème" },
    { id: "cl-4", nom: "4ème" },
    { id: "cl-3", nom: "3ème" },
  ];
  const trimesters: Trimester[] = [
    { id: "tr-1", nom: "Trimestre 1", yearId },
    { id: "tr-2", nom: "Trimestre 2", yearId },
    { id: "tr-3", nom: "Trimestre 3", yearId },
  ];
  const subjects: Subject[] = [
    { id: "su-math", nom: "Mathématiques", coefficient: 4 },
    { id: "su-fr", nom: "Français", coefficient: 4 },
    { id: "su-mg", nom: "Malagasy", coefficient: 2 },
    { id: "su-ang", nom: "Anglais", coefficient: 2 },
    { id: "su-svt", nom: "SVT", coefficient: 2 },
    { id: "su-pc", nom: "Physique-Chimie", coefficient: 2 },
    { id: "su-hg", nom: "Histoire-Géographie", coefficient: 2 },
    { id: "su-eps", nom: "EPS", coefficient: 1 },
  ];
  return {
    years: [{ id: yearId, nom: "2025-2026", actif: true }],
    trimesters,
    classes,
    students: [],
    subjects,
    grades: [],
    selection: { yearId, trimesterId: "tr-1", classeId: "cl-6" },
    etablissement: { nom: "CEG", responsable: "Le Responsable des examens" },
    admin: null,
  };
}

const EMPTY: DB = seed();

let state: DB = EMPTY;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): DB {
  return state;
}
function getServerSnapshot(): DB {
  return EMPTY;
}

export function hydrateStore() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DB>;
      state = migrate(seed(), parsed);
      emit();
    }
  } catch {
    /* données illisibles : on garde le modèle par défaut */
  }
}

/** Fusionne les données persistées dans le seed, en gérant les évolutions de schéma. */
function migrate(base: DB, parsed: Partial<DB>): DB {
  const etablissement: Etablissement =
    typeof parsed.etablissement === "string"
      ? { nom: parsed.etablissement, responsable: base.etablissement.responsable }
      : { ...base.etablissement, ...parsed.etablissement };

  const students = (parsed.students ?? []).map((s) => ({
    ...s,
    matricule: s.matricule ?? "",
  }));

  const grades = (parsed.grades ?? []).map((g) => ({
    ...g,
    appreciation: g.appreciation ?? "",
  }));

  return {
    ...base,
    ...parsed,
    students,
    grades,
    selection: { ...base.selection, ...parsed.selection },
    etablissement,
    admin: parsed.admin ?? null,
  };
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota dépassé */
  }
}

export function update(fn: (db: DB) => DB) {
  state = fn(state);
  persist();
  emit();
}

export function useDB(): DB {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Accès direct au snapshot courant (sans hook) — pour la logique d'auth. */
export function getDB(): DB {
  return state;
}

export function resetAll() {
  state = seed();
  persist();
  emit();
}

export function exportJSON(): string {
  return JSON.stringify(state, null, 2);
}

export function importJSON(raw: string) {
  const parsed = JSON.parse(raw) as Partial<DB>;
  state = migrate(seed(), parsed);
  persist();
  emit();
}

/* ---------- sélecteurs ---------- */

export function activeYear(db: DB): Year | undefined {
  return db.years.find((y) => y.id === db.selection.yearId) ?? db.years.find((y) => y.actif);
}

export function trimestersOfYear(db: DB, yearId: string | null | undefined): Trimester[] {
  return db.trimesters.filter((t) => t.yearId === yearId);
}

export function studentsOf(
  db: DB,
  yearId: string | null | undefined,
  classeId: string | null | undefined,
): Student[] {
  return db.students
    .filter((s) => s.yearId === yearId && s.classeId === classeId)
    .sort((a, b) => `${a.nom} ${a.prenom}`.localeCompare(`${b.nom} ${b.prenom}`, "fr"));
}

export function findGrade(
  db: DB,
  studentId: string,
  subjectId: string,
  trimesterId: string,
): Grade | undefined {
  return db.grades.find(
    (g) =>
      g.studentId === studentId && g.subjectId === subjectId && g.trimesterId === trimesterId,
  );
}

export function setGrade(
  studentId: string,
  subjectId: string,
  trimesterId: string,
  field: "devoir" | "composition",
  value: number | null,
) {
  update((db) => {
    const existing = db.grades.find(
      (g) =>
        g.studentId === studentId && g.subjectId === subjectId && g.trimesterId === trimesterId,
    );
    if (existing) {
      return {
        ...db,
        grades: db.grades.map((g) => (g.id === existing.id ? { ...g, [field]: value } : g)),
      };
    }
    return {
      ...db,
      grades: [
        ...db.grades,
        {
          id: uid(),
          studentId,
          subjectId,
          trimesterId,
          devoir: field === "devoir" ? value : null,
          composition: field === "composition" ? value : null,
          appreciation: "",
        },
      ],
    };
  });
}

export function setAppreciation(
  studentId: string,
  subjectId: string,
  trimesterId: string,
  appreciation: string,
) {
  update((db) => {
    const existing = db.grades.find(
      (g) =>
        g.studentId === studentId && g.subjectId === subjectId && g.trimesterId === trimesterId,
    );
    if (existing) {
      return {
        ...db,
        grades: db.grades.map((g) =>
          g.id === existing.id ? { ...g, appreciation } : g,
        ),
      };
    }
    return {
      ...db,
      grades: [
        ...db.grades,
        {
          id: uid(),
          studentId,
          subjectId,
          trimesterId,
          devoir: null,
          composition: null,
          appreciation,
        },
      ],
    };
  });
}

export interface GradeImportRow {
  studentId: string;
  subjectId: string;
  devoir: number | null;
  composition: number | null;
}

export function importGrades(trimesterId: string, rows: GradeImportRow[]) {
  update((db) => {
    const index = new Map<string, number>();
    db.grades.forEach((g, i) => {
      if (g.trimesterId === trimesterId) index.set(`${g.studentId}|${g.subjectId}`, i);
    });

    const grades = [...db.grades];
    for (const r of rows) {
      const key = `${r.studentId}|${r.subjectId}`;
      const idx = index.get(key);
      if (idx !== undefined) {
        grades[idx] = {
          ...grades[idx],
          devoir: r.devoir,
          composition: r.composition,
        };
      } else {
        grades.push({
          id: uid(),
          studentId: r.studentId,
          subjectId: r.subjectId,
          trimesterId,
          devoir: r.devoir,
          composition: r.composition,
          appreciation: "",
        });
        index.set(key, grades.length - 1);
      }
    }
    return { ...db, grades };
  });
}
