import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DashboardSpec } from "@gendash/spec";

/**
 * File-backed store for saved/shared dashboards. Durable across restarts, no
 * external DB. A saved record is self-contained: if it came from an uploaded
 * CSV, the CSV travels with it so the shared link renders the same data.
 * (Swap for Postgres when the DB milestone lands.)
 */
const DIR = path.join(process.cwd(), "data", "saved");
const ID_RE = /^[A-Za-z0-9_-]{6,24}$/;

export interface SavedDashboard {
  id: string;
  title: string;
  question: string;
  spec: DashboardSpec;
  createdAt: string;
  data?: { table: string; csv: string };
}

function newId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  ).slice(-10);
}

export async function saveDashboard(rec: Omit<SavedDashboard, "id" | "createdAt">): Promise<string> {
  await mkdir(DIR, { recursive: true });
  const id = newId();
  const full: SavedDashboard = { ...rec, id, createdAt: new Date().toISOString() };
  await writeFile(path.join(DIR, `${id}.json`), JSON.stringify(full), "utf8");
  return id;
}

export async function getDashboard(id: string): Promise<SavedDashboard | null> {
  if (!ID_RE.test(id)) return null; // guard against path traversal
  try {
    const text = await readFile(path.join(DIR, `${id}.json`), "utf8");
    return JSON.parse(text) as SavedDashboard;
  } catch {
    return null;
  }
}
