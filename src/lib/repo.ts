import { all, first, kvGet, remove, save, today, uid } from './db';
import { computeTargets, Activity, Goal, Sex } from './nutrition';

export type Profile = {
  id: string; sex: Sex; age: number; height_cm: number; weight_kg: number; goal: Goal; activity: Activity;
  tdee: number; kcal: number; protein: number; carbs: number; fat: number; keep_awake: number; username?: string | null;
};
export const MEALS = ['PETIT-DEJEUNER', 'DEJEUNER', 'DINER', 'COLLATIONS'] as const;
export type Meal = (typeof MEALS)[number];

export const getProfile = () => first<Profile>('SELECT * FROM profile WHERE deleted=0 LIMIT 1');

export async function saveProfile(p: { sex: Sex; age: number; height_cm: number; weight_kg: number; goal: Goal; activity: Activity }, keepAwake = 1) {
  const t = computeTargets({ sex: p.sex, age: p.age, heightCm: p.height_cm, weightKg: p.weight_kg, goal: p.goal, activity: p.activity });
  const existing = await getProfile();
  // L'ancien id fixe 'me' entrerait en collision entre utilisateurs côté serveur : on le remplace par un uuid.
  const id = existing && existing.id !== 'me' ? existing.id : uid();
  if (existing?.id === 'me') await remove('profile', 'me');
  const username = (await kvGet('pending_username')) ?? existing?.username ?? null;
  await save('profile', { id, username, ...p, tdee: t.tdee, kcal: t.kcal, protein: t.protein, carbs: t.carbs, fat: t.fat, keep_awake: existing?.keep_awake ?? keepAwake });
  await logWeight(p.weight_kg);
}

export async function logWeight(kg: number, date = today()) {
  const ex = await first<{ id: string }>('SELECT id FROM body_weights WHERE date=? AND deleted=0', [date]);
  await save('body_weights', { id: ex?.id, date, weight_kg: kg });
}

export type Entry = { id: string; date: string; meal: Meal; name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number };
export const entriesFor = (date: string) => all<Entry>('SELECT * FROM food_entries WHERE date=? AND deleted=0 ORDER BY updated_at', [date]);

export async function getWater(date: string) {
  return (await first<{ id: string; glasses: number }>('SELECT id,glasses FROM water WHERE date=? AND deleted=0', [date])) ?? { id: undefined, glasses: 0 };
}
export async function setWater(date: string, glasses: number) {
  const w = await getWater(date);
  await save('water', { id: w.id, date, glasses: Math.max(0, glasses) });
}

export type Food = { id: string; name: string; brand: string | null; barcode: string | null; kcal: number; protein: number; carbs: number; fat: number; serving_g: number; custom: number };
export const searchFoods = (q: string) =>
  all<Food>('SELECT * FROM foods WHERE deleted=0 AND (name LIKE ? OR barcode = ?) ORDER BY custom DESC, updated_at DESC LIMIT 50', [`%${q.toUpperCase()}%`, q]);

export type Exercise = { id: string; name: string; muscle: string; equipment: string; compound: number; custom: number };
export const listExercises = () => all<Exercise>('SELECT * FROM exercises WHERE deleted=0 ORDER BY muscle, name');

export type SetRow = { id: string; session_id: string; exercise_id: string; idx: number; weight: number; reps: number; done_at: number };
/** Dernière séance terminée contenant cet exercice -> séries (surcharge progressive). */
export async function lastSets(exerciseId: string, excludeSession?: string): Promise<SetRow[]> {
  const last = await first<{ session_id: string }>(
    'SELECT session_id FROM sets WHERE exercise_id=? AND deleted=0 AND session_id != ? ORDER BY done_at DESC LIMIT 1',
    [exerciseId, excludeSession ?? ''],
  );
  if (!last) return [];
  return all<SetRow>('SELECT * FROM sets WHERE exercise_id=? AND session_id=? AND deleted=0 ORDER BY idx', [exerciseId, last.session_id]);
}

/** Aliments récemment consommés, complétés par les aliments de base. */
export const recentFoods = () =>
  all<Food>(
    `SELECT * FROM foods WHERE deleted=0 ORDER BY
       CASE WHEN name IN (SELECT name FROM food_entries WHERE deleted=0 ORDER BY updated_at DESC LIMIT 30) THEN 0 ELSE 1 END,
       custom DESC, name LIMIT 30`);
