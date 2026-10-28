import { all, dateKey } from './db';
import { getProfile } from './repo';
import { effectiveE1rm, levelFromXp, rankFor, RankInfo, setXp, standardFor, TIERS } from './rank';
import { Sex } from './nutrition';

export type ExStat = {
  id: string; name: string; muscle: string; equipment: string; compound: number;
  sessions: number; sets: number; maxWeight: number; volume: number; e1rm: number; rank: RankInfo;
};

type Row = { exercise_id: string; session_id: string; weight: number; reps: number; done_at: number; name: string; muscle: string; equipment: string; compound: number };

export async function bodyWeight(): Promise<{ kg: number; sex: Sex }> {
  const p = await getProfile();
  const w = await all<{ weight_kg: number }>('SELECT weight_kg FROM body_weights WHERE deleted=0 ORDER BY date DESC LIMIT 1');
  return { kg: w[0]?.weight_kg ?? p?.weight_kg ?? 75, sex: p?.sex ?? 'M' };
}

const setRows = () =>
  all<Row>(
    `SELECT s.exercise_id,s.session_id,s.weight,s.reps,s.done_at,e.name,e.muscle,e.equipment,e.compound
     FROM sets s JOIN exercises e ON e.id=s.exercise_id WHERE s.deleted=0 ORDER BY s.done_at`);

export async function exerciseStats(): Promise<ExStat[]> {
  const { kg, sex } = await bodyWeight();
  const map = new Map<string, ExStat & { ss: Set<string> }>();
  for (const r of await setRows()) {
    const std = standardFor(r.name, r.equipment, r.compound === 1);
    let e = map.get(r.exercise_id);
    if (!e) {
      e = { id: r.exercise_id, name: r.name, muscle: r.muscle, equipment: r.equipment, compound: r.compound, sessions: 0, sets: 0, maxWeight: 0, volume: 0, e1rm: 0, rank: rankFor(std, 0, kg, sex), ss: new Set() };
      map.set(r.exercise_id, e);
    }
    e.ss.add(r.session_id);
    e.sets += 1;
    e.maxWeight = Math.max(e.maxWeight, r.weight);
    e.volume += r.weight * r.reps;
    e.e1rm = Math.max(e.e1rm, effectiveE1rm(r.weight, r.reps, std, kg));
  }
  return [...map.values()].map(({ ss, ...e }) => {
    const std = standardFor(e.name, e.equipment, e.compound === 1);
    return { ...e, sessions: ss.size, rank: rankFor(std, e.e1rm, kg, sex) };
  });
}

/** Rang par groupe musculaire = moyenne des rangs de ses exercices (meilleurs en premier). */
export function muscleRanks(stats: ExStat[]) {
  const by = new Map<string, number[]>();
  for (const s of stats) by.set(s.muscle, [...(by.get(s.muscle) ?? []), s.rank.index + s.rank.progress]);
  return [...by.entries()].map(([muscle, v]) => {
    const score = v.sort((a, b) => b - a).slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, v.length);
    return { muscle, tier: TIERS[Math.min(TIERS.length - 1, Math.floor(score))], score };
  }).sort((a, b) => b.score - a.score);
}

export async function player() {
  const rows = await setRows();
  const xp = rows.reduce((a, r) => a + setXp(r.weight, r.reps), 0);
  return levelFromXp(xp);
}

type Sess = { id: string; started_at: number; ended_at: number | null };
const sessions = () => all<Sess>('SELECT id,started_at,ended_at FROM sessions WHERE deleted=0 AND ended_at IS NOT NULL');

const mondayOf = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
};

export async function weekActivity() {
  const ss = await sessions();
  const mon = mondayOf(new Date());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon); d.setDate(mon.getDate() + i);
    const key = dateKey(d);
    const day = ss.filter((s) => dateKey(new Date(s.started_at)) === key);
    const mins = day.reduce((a, s) => a + Math.round(((s.ended_at ?? s.started_at) - s.started_at) / 60000), 0);
    return { key, day: d.getDate(), label: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i], mins, done: day.length > 0, today: key === dateKey(new Date()) };
  });
}

export type Perf = { sessions: number; totalMin: number; avgMin: number; diffEx: number; exPerSession: number; avgVolume: number };

/** Statistiques sur la fenêtre [now-(offset+days), now-offset] en jours. */
export async function performance(days: number, offset = 0): Promise<Perf> {
  const end = Date.now() - offset * 86400000, start = end - days * 86400000;
  const ss = (await sessions()).filter((s) => s.started_at >= start && s.started_at < end);
  const ids = new Set(ss.map((s) => s.id));
  const rows = (await setRows()).filter((r) => ids.has(r.session_id));
  const totalMin = ss.reduce((a, s) => a + Math.round(((s.ended_at ?? s.started_at) - s.started_at) / 60000), 0);
  const exPerSess = ss.map((s) => new Set(rows.filter((r) => r.session_id === s.id).map((r) => r.exercise_id)).size);
  const volume = rows.reduce((a, r) => a + r.weight * r.reps, 0);
  const n = ss.length;
  return {
    sessions: n, totalMin, avgMin: n ? Math.round(totalMin / n) : 0,
    diffEx: new Set(rows.map((r) => r.exercise_id)).size,
    exPerSession: n ? Math.round((exPerSess.reduce((a, b) => a + b, 0) / n) * 10) / 10 : 0,
    avgVolume: n ? Math.round(volume / n) : 0,
  };
}

export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}min` : `${m}min`);
