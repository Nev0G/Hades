import { all, first, remove, save } from './db';

export type MealItem = { name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number };
export type Template = { id: string; name: string; kind: 'meal' | 'recipe'; portions: number; items: MealItem[] };

const r1 = (n: number) => Math.round(n * 10) / 10;

export function totals(items: MealItem[]) {
  return items.reduce((a, i) => ({ grams: a.grams + i.grams, kcal: a.kcal + i.kcal, protein: a.protein + i.protein, carbs: a.carbs + i.carbs, fat: a.fat + i.fat }), { grams: 0, kcal: 0, protein: 0, carbs: 0, fat: 0 });
}

/** Valeurs d'une portion (recette) ou du total (repas). */
export function perPortion(t: Pick<Template, 'items' | 'portions' | 'kind'>) {
  const tot = totals(t.items);
  const n = t.kind === 'recipe' ? Math.max(1, t.portions) : 1;
  return { grams: r1(tot.grams / n), kcal: Math.round(tot.kcal / n), protein: r1(tot.protein / n), carbs: r1(tot.carbs / n), fat: r1(tot.fat / n) };
}

export type EntryRow = { name: string; grams: number; kcal: number; protein: number; carbs: number; fat: number };

/** Lignes de journal à créer pour `qty` portions d'un repas / d'une recette. */
export function entriesFor(t: Pick<Template, 'name' | 'items' | 'portions' | 'kind'>, qty = 1): EntryRow[] {
  if (t.kind === 'meal') {
    return t.items.map((i) => ({ name: i.name, grams: r1(i.grams * qty), kcal: Math.round(i.kcal * qty), protein: r1(i.protein * qty), carbs: r1(i.carbs * qty), fat: r1(i.fat * qty) }));
  }
  const p = perPortion(t);
  return [{ name: t.name, grams: r1(p.grams * qty), kcal: Math.round(p.kcal * qty), protein: r1(p.protein * qty), carbs: r1(p.carbs * qty), fat: r1(p.fat * qty) }];
}

const parse = (r: { id: string; name: string; kind: string; portions: number; items: string }): Template => {
  let items: MealItem[] = [];
  try { items = JSON.parse(r.items) as MealItem[]; } catch { /* ligne corrompue : template vide */ }
  return { id: r.id, name: r.name, kind: r.kind === 'recipe' ? 'recipe' : 'meal', portions: r.portions || 1, items };
};

export async function listTemplates(kind?: Template['kind']): Promise<Template[]> {
  const rows = await all<any>(`SELECT * FROM meal_templates WHERE deleted=0 ${kind ? 'AND kind=?' : ''} ORDER BY updated_at DESC`, kind ? [kind] : []);
  return rows.map(parse);
}
export async function getTemplate(id: string) {
  const r = await first<any>('SELECT * FROM meal_templates WHERE id=? AND deleted=0', [id]);
  return r ? parse(r) : null;
}
export const saveTemplate = (t: { id?: string; name: string; kind: Template['kind']; portions: number; items: MealItem[] }) =>
  save('meal_templates', { id: t.id, name: t.name.trim(), kind: t.kind, portions: t.kind === 'recipe' ? Math.max(1, t.portions) : 1, items: JSON.stringify(t.items) });
export const deleteTemplate = (id: string) => remove('meal_templates', id);

export async function addTemplateToDay(t: Template, date: string, meal: string, qty = 1) {
  for (const e of entriesFor(t, qty)) await save('food_entries', { date, meal, ...e });
}
