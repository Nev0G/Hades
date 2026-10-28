// Visualisation musculaire : API « Muscle Visualizer » d'ExerciseDB (via RapidAPI) quand une clé est fournie,
// sinon (ou en cas d'erreur / quota) silhouette hors-ligne. https://github.com/ExerciseDB/muscle-visualizer-api
// Chemins et paramètres vérifiés contre l'API réelle : base /api/v1, /muscles, /visualize/heatmap (une couleur par muscle).
// Plan gratuit : format jpeg et taille small uniquement, fond blanc.
export const RAPIDAPI_KEY = process.env.EXPO_PUBLIC_RAPIDAPI_KEY;
export const muscleApiEnabled = !!RAPIDAPI_KEY;
const HOST = 'muscle-visualizer-api.p.rapidapi.com';
const BASE = `https://${HOST}/api/v1`;
export const apiHeaders = () => ({ 'X-RapidAPI-Key': RAPIDAPI_KEY ?? '', 'X-RapidAPI-Host': HOST });

/** Noms de l'API (majuscules) pour chacun de nos groupes ; tous ceux présents dans /muscles sont colorés. */
export const API_GROUPS: Record<string, string[]> = {
  PECTORAUX: ['CHEST'],
  DOS: ['LATS', 'UPPER BACK'],
  EPAULES: ['DELTOIDS'],
  TRAPEZES: ['TRAPS'],
  BICEPS: ['BICEPS'],
  TRICEPS: ['TRICEPS'],
  'AVANT-BRAS': ['FOREARMS'],
  ABDOS: ['ABS'],
  QUADRICEPS: ['QUADS'],
  ISCHIOS: ['HAMSTRINGS'],
  FESSIERS: ['GLUTES'],
  MOLLETS: ['CALVES'],
};

/** Extrait les noms de muscles d'une réponse /muscles (`{ success, data: [...] }`, ou tableau brut). */
export function parseMuscleNames(json: any): string[] {
  const arr: any[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : Array.isArray(json?.muscles) ? json.muscles : [];
  return arr.map((x) => (typeof x === 'string' ? x : x?.name ?? x?.id ?? '')).map((s) => String(s).toUpperCase()).filter(Boolean);
}

export type MuscleColor = { muscle: string; color: string };

/** Associe (muscle HADES, couleur) -> listes parallèles (muscle API, couleur) ; ignore les noms absents de l'API. */
export function toApiParams(items: MuscleColor[], available: string[]): { muscles: string[]; colors: string[] } {
  const seen = new Map<string, string>();
  for (const it of items) for (const name of API_GROUPS[it.muscle] ?? []) if (available.includes(name)) seen.set(name, it.color);
  return { muscles: [...seen.keys()], colors: [...seen.values()] };
}

let cache: string[] | null = null;
export async function availableMuscles(): Promise<string[]> {
  if (cache) return cache;
  const res = await fetch(`${BASE}/muscles`, { headers: apiHeaders() });
  if (!res.ok) throw new Error(`muscle-visualizer ${res.status}`);
  return (cache = parseMuscleNames(await res.json()));
}

/** Image anatomique face + dos, une couleur par muscle. */
export const heatmapUrl = (muscles: string[], colors: string[]) =>
  `${BASE}/visualize/heatmap?muscles=${muscles.map(encodeURIComponent).join(',')}&colors=${colors.map(encodeURIComponent).join(',')}&size=small&format=jpeg`;
