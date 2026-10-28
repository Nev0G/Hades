const store = new Map<string, string>();
jest.mock('../lib/db', () => ({
  kvGet: async (k: string) => store.get(k) ?? null,
  kvSet: async (k: string, v: string) => { store.set(k, v); },
}));

let fetchCalls = 0;
let nextResponse: any;
beforeEach(() => {
  store.clear(); fetchCalls = 0;
  (globalThis as any).fetch = jest.fn(async () => { fetchCalls++; return nextResponse; });
  (globalThis as any).FileReader = class {
    result: string | null = null; onloadend: (() => void) | null = null; onerror: (() => void) | null = null;
    readAsDataURL() { this.result = 'data:image/jpeg;base64,AAAA'; setTimeout(() => this.onloadend?.(), 0); }
  };
});

const ok = (remaining: string) => ({ ok: true, status: 200, headers: { get: (h: string) => ({ 'content-type': 'image/jpeg', 'x-ratelimit-requests-remaining': remaining } as any)[h.toLowerCase()] ?? null }, blob: async () => ({}), text: async () => '' });

import { fetchHeatmapDataUri, QUOTA_FLOOR } from '../lib/muscleApi';

test('télécharge une fois, puis sert le cache sans consommer de quota', async () => {
  nextResponse = ok('59');
  const a = await fetchHeatmapDataUri('https://x/a');
  expect(a).toEqual({ uri: 'data:image/jpeg;base64,AAAA', remaining: 59 });
  const b = await fetchHeatmapDataUri('https://x/a');
  expect(b.uri).toBe(a.uri);
  expect(fetchCalls).toBe(1);
  expect(store.get('muscle_api_remaining')).toBe('59');
});

test('stoppe les appels près de la limite mensuelle', async () => {
  store.set('muscle_api_remaining', String(QUOTA_FLOOR));
  await expect(fetchHeatmapDataUri('https://x/b')).rejects.toThrow(/quota mensuel/);
  expect(fetchCalls).toBe(0);
});

test('erreurs de l\'API : message avec le code HTTP, quota mémorisé quand même', async () => {
  nextResponse = { ok: false, status: 429, headers: { get: (h: string) => (h.toLowerCase() === 'x-ratelimit-requests-remaining' ? '0' : null) }, text: async () => '{"message":"Too many requests"}' };
  await expect(fetchHeatmapDataUri('https://x/c')).rejects.toThrow('HTTP 429 : Too many requests');
  expect(store.get('muscle_api_remaining')).toBe('0');
  nextResponse = { ok: true, status: 200, headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) }, text: async () => '' };
  store.delete('muscle_api_remaining');
  await expect(fetchHeatmapDataUri('https://x/d')).rejects.toThrow(/réponse inattendue/);
});
