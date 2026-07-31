import { useSyncExternalStore } from "react";
import { getDB, update, useDB, type AdminAccount, type DB } from "./store";

/**
 * Authentification locale : un seul compte admin, mot de passe haché et stocké
 * dans la base locale. Aucune donnée n'est envoyée sur un réseau.
 *
 * Le hachage utilise PBKDF2 via la Web Crypto API — disponible dans le
 * navigateur et dans le moteur de rendu d'Electron, sans dépendance native.
 */

const iterations = 100_000;

async function deriveHash(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = hexToBytes(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

function hexToBytes(hex: string): Uint8Array {
  const arr = new Uint8Array(hex.length / 2);
  for (let i = 0; i < arr.length; i++) {
    arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return arr;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

export async function createAdmin(password: string): Promise<void> {
  if (password.length < 4) throw new Error("Le mot de passe doit faire au moins 4 caractères.");
  const salt = randomSalt();
  const passwordHash = await deriveHash(password, salt);
  const account: AdminAccount = { passwordHash, salt };
  update((db) => ({ ...db, admin: account }));
}

export async function verifyPassword(password: string): Promise<boolean> {
  const db = getDB();
  if (!db.admin) return false;
  const hash = await deriveHash(password, db.admin.salt);
  return hash === db.admin.passwordHash;
}

export async function changePassword(current: string, next: string): Promise<void> {
  const ok = await verifyPassword(current);
  if (!ok) throw new Error("Le mot de passe actuel est incorrect.");
  await createAdmin(next);
}

export function hasAdmin(): boolean {
  return getDB().admin !== null;
}

/* ---------- état de session (verrouillage) ---------- */

type SessionState = "setup" | "locked" | "unlocked";
let sessionState: SessionState = "setup";
const sessionListeners = new Set<() => void>();

function emitSession() {
  sessionListeners.forEach((l) => l());
}

function subscribeSession(cb: () => void) {
  sessionListeners.add(cb);
  return () => sessionListeners.delete(cb);
}

function getSession(): SessionState {
  return sessionState;
}

export function initSession() {
  const db = getDB();
  sessionState = db.admin ? "locked" : "setup";
  emitSession();
}

export function lock() {
  if (!getDB().admin) return;
  sessionState = "locked";
  emitSession();
}

export function unlock() {
  sessionState = "unlocked";
  emitSession();
}

export function useSession(): SessionState {
  return useSyncExternalStore(subscribeSession, getSession, getSession);
}

/* ---------- export / import sauvegarde complète ---------- */

export function exportBackup(): void {
  const db = getDB();
  const json = JSON.stringify(db, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `sauvegarde-ceg-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importBackup(raw: string): void {
  const parsed = JSON.parse(raw) as Partial<DB>;
  update((db) => {
    // Préserve la session admin actuelle si la sauvegarde n'en contient pas.
    const admin = parsed.admin ?? db.admin;
    return {
      ...db,
      ...parsed,
      admin,
      selection: { ...db.selection, ...parsed.selection },
    };
  });
}
