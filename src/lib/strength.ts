/** 1RM estimé : moyenne Epley / Brzycki (Brzycki invalide au-delà de 36 reps). */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  const epley = weight * (1 + reps / 30);
  const brzycki = reps < 37 ? (weight * 36) / (37 - reps) : epley;
  return Math.round(((epley + brzycki) / 2) * 10) / 10;
}

export type SetLike = { weight: number; reps: number };

export function best1RM(sets: SetLike[]): number {
  return sets.reduce((m, s) => Math.max(m, estimate1RM(s.weight, s.reps)), 0);
}

/** Arrondit au pas de disque (2,5 kg par défaut). */
export function roundToPlate(kg: number, step = 2.5): number {
  return Math.round(kg / step) * step;
}
