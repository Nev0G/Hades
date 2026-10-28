import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { kvGet, kvSet } from './db';

const URL_ = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
export const cloudEnabled = !!(URL_ && KEY);

export type Session = { token: string; email: string; local?: boolean };
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

export async function signUp(email: string, password: string): Promise<Session> {
  if (!cloudEnabled) return localSession(email);
  await gotrue('signup', { email, password });
  return signIn(email, password);
}

export async function signIn(email: string, password: string): Promise<Session> {
  if (!cloudEnabled) return localSession(email);
  const j = await gotrue('token?grant_type=password', { email, password });
  const s = { token: j.access_token as string, email };
  await setSession(s);
  return s;
}

async function localSession(email: string) {
  const s = { token: '', email, local: true };
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
  const s = { token, email: me.email ?? provider };
  await setSession(s);
  return s;
}

export const signOut = () => setSession(null);
export const supabase = { url: URL_, key: KEY };
