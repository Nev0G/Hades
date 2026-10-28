// Visualisation musculaire : API « Muscle Visualizer » d'ExerciseDB (via RapidAPI) quand une clé est fournie,
// sinon (ou en cas d'erreur) silhouette hors-ligne. https://github.com/ExerciseDB/muscle-visualizer-api
export const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
export const muscleApiEnabled = !!RAPIDAPI_KEY;
const HOST = 'muscle-visualizer-api.p.rapidapi.com';
const BASE = `https://${HOST}/v1`;
export const apiHeaders = () => ({ 'X-RapidAPI-Key': RAPIDAPI_KEY ?? '', 'X-RapidAPI-Host': HOST });

/** Noms possibles côté API pour chacun de nos groupes (le premier présent dans /v1/muscles est retenu). */
export const API_CANDIDATES: Record<string, string[]> = {
  PECTORAUX: ['chest', 'pectorals', 'pecs'],
  DOS: ['lats', 'latissimus dorsi', 'upper back', 'back', 'middle back'],
  EPAULES: ['shoulders', 'delts', 'deltoids'],
  TRAPEZES: ['traps', 'trapezius'],
  BICEPS: ['biceps'],
  TRICEPS: ['triceps'],
  'AVANT-BRAS': ['forearms'],
  ABDOS: ['abs', 'abdominals'],
  QUADRICEPS: ['quads', 'quadriceps'],
  ISCHIOS: ['hamstrings'],
  FESSIERS: ['glutes'],
  MOLLETS: ['calves'],
};

/** Extrait les noms de muscles d'une réponse /v1/muscles (tableau de chaînes ou d'objets, éventuellement sous `data`). */
export function parseMuscleNames(json: any): string[] {
  const arr: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : Array.isArray(json?.muscles) ? json.muscles : [];
  return arr.map((x) => (typeof x === 'string' ? x : x?.name ?? x?.id ?? '')).map((s) => String(s).toLowerCase()).filter(Boolean);
}

/** Associe nos groupes aux noms valides de l'API. */
export function mapMuscles(ours: string[], available: string[]): string[] {
  const out: string[] = [];
  for (const m of ours) {
    const hit = (API_CANDIDATES[m] ?? []).find((c) => available.includes(c));
    if (hit && !out.includes(hit)) out.push(hit);
  }
  return out;
}

let cache: string[] | null = null;
export async function availableMuscles(): Promise<string[]> {
  if (cache) return cache;
  const res = await fetch(`${BASE}/muscles`, { headers: apiHeaders() });
  if (!res.ok) throw new Error(`muscle-visualizer ${res.status}`);
  return (cache = parseMuscleNames(await res.json()));
}

/** URL de l'image (surbrillance d'une couleur sur les muscles donnés). */
export const highlightUrl = (apiMuscles: string[], color: string) =>
  `${BASE}/visualize/muscles?muscles=${apiMuscles.map(encodeURIComponent).join(',')}&color=${encodeURIComponent(color)}`;
