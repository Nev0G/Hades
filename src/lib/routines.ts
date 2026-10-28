import { all, first, remove, save, uid } from './db';

export type RoutineInfo = {
  id: string; name: string; program_id: string; programName: string; fav: number; created_at: number;
  exercises: number; lastDone: number | null; uses: number; muscles: string[];
};
export type FolderInfo = { id: string; name: string; fav: number; created_at: number; routines: number; lastDone: number | null; uses: number };
export type SortKey = 'recent' | 'az' | 'used' | 'exercises' | 'created';
export const SORT_KEYS: SortKey[] = ['recent', 'az', 'used', 'exercises', 'created'];
export const SORT_LABEL: Record<SortKey, string> = { recent: 'Récent', az: 'A → Z', used: 'Plus utilisées', exercises: 'Nb d\'exercices', created: 'Création' };

const cmpDate = (a: number | null, b: number | null) => (b ?? -1) - (a ?? -1);

export function sortRoutines<T extends { name: string; created_at: number; lastDone: number | null; uses: number; exercises?: number }>(list: T[], key: SortKey): T[] {
  const by: Record<SortKey, (a: T, b: T) => number> = {
    recent: (a, b) => cmpDate(a.lastDone, b.lastDone) || b.created_at - a.created_at,
    az: (a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }),
    used: (a, b) => b.uses - a.uses || cmpDate(a.lastDone, b.lastDone),
    exercises: (a, b) => (b.exercises ?? 0) - (a.exercises ?? 0) || a.name.localeCompare(b.name),
    created: (a, b) => b.created_at - a.created_at,
  };
  return [...list].sort(by[key]);
}

/** Couleur stable d'une routine (tuile à initiales). */
const TILES = ['#E67E22', '#5B5675', '#1E9A84', '#B98B86', '#8E5BD9', '#C0506B', '#7A9A3A', '#A0722D'];
export const tileColor = (name: string) => TILES[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % TILES.length];
export const initials = (name: string) => (name.trim().slice(0, 2) || '?').replace(/^./, (c) => c.toUpperCase());

export async function listRoutines(): Promise<RoutineInfo[]> {
  const days = await all<{ id: string; name: string; program_id: string | null; fav: number | null; created_at: number | null; pname: string | null }>(
    `SELECT d.id,d.name,d.program_id,d.fav,d.created_at,p.name pname FROM program_days d LEFT JOIN programs p ON p.id=d.program_id AND p.deleted=0 WHERE d.deleted=0`);
  const ex = await all<{ day_id: string; muscle: string }>(
    `SELECT pe.day_id,e.muscle FROM program_exercises pe JOIN exercises e ON e.id=pe.exercise_id WHERE pe.deleted=0`);
  const ss = await all<{ day_id: string; n: number; last: number }>(
    `SELECT day_id,COUNT(*) n,MAX(started_at) last FROM sessions WHERE deleted=0 AND ended_at IS NOT NULL GROUP BY day_id`);
  return days.map((d) => {
    const mine = ex.filter((e) => e.day_id === d.id);
    const s = ss.find((x) => x.day_id === d.id);
    return {
      id: d.id, name: d.name, program_id: d.program_id ?? '', programName: d.pname ?? '', fav: d.fav ?? 0, created_at: d.created_at ?? 0,
      exercises: mine.length, lastDone: s?.last ?? null, uses: s?.n ?? 0, muscles: mine.map((e) => e.muscle),
    };
  });
}

export async function listFolders(): Promise<FolderInfo[]> {
  const progs = await all<{ id: string; name: string; fav: number | null; created_at: number | null }>('SELECT id,name,fav,created_at FROM programs WHERE deleted=0');
  const routines = await listRoutines();
  return progs.map((p) => {
    const mine = routines.filter((r) => r.program_id === p.id);
    return { id: p.id, name: p.name, fav: p.fav ?? 0, created_at: p.created_at ?? 0, routines: mine.length, lastDone: mine.reduce<number | null>((a, r) => Math.max(a ?? 0, r.lastDone ?? 0) || null, null), uses: mine.reduce((a, r) => a + r.uses, 0) };
  });
}

export const createFolder = (name: string) => save('programs', { name: name.trim(), fav: 0, created_at: Date.now() });
export async function renameFolder(id: string, name: string) {
  const r = await first<Record<string, unknown>>('SELECT * FROM programs WHERE id=?', [id]);
  if (r) await save('programs', { ...r, name: name.trim() });
}
/** Supprime le dossier ; ses routines sont conservées (sans dossier). */
export async function deleteFolder(id: string) {
  for (const d of await all<Record<string, unknown>>('SELECT * FROM program_days WHERE program_id=? AND deleted=0', [id])) await save('program_days', { ...d, program_id: '' });
  await remove('programs', id);
}
export const createRoutine = async (name: string, programId = '') => {
  const n = (await all<{ id: string }>('SELECT id FROM program_days WHERE program_id=? AND deleted=0', [programId])).length;
  return save('program_days', { program_id: programId, name: name.trim(), pos: n, fav: 0, created_at: Date.now() });
};
async function patchRoutine(id: string, patch: Record<string, unknown>) {
  const r = await first<Record<string, unknown>>('SELECT * FROM program_days WHERE id=?', [id]);
  if (r) await save('program_days', { ...r, ...patch });
}
export const renameRoutine = (id: string, name: string) => patchRoutine(id, { name: name.trim() });
export const moveRoutine = (id: string, programId: string) => patchRoutine(id, { program_id: programId });
export const toggleRoutineFav = async (id: string) => patchRoutine(id, { fav: (await first<{ fav: number }>('SELECT fav FROM program_days WHERE id=?', [id]))?.fav ? 0 : 1 });
export const deleteRoutine = (id: string) => remove('program_days', id);

export async function duplicateRoutine(id: string): Promise<string | null> {
  const r = await first<{ name: string; program_id: string }>('SELECT name,program_id FROM program_days WHERE id=?', [id]);
  if (!r) return null;
  const nid = await createRoutine(`${r.name} (copie)`, r.program_id ?? '');
  for (const pe of await all<Record<string, unknown>>('SELECT * FROM program_exercises WHERE day_id=? AND deleted=0', [id])) {
    await save('program_exercises', { ...pe, id: uid(), day_id: nid });
  }
  return nid;
}
