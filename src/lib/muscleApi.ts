// Visualisation musculaire : API « Muscle Visualizer » d'ExerciseDB (via RapidAPI) quand une clé est fournie,
// sinon (ou en cas d'erreur / quota) silhouette hors-ligne. https://github.com/ExerciseDB/muscle-visualizer-api
// Chemins et paramètres vérifiés contre l'API réelle : base /api/v1, /muscles, /visualize/heatmap (une couleur par muscle).
// Plan gratuit : format jpeg et taille small uniquement, fond blanc.
import { kvGet, kvSet } from './db';

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

/** Noms API de tous nos groupes (vérifiés présents dans GET /muscles) : évite un appel réseau par affichage. */
export const ALL_API_NAMES = [...new Set(Object.values(API_GROUPS).flat())];

/** Image anatomique face + dos, une couleur par muscle. */
export const heatmapUrl = (muscles: string[], colors: string[]) =>
  `${BASE}/visualize/heatmap?muscles=${muscles.map(encodeURIComponent).join(',')}&colors=${colors.map(encodeURIComponent).join(',')}&size=small&format=jpeg`;

/** Message lisible d'une réponse d'erreur de l'API (corps JSON `{ error: { message } }` ou `{ message }`). */
export function apiErrorMessage(status: number, body: string): string {
  let msg = body.slice(0, 120);
  try { const j = JSON.parse(body); msg = j?.error?.message ?? j?.message ?? msg; } catch { /* corps non JSON */ }
  return `HTTP ${status}${msg ? ` : ${String(msg).slice(0, 120)}` : ''}`;
}

const inflight = new Map<string, Promise<MuscleImage>>();
export type MuscleImage = { uri: string; remaining: number | null };

/** Sous ce nombre de requêtes restantes ce mois-ci (plan gratuit : 100/mois), on n'appelle plus l'API. */
export const QUOTA_FLOOR = 5;

/**
 * Télécharge l'image (en-têtes RapidAPI inclus) et la renvoie en data-URI, avec cache local :
 * une même combinaison de couleurs ne consomme le quota de l'API qu'une seule fois.
 * Le quota restant (en-tête x-ratelimit-requests-remaining) est mémorisé et protégé par QUOTA_FLOOR.
 */
export function fetchHeatmapDataUri(url: string): Promise<MuscleImage> {
  const hit = inflight.get(url);
  if (hit) return hit;
  const p = (async (): Promise<MuscleImage> => {
    const stored = await kvGet('muscle_api_remaining');
    const remainingKnown = stored === null || stored === '' ? null : Number(stored);
    const cached = await kvGet(`muscleimg:${url}`);
    if (cached) return { uri: cached, remaining: remainingKnown };
    if (remainingKnown !== null && remainingKnown <= QUOTA_FLOOR) throw new Error(`quota mensuel de l'API presque épuisé (${remainingKnown} restantes)`);
    const res = await fetch(url, { headers: apiHeaders() });
    const header = res.headers.get('x-ratelimit-requests-remaining');
    const remaining = header !== null && header !== '' && Number.isFinite(Number(header)) ? Number(header) : remainingKnown;
    if (remaining !== null) await kvSet('muscle_api_remaining', String(remaining));
    if (!res.ok) throw new Error(apiErrorMessage(res.status, await res.text()));
    const type = res.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) throw new Error(`réponse inattendue (${type || 'sans type'})`);
    const blob = await res.blob();
    const dataUri = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onloadend = () => (typeof r.result === 'string' ? resolve(r.result) : reject(new Error('lecture impossible')));
      r.onerror = () => reject(new Error('lecture impossible'));
      r.readAsDataURL(blob);
    });
    await kvSet(`muscleimg:${url}`, dataUri);
    return { uri: dataUri, remaining };
  })().finally(() => inflight.delete(url));
  inflight.set(url, p);
  return p;
}
