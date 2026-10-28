// Adaptateur web (aperçu navigateur / tests de parcours) : expo-sqlite -> sql.js (asm, sans wasm), base en mémoire.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const initSqlJs = require('sql.js/dist/sql-asm.js');

export async function openDatabaseAsync(_name: string) {
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  const rows = (sql: string, p: any[] = []) => {
    const st = db.prepare(sql);
    st.bind(p);
    const out: any[] = [];
    while (st.step()) out.push(st.getAsObject());
    st.free();
    return out;
  };
  return {
    execAsync: async (sql: string) => { db.exec(sql); },
    runAsync: async (sql: string, p: any[] = []) => { db.run(sql, p); },
    getAllAsync: async (sql: string, p: any[] = []) => rows(sql, p),
    getFirstAsync: async (sql: string, p: any[] = []) => rows(sql, p)[0] ?? null,
    withTransactionAsync: async (fn: () => Promise<void>) => { db.exec('BEGIN'); await fn(); db.exec('COMMIT'); },
  };
}
