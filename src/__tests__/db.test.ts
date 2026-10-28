/* eslint-disable @typescript-eslint/no-var-requires */
jest.mock('expo-sqlite', () => {
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync(':memory:');
  const adapter = {
    execAsync: async (sql: string) => db.exec(sql),
    runAsync: async (sql: string, p: any[] = []) => db.prepare(sql).run(...p),
    getAllAsync: async (sql: string, p: any[] = []) => db.prepare(sql).all(...p),
    getFirstAsync: async (sql: string, p: any[] = []) => db.prepare(sql).get(...p) ?? null,
    withTransactionAsync: async (fn: () => Promise<void>) => { db.exec('BEGIN'); await fn(); db.exec('COMMIT'); },
  };
  return { openDatabaseAsync: async () => adapter };
});

import { all, first, getDb, remove, save } from '../lib/db';
import { lastSets, saveProfile, getProfile, entriesFor, setWater, getWater } from '../lib/repo';

test('seed exercices + écriture locale + outbox', async () => {
  await getDb();
  const ex = await all<{ n: number }>('SELECT COUNT(*) n FROM exercises');
  expect(ex[0].n).toBeGreaterThanOrEqual(20);
  const id = await save('foods', { name: 'RIZ', kcal: 130, protein: 2.7, carbs: 28, fat: 0.3, serving_g: 100, custom: 1 });
  expect((await first<{ name: string }>('SELECT name FROM foods WHERE id=?', [id]))?.name).toBe('RIZ');
  const q = await all<{ tbl: string; row_id: string }>('SELECT * FROM outbox');
  expect(q.some((r) => r.tbl === 'foods' && r.row_id === id)).toBe(true);
  await remove('foods', id);
  expect((await first<{ deleted: number }>('SELECT deleted FROM foods WHERE id=?', [id]))?.deleted).toBe(1);
});

test('profil : TDEE et macros persistés', async () => {
  await saveProfile({ sex: 'M', age: 30, height_cm: 180, weight_kg: 80, goal: 'MASSE', activity: 'MODERE' });
  const p = await getProfile();
  expect(p?.tdee).toBe(2759);
  expect(p?.kcal).toBe(Math.round(2759 * 1.1));
});

test('eau + journal', async () => {
  await setWater('2026-01-01', 3);
  expect((await getWater('2026-01-01')).glasses).toBe(3);
  await setWater('2026-01-01', 4);
  expect((await getWater('2026-01-01')).glasses).toBe(4);
  await save('food_entries', { date: '2026-01-01', meal: 'DEJEUNER', name: 'RIZ', grams: 200, kcal: 260, protein: 5, carbs: 56, fat: 0.6 });
  expect((await entriesFor('2026-01-01')).length).toBe(1);
});

test('surcharge progressive : dernière séance retrouvée', async () => {
  for (const [sid, w] of [['s1', 100], ['s2', 105]] as const) {
    await save('sets', { session_id: sid, exercise_id: 'seed-SQUAT', idx: 0, weight: w, reps: 5, done_at: w });
  }
  const prev = await lastSets('seed-SQUAT', 's3');
  expect(prev.map((s) => s.weight)).toEqual([105]);
  expect(await lastSets('seed-SQUAT', 's2')).toHaveLength(1);
});
