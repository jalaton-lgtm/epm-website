// Persistence.
//
// Everything lives in this browser's localStorage and goes nowhere else. That
// is the whole privacy story of the page, and it is also the whole backup
// story — which is why export is not a nice extra here but the only thing
// standing between a cleared browser and a lost recipe library.
//
// The stored blob carries a version, and version 2 earns it: recipes changed
// from carrying free-text ingredients and hand-typed macros to referencing a
// food library. `migrateV1` below does that conversion rather than asking
// anyone to retype.

import type { FoodItem, KitchenState, Recipe } from './types';
import { STATE_VERSION } from './types';
import { allFoods, recipeMacros } from './foods';
import { defaultSettings, exampleRecipes } from './seed';
import { libraryRecipes } from './library';

const KEY = 'epm.kitchen.v1';

/** localStorage throws in some privacy modes rather than merely being empty. */
function storage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const probe = '__epm_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

export function defaultState(): KitchenState {
  return {
    version: STATE_VERSION,
    settings: structuredClone(defaultSettings),
    foods: structuredClone(allFoods),
    // The real library first, the twelve neutral examples after it. The
    // examples stay because they are one click to remove and the library is
    // not; a page opened by somebody else still has something to plan with.
    recipes: structuredClone([...libraryRecipes, ...exampleRecipes]),
    plans: {},
    training: {},
    weights: [],
    bought: {},
  };
}

/**
 * Recompute the cached per-serving macros of every derived recipe.
 *
 * The cache exists so that reading a recipe does not require the food library
 * to hand; it has to be refreshed whenever a food changes, or a recipe will go
 * on quoting yesterday's chicken. Manual recipes are left alone by definition.
 */
export function refreshDerivedMacros(state: KitchenState): KitchenState {
  return {
    ...state,
    recipes: state.recipes.map((r) =>
      r.macroSource === 'manual' ? r : { ...r, macros: recipeMacros(r, state.foods) }
    ),
  };
}

/**
 * Version 1 recipes carried `ingredients: {item, fi, qty, unit, aisle}[]` and
 * macros typed by hand.
 *
 * Names are matched against the food library where they line up, so a recipe
 * that said "Chicken breast" comes back itemised. Everything unmatched is
 * preserved in the notes rather than dropped — losing somebody's ingredient
 * list to a schema change would be unforgivable, and a note is at least
 * readable while they reitemise.
 *
 * Macros stay MANUAL even where every line matched. The typed numbers were the
 * user's, possibly measured, and silently replacing them with a computed
 * figure would be a change nobody asked for. Switching to derived is one click
 * in the editor, and it is theirs to make.
 */
function migrateV1(raw: Record<string, unknown>, foods: FoodItem[]): Recipe[] {
  const oldRecipes = Array.isArray(raw.recipes) ? raw.recipes : [];
  const byName = new Map(foods.map((f) => [f.name.toLowerCase(), f]));

  return oldRecipes.map((old: Record<string, any>): Recipe => {
    const ingredients: any[] = Array.isArray(old.ingredients) ? old.ingredients : [];
    const lines = [];
    const unmatched: string[] = [];

    for (const ing of ingredients) {
      const food = byName.get(String(ing?.item ?? '').toLowerCase());
      if (food) lines.push({ foodId: food.id, qty: Number(ing.qty) || 0, unit: ing.unit ?? 'g' });
      else if (ing?.item) unmatched.push(`${ing.qty ?? ''}${ing.unit ?? ''} ${ing.item}`.trim());
    }

    const note = unmatched.length
      ? `Not yet matched to foods: ${unmatched.join(', ')}`
      : undefined;

    return {
      id: old.id ?? newId(),
      name: old.name ?? 'Untitled',
      macroSource: 'manual',
      macros: old.macros ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      serves: Number(old.serves) || 1,
      lines,
      prepMinutes: Number(old.prepMinutes) || 0,
      mealTypes: Array.isArray(old.mealTypes) ? old.mealTypes : [],
      batchFriendly: !!old.batchFriendly,
      notes: [old.notes, note].filter(Boolean).join('\n\n') || undefined,
      example: !!old.example,
    };
  });
}

