import { store } from './store.js';

export function latestCostPerUnit(ingredient_id) {
  const purchases = store.purchases.filter((p) => p.ingredient_id === ingredient_id);
  if (!purchases.length) return 0;
  purchases.sort((a, b) => (a.purchase_date < b.purchase_date ? 1 : -1));
  return purchases[0].cost_per_unit_minor || 0;
}

export function stockOnHand(ingredient_id) {
  const ing = store.ingredients.find((i) => i.id === ingredient_id);
  return ing ? ing.stock_qty : 0;
}

// Returns { material_cost_minor, shortages[] }. Freezes cost at sale time.
export function costAndDeduct(product_id, qty) {
  const recipeLines = store.recipes.filter((r) => r.product_id === product_id);
  let material_cost_minor = 0;
  const shortages = [];
  for (const line of recipeLines) {
    const ing = store.ingredients.find((i) => i.id === line.ingredient_id);
    if (!ing) continue;
    const need = line.qty_per_sale * qty;
    const unitCost = latestCostPerUnit(ing.id);
    material_cost_minor += Math.round(need * unitCost);
    ing.stock_qty -= need;
    if (ing.stock_qty < 0) shortages.push({ ingredient_id: ing.id, name: ing.name, stock_qty: ing.stock_qty });
  }
  return { material_cost_minor, shortages };
}
