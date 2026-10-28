import { getDb } from './db';
import { getSession, cloudEnabled, supabase } from './auth';

let running = false;

/** Envoie la file d'attente locale vers Supabase. Silencieux si hors-ligne. */
export async function syncNow(): Promise<{ sent: number; pending: number }> {
  const db = await getDb();
  const pendingCount = async () => (await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) n FROM outbox'))?.n ?? 0;
  if (running || !cloudEnabled) return { sent: 0, pending: await pendingCount() };
  const s = await getSession();
  if (!s || s.local || !s.token) return { sent: 0, pending: await pendingCount() };
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
        if (!byTable.has(b.tbl)) byTable.set(b.tbl, new Map());
        byTable.get(b.tbl)!.set(p.id, p);
      }
      for (const [tbl, rows] of byTable) {
        const res = await fetch(`${supabase.url}/rest/v1/${tbl}`, {
          method: 'POST',
          headers: {
            apikey: supabase.key!,
            Authorization: `Bearer ${s.token}`,
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
