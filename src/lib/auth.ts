import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { kvGet, kvSet } from './db';

const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const cloudEnabled = !!(URL_ && KEY);

export type Session = { token: string; email: string; local?: boolean; refresh?: string; exp?: number; userId?: string; username?: string };
const SK = 'hades.session';

// SecureStore peut être indisponible (web, simulateur sans keychain) : repli sur la base locale.
export async function getSession(): Promise<Session | null> {
  try {
    const raw = await SecureStore.getItemAsync(SK);
    if (raw) return JSON.parse(raw) as Session;
  } catch { /* repli */ }
  try {
    const raw = await kvGet(SK);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}
async function setSession(s: Session | null) {
  const raw = s ? JSON.stringify(s) : '';
  try {
    if (s) await SecureStore.setItemAsync(SK, raw);
    else await SecureStore.deleteItemAsync(SK);
  } catch { /* repli ci-dessous */ }
  await kvSet(SK, raw);
}

const b64 = (s: string) => {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  return typeof atob === 'function' ? atob(t + '='.repeat((4 - (t.length % 4)) % 4)) : '';
};
/** Lit `sub` et `exp` du JWT (sans vérification : sert uniquement à l'affichage / au renouvellement). */
export function decodeJwt(token: string): { sub?: string; exp?: number } {
  try { return JSON.parse(b64(token.split('.')[1])); } catch { return {}; }
}

async function toSession(j: any, email: string, username?: string): Promise<Session> {
  const jwt = decodeJwt(j.access_token);
  const s: Session = { token: j.access_token, email, refresh: j.refresh_token, exp: jwt.exp ? jwt.exp * 1000 : Date.now() + (j.expires_in ?? 3600) * 1000, userId: jwt.sub, username };
  await setSession(s);
  return s;
}

/** Jeton valide : renouvelé via le refresh token s'il expire dans moins d'une minute. */
export async function getValidToken(): Promise<string | null> {
  const s = await getSession();
  if (!s || s.local || !s.token) return null;
  if (!cloudEnabled || !s.exp || s.exp - Date.now() > 60000) return s.token;
  if (!s.refresh) return s.token;
  try {
    const j = await gotrue('token?grant_type=refresh_token', { refresh_token: s.refresh });
    return (await toSession(j, s.email, s.username)).token;
  } catch {
    return s.token;
  }
}

async function gotrue(path: string, body: unknown) {
  const res = await fetch(`${URL_}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error_description || j.msg || 'ERREUR AUTH');
  return j;
}

export async function signUp(email: string, password: string, username?: string): Promise<Session> {
  if (username) await kvSet('pending_username', username);
  if (!cloudEnabled) return localSession(email, username);
  const j = await gotrue('signup', { email, password, data: { username } });
  // Confirmation par email activée côté Supabase : pas de jeton tant que le lien n'est pas cliqué.
  if (!j.access_token) throw new Error('COMPTE CREE : CONFIRME TON EMAIL PUIS CONNECTE-TOI.');
  return toSession(j, email, username);
}

export async function resetPassword(email: string) {
  if (!cloudEnabled) throw new Error('MODE LOCAL : PAS DE SERVEUR POUR REINITIALISER.');
  await gotrue('recover', { email });
}

export async function signIn(email: string, password: string): Promise<Session> {
  if (!cloudEnabled) return localSession(email);
  const j = await gotrue('token?grant_type=password', { email, password });
  return toSession(j, email, j.user?.user_metadata?.username);
}

async function localSession(email: string, username?: string) {
  const s = { token: '', email, local: true, username };
  await setSession(s);
  return s;
}

/** SSO Google / Apple via Supabase OAuth (navigateur système). */
export async function signInWithProvider(provider: 'google' | 'apple'): Promise<Session> {
  if (!cloudEnabled) throw new Error('SSO INDISPONIBLE : CONFIGURER SUPABASE');
  const redirect = Linking.createURL('auth');
  const url = `${URL_}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(redirect)}`;
  const r = await WebBrowser.openAuthSessionAsync(url, redirect);
  if (r.type !== 'success') throw new Error('CONNEXION ANNULEE');
  const params = new URLSearchParams(r.url.split('#')[1] ?? '');
  const token = params.get('access_token');
  if (!token) throw new Error('JETON ABSENT');
  const me = await fetch(`${URL_}/auth/v1/user`, { headers: { apikey: KEY!, Authorization: `Bearer ${token}` } }).then((x) => x.json());
  return toSession({ access_token: token, refresh_token: params.get('refresh_token'), expires_in: Number(params.get('expires_in')) || 3600 }, me.email ?? provider, me.user_metadata?.username);
}

export const signOut = () => setSession(null);
export const supabase = { url: URL_, key: KEY };
