import { getDb } from './db';
import { getSession, getValidToken, cloudEnabled, supabase } from './auth';

let running = false;

/** Envoie la file d'attente locale vers Supabase. Silencieux si hors-ligne. */
export async function syncNow(): Promise<{ sent: number; pending: number }> {
  const db = await getDb();
  const pendingCount = async () => (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) n FROM outbox'))?.n ?? 0;
  if (running || !cloudEnabled) return { sent: 0, pending: await pendingCount() };
  const s = await getSession();
  const token = await getValidToken();
  if (!s || s.local || !token) return { sent: 0, pending: await pendingCount() };
  running = true;
  let sent = 0;
  try {
    for (;;) {
      const batch = await db.getAllAsync<{ seq: number; tbl: string; payload: string }>('SELECT * FROM outbox ORDER BY seq LIMIT 50');
      if (!batch.length) break;
      // dernier état par ligne
      const byTable = new Map<string, Map<string, unknown>>();
      for (const b of batch) {
        const p = JSON.parse(b.payload);
        if (b.tbl === 'photos' && typeof p.uri === 'string' && !p.uri.startsWith('http')) {
          const up = await uploadPhoto(p.uri, p.id, token);
          if (up) { p.uri = up; }
        }
        if (!byTable.has(b.tbl)) byTable.set(b.tbl, new Map());
        byTable.get(b.tbl)!.set(p.id, p);
      }
      for (const [tbl, rows] of byTable) {
        const res = await fetch(`${supabase.url}/rest/v1/${tbl}`, {
          method: 'POST',
          headers: {
            apikey: supabase.key!,
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=minimal',
          },
          body: JSON.stringify([...rows.values()]),
        });
        if (!res.ok) throw new Error(`SYNC ${tbl} ${res.status}`);
      }
      await db.runAsync(`DELETE FROM outbox WHERE seq IN (${batch.map(() => '?').join(',')})`, batch.map((b) => b.seq));
      sent += batch.length;
    }
  } catch {
    /* réseau absent : la file reste intacte, nouvelle tentative plus tard */
  } finally {
    running = false;
  }
  return { sent, pending: await pendingCount() };
}

export function startSyncLoop(intervalMs = 20000) {
  syncNow();
  const t = setInterval(syncNow, intervalMs);
  return () => clearInterval(t);
}

/** Envoie le fichier vers le bucket Storage `photos` (privé, dossier par utilisateur via RLS). */
async function uploadPhoto(uri: string, id: string, token: string): Promise<string | null> {
  try {
    const blob = await (await fetch(uri)).blob();
    const path = `${id}.jpg`;
    const res = await fetch(`${supabase.url}/storage/v1/object/photos/${path}`, {
      method: 'POST',
      headers: { apikey: supabase.key!, Authorization: `Bearer ${token}`, 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
      body: blob,
    });
    return res.ok ? `${supabase.url}/storage/v1/object/authenticated/photos/${path}` : null;
  } catch {
    return null;
  }
}
