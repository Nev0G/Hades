const calls: { url: string; init: any }[] = [];
let responses: any[] = [];

jest.mock('../lib/auth', () => ({
  cloudEnabled: true,
  supabase: { url: 'https://x.supabase.co', key: 'anon' },
  getValidToken: async () => 'tok',
  getSession: async () => ({ token: 'tok', email: 'a@b.co', userId: 'me-id', username: 'alice' }),
  decodeJwt: () => ({ sub: 'me-id' }),
}));
jest.mock('../lib/repo', () => ({
  getProfile: async () => ({ display_name: 'Alice', bio: 'Je soulève', avatar: '💪', avatar_color: '#E5383B', title: 'Rat de salle' }),
}));
jest.mock('../lib/stats', () => ({
  challengeScore: async () => 42,
  publicSummary: async () => ({ xp: 100, level: 2, week_xp: 30, rank_index: 3, rank_score: 3.4, muscle_ranks: { PECTORAUX: 4.1 } }),
}));

import * as S from '../lib/social';

beforeEach(() => {
  calls.length = 0;
  responses = [];
  (globalThis as any).fetch = jest.fn(async (url: string, init: any) => {
    calls.push({ url, init });
    const r = responses.shift() ?? { ok: true, body: '' };
    return { ok: r.ok ?? true, text: async () => (r.body === undefined ? '' : typeof r.body === 'string' ? r.body : JSON.stringify(r.body)) };
  });
});

test('classement amis : filtre sur toi + amis acceptés uniquement', async () => {
  responses = [
    { body: [{ id: '1', requester: 'me-id', addressee: 'bob', status: 'accepted' }, { id: '2', requester: 'carl', addressee: 'me-id', status: 'accepted' }, { id: '3', requester: 'zed', addressee: 'me-id', status: 'pending' }] },
    { body: [] },
  ];
  await S.leaderboard('friends');
  expect(calls[1].url).toBe('https://x.supabase.co/rest/v1/public_profiles?select=*&user_id=in.(me-id,bob,carl)&order=xp.desc&limit=50');
  expect(calls[1].init.headers.Authorization).toBe('Bearer tok');
  expect(calls[1].init.headers.apikey).toBe('anon');
});

test('classement global / semaine', async () => {
  responses = [{ body: [] }, { body: [] }];
  await S.leaderboard('global');
  await S.leaderboard('week');
  expect(calls[0].url).toContain('order=xp.desc');
  expect(calls[1].url).toContain('order=week_xp.desc');
});

test('pushStats : upsert du profil public puis score des défis actifs', async () => {
  const now = Date.now();
  responses = [
    { body: '' },
    { body: [{ challenge_id: 'c1' }, { challenge_id: 'c2' }] },
    { body: [{ id: 'c1', metric: 'xp', start_at: now - 1000, end_at: now + 100000 }, { id: 'c2', metric: 'volume', start_at: 0, end_at: 5 }] },
    { body: '' },
  ];
  await S.pushStats('alice');
  const up = calls[0];
  expect(up.url).toContain('public_profiles?on_conflict=user_id');
  expect(up.init.headers.Prefer).toContain('merge-duplicates');
  const body = JSON.parse(up.init.body);
  expect(body).toMatchObject({ user_id: 'me-id', username: 'alice', xp: 100, rank_index: 3, display_name: 'Alice', bio: 'Je soulève', avatar: '💪', avatar_color: '#E5383B', title: 'Rat de salle' });
  // un seul PATCH : le défi c2 est terminé
  const patches = calls.filter((c) => c.init.method === 'PATCH');
  expect(patches).toHaveLength(1);
  expect(patches[0].url).toContain('challenge_members?challenge_id=eq.c1&user_id=eq.me-id');
  expect(JSON.parse(patches[0].init.body).score).toBe(42);
});

test('création de défi : défi + inscription du créateur', async () => {
  responses = [{ body: [{ id: 'c9', code: 'ABC123', is_public: false }] }, { body: '' }];
  const c = await S.createChallenge({ title: ' Volume ', metric: 'volume', days: 7, isPublic: false }, 'alice');
  expect(c.code).toBe('ABC123');
  const b = JSON.parse(calls[0].init.body);
  expect(b.title).toBe('Volume');
  expect(b.end_at - b.start_at).toBe(7 * 86400000);
  expect(JSON.parse(calls[1].init.body)).toEqual({ challenge_id: 'c9', username: 'alice' });
});

test('rejoindre par code via RPC, code normalisé', async () => {
  responses = [{ body: '"uuid"' }];
  await S.joinByCode(' abc123 ');
  expect(calls[0].url).toBe('https://x.supabase.co/rest/v1/rpc/join_challenge');
  expect(JSON.parse(calls[0].init.body)).toEqual({ p_code: 'ABC123' });
});

test('erreurs serveur lisibles', async () => {
  responses = [{ ok: false, body: { message: 'duplicate key value violates unique constraint', code: '23505' } }];
  await expect(S.sendFriendRequest('bob')).rejects.toThrow(/Déjà existant/);
  responses = [{ ok: false, body: { message: 'DEFI INTROUVABLE OU TERMINE' } }];
  await expect(S.joinByCode('zzz')).rejects.toThrow('DEFI INTROUVABLE OU TERMINE');
});

test('recherche : saisie nettoyée, soi-même exclu', async () => {
  responses = [{ body: [{ user_id: 'me-id', username: 'alice' }, { user_id: 'b', username: 'alicia' }] }];
  const r = await S.searchUsers('Ali%');
  expect(calls[0].url).toContain('username=ilike.*ali*');
  expect(r.map((x) => x.username)).toEqual(['alicia']);
  expect(await S.searchUsers('a')).toEqual([]);
});

test('profil d\'un joueur par id', async () => {
  responses = [{ body: [{ user_id: 'u1', username: 'bob', muscle_ranks: { DOS: 4.2 } }] }];
  const p = await S.profileById('u1');
  expect(calls[0].url).toBe('https://x.supabase.co/rest/v1/public_profiles?user_id=eq.u1&select=*');
  expect(p?.username).toBe('bob');
  responses = [{ body: [] }];
  expect(await S.profileById('zz')).toBeNull();
});
