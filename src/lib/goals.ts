import { kvGet, kvSet } from './db';

export type Goals = { water: number; sessionsPerWeek: number; targetWeight: number | null };
const DEFAULTS: Goals = { water: 8, sessionsPerWeek: 3, targetWeight: null };

export async function getGoals(): Promise<Goals> {
  const w = await kvGet('goal_water'), s = await kvGet('goal_sessions'), t = await kvGet('goal_weight');
  return { water: w ? Number(w) : DEFAULTS.water, sessionsPerWeek: s ? Number(s) : DEFAULTS.sessionsPerWeek, targetWeight: t ? Number(t) : null };
}
export async function setGoals(g: Goals) {
  await kvSet('goal_water', String(g.water));
  await kvSet('goal_sessions', String(g.sessionsPerWeek));
  await kvSet('goal_weight', g.targetWeight ? String(g.targetWeight) : '');
}

// ---- Calculs de macros (objectifs personnalisables) ----
export const macroKcal = (p: number, c: number, f: number) => Math.round(p * 4 + c * 4 + f * 9);
/** Glucides qui comblent les calories restantes une fois protéines et lipides fixés. */
export const balanceCarbs = (kcal: number, p: number, f: number) => Math.max(0, Math.round((kcal - p * 4 - f * 9) / 4));
/** Répartition en pourcentages des calories -> grammes (somme normalisée à 100 %). */
export function splitFromPercent(kcal: number, pct: { p: number; c: number; f: number }) {
  const t = pct.p + pct.c + pct.f || 1;
  return { protein: Math.round(((kcal * pct.p) / t) / 4), carbs: Math.round(((kcal * pct.c) / t) / 4), fat: Math.round(((kcal * pct.f) / t) / 9) };
}
