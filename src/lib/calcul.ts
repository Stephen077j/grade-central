import { findGrade, studentsOf, type DB, type Student, type Subject } from "./store";

export interface SubjectResult {
  subject: Subject;
  devoir: number | null;
  composition: number | null;
  moyenne: number | null;
}

export interface StudentResult {
  student: Student;
  lignes: SubjectResult[];
  totalPoints: number;
  totalCoef: number;
  moyenneGenerale: number | null;
  rang: number;
  mention: string;
}

export function mentionDe(moyenne: number | null): string {
  if (moyenne === null) return "—";
  if (moyenne >= 16) return "Très Bien";
  if (moyenne >= 14) return "Bien";
  if (moyenne >= 12) return "Assez Bien";
  if (moyenne >= 10) return "Passable";
  return "Insuffisant";
}

export function moyenneMatiere(devoir: number | null, composition: number | null): number | null {
  const notes = [devoir, composition].filter((n): n is number => n !== null);
  if (notes.length === 0) return null;
  return notes.reduce((a, b) => a + b, 0) / notes.length;
}

export function formatNote(n: number | null, digits = 2): string {
  return n === null ? "—" : n.toFixed(digits).replace(".", ",");
}

/** Résultats de toute une classe, triés par moyenne générale décroissante avec rangs ex-aequo. */
export function resultatsClasse(
  db: DB,
  yearId: string | null,
  classeId: string | null,
  trimesterId: string | null,
): StudentResult[] {
  if (!yearId || !classeId || !trimesterId) return [];
  const students = studentsOf(db, yearId, classeId);

  const base = students.map((student) => {
    const lignes: SubjectResult[] = db.subjects.map((subject) => {
      const g = findGrade(db, student.id, subject.id, trimesterId);
      const devoir = g?.devoir ?? null;
      const composition = g?.composition ?? null;
      return { subject, devoir, composition, moyenne: moyenneMatiere(devoir, composition) };
    });
    let totalPoints = 0;
    let totalCoef = 0;
    for (const l of lignes) {
      if (l.moyenne !== null) {
        totalPoints += l.moyenne * l.subject.coefficient;
        totalCoef += l.subject.coefficient;
      }
    }
    const moyenneGenerale = totalCoef > 0 ? totalPoints / totalCoef : null;
    return {
      student,
      lignes,
      totalPoints,
      totalCoef,
      moyenneGenerale,
      rang: 0,
      mention: mentionDe(moyenneGenerale),
    };
  });

  const classes = [...base].sort((a, b) => (b.moyenneGenerale ?? -1) - (a.moyenneGenerale ?? -1));
  let lastMoy: number | null | undefined = undefined;
  let lastRang = 0;
  classes.forEach((r, i) => {
    if (r.moyenneGenerale !== null && r.moyenneGenerale === lastMoy) {
      r.rang = lastRang;
    } else {
      r.rang = i + 1;
      lastRang = r.rang;
      lastMoy = r.moyenneGenerale;
    }
  });
  return classes;
}

export function statistiques(resultats: StudentResult[]) {
  const notes = resultats
    .map((r) => r.moyenneGenerale)
    .filter((n): n is number => n !== null);
  const admis = notes.filter((n) => n >= 10).length;
  return {
    effectif: resultats.length,
    notes: notes.length,
    moyenneClasse: notes.length ? notes.reduce((a, b) => a + b, 0) / notes.length : null,
    plusForte: notes.length ? Math.max(...notes) : null,
    plusFaible: notes.length ? Math.min(...notes) : null,
    admis,
    tauxReussite: notes.length ? (admis / notes.length) * 100 : null,
  };
}

export function ordinal(rang: number): string {
  return rang === 1 ? "1er" : `${rang}e`;
}
