export type OffFood = { barcode: string; name: string; brand: string; kcal: number; protein: number; carbs: number; fat: number; serving_g: number };

/** Open Food Facts : valeurs pour 100 g. */
export async function fetchByBarcode(code: string): Promise<OffFood | null> {
  const res = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_quantity`,
    { headers: { 'User-Agent': 'HADES/1.0 (contact via app)' } },
  );
  if (!res.ok) return null;
  const j = await res.json();
  if (j.status !== 1 || !j.product) return null;
  const n = j.product.nutriments ?? {};
  const kcal = n['energy-kcal_100g'] ?? (n['energy_100g'] ? n['energy_100g'] / 4.184 : 0);
  return {
    barcode: code,
    name: String(j.product.product_name || 'PRODUIT INCONNU').toUpperCase(),
    brand: String(j.product.brands ?? '').toUpperCase(),
    kcal: Math.round(kcal),
    protein: Number(n.proteins_100g ?? 0),
    carbs: Number(n.carbohydrates_100g ?? 0),
    fat: Number(n.fat_100g ?? 0),
    serving_g: Number(j.product.serving_quantity) || 100,
  };
}
