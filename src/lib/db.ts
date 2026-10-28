import * as SQLite from 'expo-sqlite';
import { SEED_EXERCISES } from './seed';

export const SYNCED = [
  'profile', 'foods', 'food_entries', 'water', 'exercises', 'programs', 'program_days',
  'program_exercises', 'sessions', 'sets', 'body_weights', 'photos',
] as const;
export type Table = (typeof SYNCED)[number];

const SCHEMA = `
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS profile(id TEXT PRIMARY KEY, sex TEXT, age INTEGER, height_cm REAL, weight_kg REAL, goal TEXT, activity TEXT,
  tdee INTEGER, kcal INTEGER, protein INTEGER, carbs INTEGER, fat INTEGER, keep_awake INTEGER DEFAULT 1, updated_at INTEGER, deleted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS foods(id TEXT PRIMARY KEY, name TEXT, brand TEXT, barcode TEXT, kcal REAL, protein REAL, carbs REAL, fat REAL,
  serving_g REAL, custom INTEGER DEFAULT 0, updated_at INTEGER, deleted INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS foods_barcode ON foods(barcode);
CREATE TABLE IF NOT EXISTS food_entries(id TEXT PRIMARY KEY, date TEXT, meal TEXT, name TEXT, grams REAL, kcal REAL, protein REAL, carbs REAL, fat REAL,
  updated_at INTEGER, deleted INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS entries_date ON food_entries(date);
CREATE TABLE IF NOT EXISTS water(id TEXT PRIMARY KEY, date TEXT, glasses INTEGER DEFAULT 0, updated_at INTEGER, deleted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS exercises(id TEXT PRIMARY KEY, name TEXT, muscle TEXT, equipment TEXT, compound INTEGER DEFAULT 0, custom INTEGER DEFAULT 0,
  updated_at INTEGER, deleted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS programs(id TEXT PRIMARY KEY, name TEXT, updated_at INTEGER, deleted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS program_days(id TEXT PRIMARY KEY, program_id TEXT, name TEXT, pos INTEGER, updated_at INTEGER, deleted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS program_exercises(id TEXT PRIMARY KEY, day_id TEXT, exercise_id TEXT, pos INTEGER, sets INTEGER DEFAULT 3, rest_s INTEGER DEFAULT 90,
  updated_at INTEGER, deleted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, day_id TEXT, name TEXT, started_at INTEGER, ended_at INTEGER, updated_at INTEGER, deleted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS sets(id TEXT PRIMARY KEY, session_id TEXT, exercise_id TEXT, idx INTEGER, weight REAL, reps INTEGER, done_at INTEGER,
  updated_at INTEGER, deleted INTEGER DEFAULT 0);
CREATE INDEX IF NOT EXISTS sets_ex ON sets(exercise_id, done_at);
CREATE TABLE IF NOT EXISTS body_weights(id TEXT PRIMARY KEY, date TEXT, weight_kg REAL, updated_at INTEGER, deleted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS photos(id TEXT PRIMARY KEY, date TEXT, uri TEXT, weight_kg REAL, updated_at INTEGER, deleted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS outbox(seq INTEGER PRIMARY KEY AUTOINCREMENT, tbl TEXT, row_id TEXT, payload TEXT);
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY, v TEXT);
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('hades.db');
      await db.execAsync(SCHEMA);
      await seed(db);
      return db;
    })();
  }
  return dbPromise;
}

export const uid = () =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 3) | 8).toString(16);
  });

export const today = () => dateKey(new Date());
export function dateKey(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

async function seed(db: SQLite.SQLiteDatabase) {
  const row = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) n FROM exercises');
  if (row && row.n > 0) return;
  await db.withTransactionAsync(async () => {
    for (const e of SEED_EXERCISES) {
      await db.runAsync(
        'INSERT INTO exercises(id,name,muscle,equipment,compound,custom,updated_at) VALUES(?,?,?,?,?,0,0)',
        [`seed-${e.name}`, e.name, e.muscle, e.equipment, e.compound ? 1 : 0],
      );
    }
  });
}

/** Écriture locale instantanée + mise en file d'attente pour la synchro. */
export async function save(table: Table, data: Record<string, unknown> & { id?: string }) {
  const db = await getDb();
  const row = { ...data, id: data.id ?? uid(), updated_at: Date.now() };
  const cols = Object.keys(row);
  await db.runAsync(
    `INSERT OR REPLACE INTO ${table}(${cols.join(',')}) VALUES(${cols.map(() => '?').join(',')})`,
    cols.map((c) => (row as Record<string, any>)[c]),
  );
  await db.runAsync('INSERT INTO outbox(tbl,row_id,payload) VALUES(?,?,?)', [table, row.id, JSON.stringify(row)]);
  return row.id as string;
}

export async function remove(table: Table, id: string) {
  const db = await getDb();
  const now = Date.now();
  await db.runAsync(`UPDATE ${table} SET deleted=1, updated_at=? WHERE id=?`, [now, id]);
  const r = await db.getFirstAsync<Record<string, unknown>>(`SELECT * FROM ${table} WHERE id=?`, [id]);
  if (r) await db.runAsync('INSERT INTO outbox(tbl,row_id,payload) VALUES(?,?,?)', [table, id, JSON.stringify(r)]);
}

export async function all<T>(sql: string, params: any[] = []): Promise<T[]> {
  return (await getDb()).getAllAsync<T>(sql, params);
}
export async function first<T>(sql: string, params: any[] = []): Promise<T | null> {
  return (await getDb()).getFirstAsync<T>(sql, params);
}
export async function kvGet(k: string) {
  return (await first<{ v: string }>('SELECT v FROM kv WHERE k=?', [k]))?.v ?? null;
}
export async function kvSet(k: string, v: string) {
  await (await getDb()).runAsync('INSERT OR REPLACE INTO kv(k,v) VALUES(?,?)', [k, v]);
}
