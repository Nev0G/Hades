// Carte musculaire : images libres de wger (https://wger.de, CC-BY-SA 4.0), intégrées à l'app (assets/muscles).
// Chaque muscle est une image transparente de la même taille que la silhouette : on les superpose et on les teinte.

/** Identifiants de muscles wger à colorer pour chacun de nos groupes, par vue. */
export const VIEWS: Record<'front' | 'back', Record<string, number[]>> = {
  front: { PECTORAUX: [4], EPAULES: [2], BICEPS: [1, 13], ABDOS: [6, 14], QUADRICEPS: [10] },
  back: { TRAPEZES: [9], DOS: [12], TRICEPS: [5], FESSIERS: [8], ISCHIOS: [11], MOLLETS: [7, 15] },
};

export type MuscleColor = { muscle: string; color: string };
export type Layer = { id: number; color: string };

/** Calques à dessiner pour une vue : un par image de muscle, avec la couleur du groupe. */
export function layersFor(view: 'front' | 'back', items: MuscleColor[]): Layer[] {
  const out: Layer[] = [];
  for (const it of items) for (const id of VIEWS[view][it.muscle] ?? []) out.push({ id, color: it.color });
  return out;
}

/** Groupes sans image dans wger (non colorés sur la silhouette). */
export const UNMAPPED = ['AVANT-BRAS'];

export const WGER_CREDIT = 'Images musculaires : wger.de, licence CC-BY-SA 4.0';