/**
 * Bring a stored blob up to the current shape.
 *
 * Deliberately forgiving: a missing key is filled from defaults rather than
 * treated as corruption, because the failure mode of being strict here is
 * throwing away someone's data over a field that was added later.
 */
function migrate(raw: unknown): KitchenState {
  const base = defaultState();
  if (!raw || typeof raw !== 'object') return base;
  const s = raw as Record<string, any>;

  const foods: FoodItem[] = Array.isArray(s.foods) && s.foods.length ? s.foods : base.foods;
  const storedVersion = Number(s.version) || 1;

  const recipes: Recipe[] =
    storedVersion < 2
      ? migrateV1(s, foods)
      : Array.isArray(s.recipes)
        ? s.recipes
        : base.recipes;

  const state: KitchenState = {
    version: STATE_VERSION,
    settings: { ...base.settings, ...(s.settings ?? {}) },
    foods,
    recipes,
    plans: s.plans && typeof s.plans === 'object' ? s.plans : {},
    training: s.training && typeof s.training === 'object' ? s.training : {},
    weights: Array.isArray(s.weights) ? s.weights : [],
    // v1 keyed these by aisle and item name; v2 keys by food id, so old ticks
    // would never match anything. Dropping them loses one shopping trip's
    // checkboxes, which is the cheapest thing in here.
    bought: storedVersion < 2 ? {} : s.bought && typeof s.bought === 'object' ? s.bought : {},
  };

  return refreshDerivedMacros(state);
}

export function loadState(): KitchenState {
  const store = storage();
  if (!store) return defaultState();
  try {
    const text = store.getItem(KEY);
    if (!text) return defaultState();
    return migrate(JSON.parse(text));
  } catch {
    return defaultState();
  }
}

export function saveState(state: KitchenState): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    // Quota, most likely. The caller surfaces this rather than pretending.
    return false;
  }
}

export function exportJSON(state: KitchenState): string {
  return JSON.stringify(state, null, 2);
}

export interface ImportResult {
  ok: boolean;
  state?: KitchenState;
  error?: string;
}

export function importJSON(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'That file does not contain a planner backup.' };
  }
  const s = parsed as Partial<KitchenState>;
  if (!('settings' in s) && !('recipes' in s)) {
    return { ok: false, error: 'That file does not look like a planner backup.' };
  }
  return { ok: true, state: migrate(parsed) };
}

/** Ids only need to be unique within one browser, so this is enough. */
export function newId(prefix = 'r'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * A recipe as a Markdown block: a portable copy to paste into a note, a
 * message or a commit. Quantities carry their food's name so the text stands
 * on its own away from the library that resolves the ids.
 */
export function recipeToMarkdown(r: Recipe, foods: FoodItem[]): string {
  const index = new Map(foods.map((f) => [f.id, f]));
  const lines: string[] = [
    `# ${r.name}`,
    '',
    `Serves ${r.serves} · ${r.prepMinutes} min${r.batchFriendly ? ' · batch friendly' : ''}`,
    '',
    `Per serving: ${Math.round(r.macros.kcal)} kcal · ${Math.round(r.macros.protein)} g protein · ${Math.round(r.macros.carbs)} g carbs · ${Math.round(r.macros.fat)} g fat`,
    '',
    `## Ingredients (for ${r.serves} serving${r.serves === 1 ? '' : 's'})`,
    '',
  ];
  for (const line of r.lines) {
    const food = index.get(line.foodId);
    const name = food ? (food.fi ? `${food.name} / ${food.fi}` : food.name) : line.foodId;
    lines.push(`- ${line.qty} ${line.unit} ${name}${food?.state ? ` (${food.state})` : ''}`);
  }
  if (r.notes) lines.push('', '## Notes', '', r.notes);
  return lines.join('\n');
}
