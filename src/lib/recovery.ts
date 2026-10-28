// Récupération musculaire : estimation à partir des séries réalisées (pas une mesure physiologique).

/** Durée de récupération de base (heures) par groupe musculaire. */
export const RECOVERY_HOURS: Record<string, number> = {
  PECTORAUX: 72, DOS: 72, QUADRICEPS: 72, ISCHIOS: 72, FESSIERS: 72,
  EPAULES: 48, TRAPEZES: 48, BICEPS: 48, TRICEPS: 48,
  'AVANT-BRAS': 36, ABDOS: 36, MOLLETS: 36,
};

export type RecSet = { muscle: string; exercise: string; done_at: number };
export type RecState = 'fatigue' | 'recovering' | 'ready' | 'rested';
export type Recovery = { muscle: string; pct: number; state: RecState; hoursLeft: number; lastTrained: number | null; load: number };

export const STATE_COLOR: Record<RecState, string> = { fatigue: '#FF453A', recovering: '#FF9F0A', ready: '#34C759', rested: '#34C759' };
export const STATE_LABEL: Record<RecState, string> = { fatigue: 'Fatigué', recovering: 'En récupération', ready: 'Prêt', rested: 'Frais' };

/** Muscles sollicités en renfort (poids 0,5) selon le mouvement. */
export function secondaryMuscles(name: string, muscle: string): string[] {
  const n = name.toUpperCase();
  const out: string[] = [];
  if (/COUCHE|DEVELOPPE (INCLINE|DECLINE)|DIPS|POMPES|PEC|CHEST/.test(n)) out.push('TRICEPS', 'EPAULES');
  if (/MILITAIRE|ARNOLD|SHOULDER PRESS|PUSH PRESS|DEVELOPPE EPAULES/.test(n)) out.push('TRICEPS');
  if (/ROWING|TIRAGE|TRACTIONS|PULL/.test(n) && !/FACE PULL/.test(n)) out.push('BICEPS');
  if (/SQUAT|PRESSE|FENTES|HACK|STEP UP/.test(n)) out.push('FESSIERS');
  if (/TERRE|GOOD MORNING/.test(n)) out.push('DOS', 'FESSIERS', 'AVANT-BRAS');
  if (/HIP THRUST|PONT FESSIER/.test(n)) out.push('ISCHIOS');
  return out.filter((m) => m !== muscle);
}

const DAY = 24 * 3600 * 1000;

export function computeRecovery(sets: RecSet[], now: number, muscles = Object.keys(RECOVERY_HOURS)): Recovery[] {
  // charge pondérée (heure, poids) par muscle
  const by = new Map<string, { t: number; w: number }[]>();
  for (const s of sets) {
    if (s.done_at > now) continue;
    const push = (m: string, w: number) => by.set(m, [...(by.get(m) ?? []), { t: s.done_at, w }]);
    push(s.muscle, 1);
    for (const m of secondaryMuscles(s.exercise, s.muscle)) push(m, 0.5);
  }
  return muscles.map((muscle) => {
    const list = by.get(muscle) ?? [];
    if (!list.length) return { muscle, pct: 100, state: 'rested' as RecState, hoursLeft: 0, lastTrained: null, load: 0 };
    const last = Math.max(...list.map((x) => x.t));
    const load = list.filter((x) => x.t > last - DAY).reduce((a, x) => a + x.w, 0); // dernière séance
    const need = (RECOVERY_HOURS[muscle] ?? 48) * Math.min(1.6, Math.max(0.7, 0.7 + load / 10));
    const since = (now - last) / 3600000;
    const pct = Math.min(100, Math.round((since / need) * 100));
    const state: RecState = pct >= 100 ? (now - last > 7 * DAY ? 'rested' : 'ready') : pct >= 50 ? 'recovering' : 'fatigue';
    return { muscle, pct, state, hoursLeft: Math.max(0, Math.ceil(need - since)), lastTrained: last, load: Math.round(load * 10) / 10 };
  });
}

/** Disponibilité d'une routine = moyenne de récupération de ses muscles (pondérée par le nombre d'exercices). */
export function readiness(muscles: string[], rec: Recovery[]): number {
  if (!muscles.length) return 100;
  const by = new Map(rec.map((r) => [r.muscle, r.pct]));
  return Math.round(muscles.reduce((a, m) => a + (by.get(m) ?? 100), 0) / muscles.length);
}

export const fmtHours = (h: number) => (h >= 24 ? `${Math.floor(h / 24)} j ${h % 24 ? `${h % 24} h` : ''}`.trim() : `${h} h`);
