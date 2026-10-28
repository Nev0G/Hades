import { estimate1RM } from './strength';
import { Sex } from './nutrition';

export const TIERS = ['WOOD', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'CHAMPION', 'TITAN', 'OLYMPIAN'] as const;
export type Tier = (typeof TIERS)[number];

export const TIER_COLOR: Record<Tier, string> = {
  WOOD: '#8B6B4A', BRONZE: '#CD7F32', SILVER: '#C0C7D1', GOLD: '#FFD60A', PLATINUM: '#4FD1C5',
  DIAMOND: '#7C8CFF', CHAMPION: '#C084FC', TITAN: '#FF453A', OLYMPIAN: '#5EEAD4',
};

/** Seuils (1RM / poids de corps, homme) pour chaque rang. */
const BENCH = [0, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25];
const SQUAT = [0, 0.75, 1.0, 1.5, 1.75, 2.0, 2.5, 2.75, 3.0];
const DEAD = [0, 1.0, 1.25, 1.75, 2.0, 2.5, 2.75, 3.0, 3.5];
const OHP = [0, 0.35, 0.5, 0.7, 0.85, 1.0, 1.25, 1.4, 1.5];
const PULL = [0, 0.4, 0.6, 0.85, 1.1, 1.3, 1.5, 1.7, 1.9];
const BW = [0, 1.0, 1.1, 1.25, 1.4, 1.55, 1.7, 1.85, 2.0]; // (poids de corps + charge) / poids de corps
const ISO = [0, 0.1, 0.2, 0.35, 0.5, 0.65, 0.8, 0.95, 1.1];
const scale = (t: number[], k: number) => t.map((v) => v * k);

export type Standard = { thresholds: number[]; bodyweight: boolean };

/** Rattache un exercice à une table de référence (par nom, sinon polyarticulaire / isolation). */
export function standardFor(name: string, equipment: string, compound: boolean): Standard {
  const n = name.toUpperCase();
  const bodyweight = equipment === 'POIDS DU CORPS' && !/CRUNCH|GAINAGE/.test(n);
  if (bodyweight) return { thresholds: BW, bodyweight: true };
  if (/CRUNCH|GAINAGE/.test(n)) return { thresholds: ISO, bodyweight: false };
  if (/ROUMAIN/.test(n)) return { thresholds: scale(DEAD, 0.8), bodyweight: false };
  if (/TERRE|HIP THRUST/.test(n)) return { thresholds: DEAD, bodyweight: false };
  if (/PRESSE/.test(n)) return { thresholds: scale(SQUAT, 1.6), bodyweight: false };
  if (/SQUAT/.test(n)) return { thresholds: SQUAT, bodyweight: false };
  if (/MILITAIRE/.test(n)) return { thresholds: OHP, bodyweight: false };
  if (/COUCHE/.test(n)) return { thresholds: BENCH, bodyweight: false };
  if (/INCLINE/.test(n)) return { thresholds: scale(BENCH, 0.85), bodyweight: false };
  if (/ROWING|TIRAGE/.test(n)) return { thresholds: PULL, bodyweight: false };
  return { thresholds: compound ? scale(BENCH, 0.8) : ISO, bodyweight: false };
}

export type RankInfo = { tier: Tier; index: number; progress: number; nextKg: number | null; e1rm: number };

export function rankFor(std: Standard, e1rm: number, bodyKg: number, sex: Sex): RankInfo {
  const f = sex === 'F' ? 0.65 : 1;
  const bw = Math.max(1, bodyKg);
  // Poids de corps : on compare (poids de corps + charge) / poids de corps ; sinon charge / poids de corps.
  const ratio = e1rm / bw;
  const t = std.thresholds.map((v, i) => (std.bodyweight ? (i === 0 ? 0 : 1 + (v - 1) * f) : v * f));
  let idx = 0;
  for (let i = 0; i < t.length; i++) if (ratio >= t[i]) idx = i;
  const next = t[idx + 1];
  const progress = next === undefined ? 1 : Math.min(1, Math.max(0, (ratio - t[idx]) / (next - t[idx])));
  const nextKg = next === undefined ? null : Math.round(next * bw * 10) / 10;
  return { tier: TIERS[idx], index: idx, progress, nextKg, e1rm };
}

/** Charge effective d'une série : poids de corps + lest pour les exos au poids du corps. */
export function effectiveE1rm(weight: number, reps: number, std: Standard, bodyKg: number) {
  return estimate1RM(std.bodyweight ? bodyKg + weight : weight, reps);
}

// ---- Progression joueur ----
export const setXp = (weight: number, reps: number) => 10 + Math.round((weight * reps) / 50);

export function levelFromXp(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 60)) + 1;
  const base = 60 * (level - 1) ** 2;
  const next = 60 * level ** 2;
  return { level, xp, base, next, progress: (xp - base) / (next - base) };
}

// ---- Rang par muscle (façon Liftoff) ----
/** Score d'un muscle = moyenne entre son meilleur exercice et la moyenne de ses 3 meilleurs (index + progression). */
export function muscleScore(exerciseScores: number[]): number | null {
  if (!exerciseScores.length) return null;
  const s = [...exerciseScores].sort((a, b) => b - a);
  const top = s.slice(0, 3);
  return (s[0] + top.reduce((a, b) => a + b, 0) / top.length) / 2;
}
export const tierOfScore = (score: number): Tier => TIERS[Math.min(TIERS.length - 1, Math.max(0, Math.floor(score)))];
/** Rang global = moyenne de tous les muscles (un muscle jamais travaillé compte 0). */
export const overallScore = (scores: (number | null)[]) => (scores.length ? scores.reduce<number>((a, b) => a + (b ?? 0), 0) / scores.length : 0);
