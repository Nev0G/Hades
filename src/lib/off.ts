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

/** Recherche texte Open Food Facts (jusqu'à 15 produits ayant des valeurs nutritionnelles). */
export async function searchOff(q: string): Promise<OffFood[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=code,product_name,brands,nutriments,serving_quantity`;
  const res = await fetch(url, { headers: { 'User-Agent': 'HADES/1.0 (contact via app)' } });
  if (!res.ok) throw new Error(`OFF ${res.status}`);
  const j = await res.json();
  return (j.products ?? [])
    .filter((p: any) => p.product_name && p.nutriments && (p.nutriments['energy-kcal_100g'] ?? p.nutriments.energy_100g) != null)
    .map((p: any): OffFood => {
      const n = p.nutriments;
      return {
        barcode: String(p.code ?? ''),
        name: String(p.product_name).toUpperCase(),
        brand: String(p.brands ?? '').split(',')[0].toUpperCase(),
        kcal: Math.round(n['energy-kcal_100g'] ?? n.energy_100g / 4.184),
        protein: Number(n.proteins_100g ?? 0),
        carbs: Number(n.carbohydrates_100g ?? 0),
        fat: Number(n.fat_100g ?? 0),
        serving_g: Number(p.serving_quantity) || 100,
      };
    });
}
