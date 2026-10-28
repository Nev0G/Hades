import { getDb } from './db';

const API = 'https://wger.de/api/v2';

// Muscles wger -> groupes HADES
const MUSCLE: Record<number, string> = {
  4: 'PECTORAUX', 3: 'PECTORAUX', 12: 'DOS', 9: 'TRAPEZES', 2: 'EPAULES', 1: 'BICEPS', 13: 'BICEPS', 5: 'TRICEPS',
  10: 'QUADRICEPS', 11: 'ISCHIOS', 8: 'FESSIERS', 7: 'MOLLETS', 15: 'MOLLETS', 6: 'ABDOS', 14: 'ABDOS',
};
const CATEGORY: Record<string, string> = { Abs: 'ABDOS', Arms: 'BICEPS', Back: 'DOS', Calves: 'MOLLETS', Chest: 'PECTORAUX', Legs: 'QUADRICEPS', Shoulders: 'EPAULES', Glutes: 'FESSIERS' };
const EQUIP: Record<number, string> = { 1: 'BARRE', 2: 'BARRE', 3: 'HALTERES', 6: 'POIDS DU CORPS', 7: 'POIDS DU CORPS', 8: 'BARRE', 9: 'BARRE', 10: 'KETTLEBELL', 11: 'ELASTIQUE', 12: 'POULIE', 5: 'POIDS DU CORPS', 4: 'POIDS DU CORPS' };

export type ImportedExercise = { id: string; name: string; muscle: string; equipment: string; compound: number };

/** Transforme une fiche wger (`exerciseinfo`) en exercice HADES ; null si inexploitable. */
export function mapWger(r: any): ImportedExercise | null {
  const tr: { language: number; name: string }[] = r.translations ?? [];
  // Français (12) si dispo, sinon anglais (2), sinon le premier nom.
  const name = (tr.find((t) => t.language === 12) ?? tr.find((t) => t.language === 2) ?? tr[0])?.name?.trim();
  if (!name) return null;
  const primary: number[] = (r.muscles ?? []).map((m: any) => m.id);
  const second: number[] = (r.muscles_secondary ?? []).map((m: any) => m.id);
  const muscle = MUSCLE[primary[0]] ?? CATEGORY[r.category?.name] ?? (second[0] ? MUSCLE[second[0]] : undefined);
  if (!muscle) return null;
  const eq: number[] = (r.equipment ?? []).map((e: any) => e.id);
  const equipment = eq.length ? EQUIP[eq[0]] ?? 'MACHINE' : 'POIDS DU CORPS';
  return { id: `wger-${r.id}`, name: name.toUpperCase(), muscle, equipment, compound: primary.length + second.length >= 3 ? 1 : 0 };
}

/** Importe le catalogue wger (≈900 exercices) dans la base locale. `onProgress(n, total)`. */
export async function importWger(onProgress?: (n: number, total: number) => void): Promise<number> {
  const db = await getDb();
  let url: string | null = `${API}/exerciseinfo/?language=2&limit=100`;
  let done = 0, total = 0, added = 0;
  const seen = new Set((await db.getAllAsync<{ name: string }>('SELECT name FROM exercises')).map((r) => r.name));
  while (url) {
    const res: Response = await fetch(url);
    if (!res.ok) throw new Error(`WGER ${res.status}`);
    const j: any = await res.json();
    total = j.count;
    const rows = (j.results as any[]).map(mapWger).filter((x): x is ImportedExercise => !!x && !seen.has(x.name));
    await db.withTransactionAsync(async () => {
      for (const e of rows) {
        seen.add(e.name);
        await db.runAsync('INSERT OR IGNORE INTO exercises(id,name,muscle,equipment,compound,custom,updated_at) VALUES(?,?,?,?,?,0,0)', [e.id, e.name, e.muscle, e.equipment, e.compound]);
        added++;
      }
    });
    done += j.results.length;
    onProgress?.(done, total);
    url = j.next ? String(j.next).replace(/^http:/, 'https:') : null;
  }
  return added;
}
