// The shopping list.
//
// Now that ingredients are entities, this aggregates by food id rather than by
// matching on a name — so "Chicken breast" and "chicken breasts" can no longer
// become two lines, and there is no unit-family guesswork left, because a food
// declares its own base unit and what one piece of it weighs.
//
// The batch arithmetic is unchanged and is the thing that makes batch cooking
// work: total the portions of each recipe across the week, divide by its
// serving count, round UP to whole cooking sessions, and buy that many batches.
// Cooking half a tray is not a thing.
//
//   plan 3 portions of a recipe that serves 4  ->  cook it once  ->  buy one
//   batch of ingredients, not three
//
// Per-serving adjustments ride on top: they are eaten but not part of the
// batch, so they are counted per portion rather than per cook. If the planner
// added 40 g of rice to each of four plates, the list buys 160 g more rice.

import type { Aisle, FoodItem, Recipe, WeekPlan } from './types';
import { AISLES, DAYS } from './types';
import { toBaseAmount } from './foods';

export interface ShoppingLine {
  key: string;
  foodId: string;
  item: string;
  fi?: string;
  aisle: Aisle;
  /** Amount in the food's base unit. */
  amount: number;
  base: 'g' | 'ml';
  /** Shown as pieces when every contribution arrived that way. */
  pieces?: number;
  /** Recipe names this line came from, for the "why am I buying this" case. */
  from: string[];
}

export interface ShoppingGroup {
  aisle: Aisle;
  lines: ShoppingLine[];
}

/** Portions of each recipe across a whole week. */
export function portionsByRecipe(plan: WeekPlan | undefined): Map<string, number> {
  const out = new Map<string, number>();
  if (!plan) return out;
  for (const day of DAYS) {
    for (const entry of Object.values(plan[day] ?? {})) {
      if (!entry) continue;
      out.set(entry.recipeId, (out.get(entry.recipeId) ?? 0) + (entry.portions || 1));
    }
  }
  return out;
}

/** Cooking sessions each recipe needs, given the portions planned. */
export function batchesByRecipe(
  plan: WeekPlan | undefined,
  recipes: Recipe[]
): Map<string, number> {
  const portions = portionsByRecipe(plan);
  const index = new Map(recipes.map((r) => [r.id, r]));
  const out = new Map<string, number>();
  for (const [id, p] of portions) {
    const recipe = index.get(id);
    if (!recipe) continue;
    out.set(id, Math.max(1, Math.ceil(p / Math.max(1, recipe.serves))));
  }
  return out;
}

export function buildShoppingList(
  plan: WeekPlan | undefined,
  recipes: Recipe[],
  foods: FoodItem[]
): ShoppingGroup[] {
  const batches = batchesByRecipe(plan, recipes);
  const recipeIndex = new Map(recipes.map((r) => [r.id, r]));
  const foodIndex = new Map(foods.map((f) => [f.id, f]));
  const lines = new Map<string, ShoppingLine & { allPieces: boolean }>();

  const add = (foodId: string, amount: number, fromName: string, viaPieces: boolean) => {
    const food = foodIndex.get(foodId);
    if (!food || !(amount > 0)) return;
    const existing = lines.get(foodId);
    if (existing) {
      existing.amount += amount;
      existing.allPieces = existing.allPieces && viaPieces;
      if (!existing.from.includes(fromName)) existing.from.push(fromName);
    } else {
      lines.set(foodId, {
        key: foodId,
        foodId,
        item: food.name,
        fi: food.fi,
        aisle: food.aisle,
        amount,
        base: food.base,
        from: [fromName],
        allPieces: viaPieces,
      });
    }
  };

  // Batch ingredients.
  for (const [recipeId, count] of batches) {
    const recipe = recipeIndex.get(recipeId);
    if (!recipe) continue;
    for (const line of recipe.lines) {
      const food = foodIndex.get(line.foodId);
      if (!food) continue;
      const amount = toBaseAmount(line, food);
      if (amount == null) continue;
      add(food.id, amount * count, recipe.name, line.unit === 'pcs');
    }
  }

  // Per-serving adjustments, counted per portion.
  if (plan) {
    for (const day of DAYS) {
      for (const entry of Object.values(plan[day] ?? {})) {
        if (!entry?.adjustments) continue;
        const recipe = recipeIndex.get(entry.recipeId);
        for (const [foodId, grams] of Object.entries(entry.adjustments)) {
          if (!grams || grams <= 0) continue;
          add(foodId, grams * (entry.portions || 1), recipe?.name ?? 'adjustment', false);
        }
      }
    }
  }

  const finish = (l: ShoppingLine & { allPieces: boolean }): ShoppingLine => {
    const food = foodIndex.get(l.foodId);
    const per = food?.gramsPer?.pcs;
    const { allPieces, ...rest } = l;
    // Countable things read better counted. Only when everything that
    // contributed was counted too — half a lemon by weight plus two whole
    // ones should stay in grams rather than round to something untrue.
    return allPieces && per ? { ...rest, pieces: l.amount / per } : rest;
  };

  return AISLES.map((aisle) => ({
    aisle,
    lines: [...lines.values()]
      .filter((l) => l.aisle === aisle)
      .map(finish)
      .sort((a, b) => a.item.localeCompare(b.item)),
  })).filter((g) => g.lines.length > 0);
}

const trim = (n: number, dp = 0) =>
  n.toFixed(dp).replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');

/** A shopping line as something readable at a shelf. */
export function formatLine(line: ShoppingLine): string {
  if (line.pieces != null) return `${trim(line.pieces, 1)} pcs`;
  if (line.base === 'ml') {
    return line.amount >= 1000 ? `${trim(line.amount / 1000, 2)} l` : `${trim(line.amount)} ml`;
  }
  return line.amount >= 1000 ? `${trim(line.amount / 1000, 2)} kg` : `${trim(line.amount)} g`;
}

/** Plain text for the clipboard, so the list can travel to a phone. */
export function shoppingListAsText(
  groups: ShoppingGroup[],
  aisleLabels: Record<Aisle, string>,
  preferFinnish = true
): string {
  const out: string[] = [];
  for (const group of groups) {
    out.push(aisleLabels[group.aisle].toUpperCase());
    for (const line of group.lines) {
      const name = preferFinnish && line.fi ? line.fi : line.item;
      out.push(`  ${formatLine(line)}  ${name}`);
    }
    out.push('');
  }
  return out.join('\n').trim();
}
