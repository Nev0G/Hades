import { cloudEnabled, decodeJwt, getSession, getValidToken, supabase } from './auth';
import { Metric, challengeScore, publicSummary } from './stats';
import { getProfile } from './repo';

export type PublicProfile = {
  user_id: string; username: string; xp: number; level: number; week_xp: number; rank_index: number; rank_score: number; muscle_ranks: Record<string, number>;
  display_name?: string | null; bio?: string | null; avatar?: string | null; avatar_color?: string | null; title?: string | null;
};
export type Friendship = { id: string; requester: string; addressee: string; status: 'pending' | 'accepted' };
export type Challenge = { id: string; creator: string; title: string; metric: Metric; start_at: number; end_at: number; is_public: boolean; code: string };
export type Member = { challenge_id: string; user_id: string; username: string; score: number };

export class SocialError extends Error {}

async function ctx() {
  if (!cloudEnabled) throw new SocialError('Serveur non configuré (voir README : Supabase).');
  const token = await getValidToken();
  const s = await getSession();
  if (!token || !s || s.local) throw new SocialError('Connecte-toi avec un compte en ligne pour utiliser le social.');
  const me = s.userId ?? decodeJwt(token).sub;
  if (!me) throw new SocialError('Session invalide, reconnecte-toi.');
  return { token, me, username: s.username };
}

async function rest<T = any>(path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
  const { token } = await ctx();
  const res = await fetch(`${supabase.url}/rest/v1/${path}`, {
    method: init.method ?? 'GET',
    headers: {
      apikey: supabase.key!, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json',
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { const j = JSON.parse(text); msg = j.message || j.hint || text; } catch { /* texte brut */ }
    if (/duplicate key|23505/.test(msg)) msg = 'Déjà existant (pseudo ou demande déjà envoyée).';
    throw new SocialError(msg);
  }
  return (text ? JSON.parse(text) : null) as T;
}

const inList = (ids: string[]) => `in.(${ids.join(',')})`;
const enc = encodeURIComponent;

/** Crée / met à jour mon profil public et mes scores de défis. À appeler après chaque séance et à l'ouverture du social. */
export async function pushStats(username: string): Promise<void> {
  const { me } = await ctx();
  const sum = await publicSummary();
  const lp = await getProfile();
  const look = { display_name: lp?.display_name ?? null, bio: lp?.bio ?? null, avatar: lp?.avatar ?? null, avatar_color: lp?.avatar_color ?? null, title: lp?.title ?? null };
  await rest('public_profiles?on_conflict=user_id', { method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal', body: { user_id: me, username, ...look, ...sum, updated_at: Date.now() } });
  for (const c of await myChallenges()) {
    if (c.end_at < Date.now()) continue;
    const score = await challengeScore(c.metric, c.start_at, Math.min(Date.now(), c.end_at));
    await rest(`challenge_members?challenge_id=eq.${c.id}&user_id=eq.${me}`, { method: 'PATCH', prefer: 'return=minimal', body: { score, updated_at: Date.now() } });
  }
}

export async function profileById(id: string): Promise<PublicProfile | null> {
  return (await rest<PublicProfile[]>(`public_profiles?user_id=eq.${id}&select=*`))[0] ?? null;
}

export async function myProfile(): Promise<PublicProfile | null> {
  const { me } = await ctx();
  return (await rest<PublicProfile[]>(`public_profiles?user_id=eq.${me}&select=*`))[0] ?? null;
}

export async function leaderboard(kind: 'global' | 'week' | 'friends'): Promise<PublicProfile[]> {
  const order = kind === 'week' ? 'week_xp.desc' : 'xp.desc';
  if (kind !== 'friends') return rest<PublicProfile[]>(`public_profiles?select=*&order=${order}&limit=50`);
  const { me } = await ctx();
  const ids = [me, ...(await friendships()).filter((f) => f.status === 'accepted').map((f) => (f.requester === me ? f.addressee : f.requester))];
  return rest<PublicProfile[]>(`public_profiles?select=*&user_id=${inList(ids)}&order=${order}&limit=50`);
}

export async function searchUsers(q: string): Promise<PublicProfile[]> {
  const { me } = await ctx();
  const term = q.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (term.length < 2) return [];
  return (await rest<PublicProfile[]>(`public_profiles?select=*&username=ilike.*${enc(term)}*&limit=15`)).filter((p) => p.user_id !== me);
}

export const friendships = () => rest<Friendship[]>('friendships?select=id,requester,addressee,status&order=created_at.desc');
export const sendFriendRequest = (addressee: string) => rest('friendships', { method: 'POST', prefer: 'return=minimal', body: { addressee } });
export const acceptFriend = (id: string) => rest(`friendships?id=eq.${id}`, { method: 'PATCH', prefer: 'return=minimal', body: { status: 'accepted' } });
export const removeFriendship = (id: string) => rest(`friendships?id=eq.${id}`, { method: 'DELETE' });

/** Amitiés + profils des personnes concernées. */
export async function friendOverview() {
  const { me } = await ctx();
  const list = await friendships();
  const ids = [...new Set(list.map((f) => (f.requester === me ? f.addressee : f.requester)))];
  const profiles = ids.length ? await rest<PublicProfile[]>(`public_profiles?select=*&user_id=${inList(ids)}`) : [];
  const by = new Map(profiles.map((p) => [p.user_id, p]));
  const row = (f: Friendship) => ({ f, profile: by.get(f.requester === me ? f.addressee : f.requester) });
  return {
    friends: list.filter((f) => f.status === 'accepted').map(row),
    incoming: list.filter((f) => f.status === 'pending' && f.addressee === me).map(row),
    outgoing: list.filter((f) => f.status === 'pending' && f.requester === me).map(row),
  };
}

// ---- Défis ----
export async function myChallenges(): Promise<Challenge[]> {
  const { me } = await ctx();
  const mem = await rest<{ challenge_id: string }[]>(`challenge_members?user_id=eq.${me}&select=challenge_id`);
  if (!mem.length) return [];
  return rest<Challenge[]>(`challenges?select=*&id=${inList(mem.map((m) => m.challenge_id))}&order=end_at.desc`);
}

export async function publicChallenges(): Promise<Challenge[]> {
  return rest<Challenge[]>(`challenges?select=*&is_public=eq.true&end_at=gt.${Date.now()}&order=end_at.asc&limit=30`);
}

export async function createChallenge(p: { title: string; metric: Metric; days: number; isPublic: boolean }, username: string): Promise<Challenge> {
  const start = Date.now();
  const [c] = await rest<Challenge[]>('challenges', {
    method: 'POST', prefer: 'return=representation',
    body: { title: p.title.trim(), metric: p.metric, start_at: start, end_at: start + p.days * 86400000, is_public: p.isPublic },
  });
  await rest('challenge_members', { method: 'POST', prefer: 'return=minimal', body: { challenge_id: c.id, username } });
  return c;
}

export const joinPublicChallenge = (id: string, username: string) =>
  rest('challenge_members', { method: 'POST', prefer: 'resolution=ignore-duplicates,return=minimal', body: { challenge_id: id, username } });
export const joinByCode = (code: string) => rest<string>('rpc/join_challenge', { method: 'POST', body: { p_code: code.trim().toUpperCase() } });
export const leaveChallenge = async (id: string) => { const { me } = await ctx(); return rest(`challenge_members?challenge_id=eq.${id}&user_id=eq.${me}`, { method: 'DELETE' }); };
export const standings = (id: string) => rest<Member[]>(`challenge_members?challenge_id=eq.${id}&select=*&order=score.desc`);
