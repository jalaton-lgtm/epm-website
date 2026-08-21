// The food library, and the arithmetic that turns quantities into nutrition.
//
// WHERE THESE NUMBERS COME FROM, AND HOW FAR TO TRUST THEM
//
// They are conventional reference values for common staples, rounded, and they
// are approximations. They are close enough to plan a week on and not close
// enough to argue with. Fineli — the Finnish national food composition
// database, maintained by THL — is the reference to check any of them against,
// and is the right source for anything Finnish-specific or anything that turns
// out to matter.
//
// Every value is stated AS BOUGHT: raw meat, dry grains, uncooked pasta. The
// `state` field says so on screen for the ones where it is easy to get wrong.
// Getting this wrong is not a rounding error — dry rice against cooked rice is
// a factor of nearly three.
//
// Brands vary, fat percentages vary, and a mince labelled "lean" is a range
// rather than a number. Anything eaten often enough to matter should be
// replaced with the figure from its own packet.

import type { FoodItem, Macros, Recipe, RecipeLine, Unit } from './types';

/** Grams (or ml) that one unit of a line represents, or null if unconvertible. */
export function toBaseAmount(line: RecipeLine, food: FoodItem): number | null {
  switch (line.unit) {
    case 'g':
      return food.base === 'g' ? line.qty : null;
    case 'kg':
      return food.base === 'g' ? line.qty * 1000 : null;
    case 'ml':
      return food.base === 'ml' ? line.qty : null;
    case 'l':
      return food.base === 'ml' ? line.qty * 1000 : null;
    case 'pcs':
    case 'tbsp':
    case 'tsp': {
      // These only work if the food has declared what one weighs. Returning
      // null rather than assuming is deliberate: a guessed tablespoon of olive
      // oil is 120 kcal of invented energy.
      const per = food.gramsPer?.[line.unit];
      return per == null ? null : line.qty * per;
    }
    default:
      return null;
  }
}

export const ZERO_MACROS: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

/** Macros contributed by one line, for the whole batch. */
export function macrosOfLine(line: RecipeLine, food: FoodItem | undefined): Macros {
  if (!food) return { ...ZERO_MACROS };
  const amount = toBaseAmount(line, food);
  if (amount == null) return { ...ZERO_MACROS };
  const f = amount / 100;
  return {
    kcal: food.per100.kcal * f,
    protein: food.per100.protein * f,
    carbs: food.per100.carbs * f,
    fat: food.per100.fat * f,
  };
}

/** Macros for a given weight of a food, used for plan-entry adjustments. */
export function macrosOfGrams(food: FoodItem | undefined, grams: number): Macros {
  if (!food) return { ...ZERO_MACROS };
  const f = grams / 100;
  return {
    kcal: food.per100.kcal * f,
    protein: food.per100.protein * f,
    carbs: food.per100.carbs * f,
    fat: food.per100.fat * f,
  };
}

export function addMacros(a: Macros, b: Macros): Macros {
  return {
    kcal: a.kcal + b.kcal,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

/**
 * A recipe's macros PER SERVING.
 *
 * Honours macroSource: a 'manual' recipe returns what was typed, untouched, so
 * a shop-bought bar or a restaurant meal can sit in the library without being
 * itemised into foods that do not exist.
 */
export function recipeMacros(recipe: Recipe, foods: FoodItem[]): Macros {
  if (recipe.macroSource === 'manual') return recipe.macros;
  const index = new Map(foods.map((f) => [f.id, f]));
  const batch = recipe.lines.reduce(
    (sum, line) => addMacros(sum, macrosOfLine(line, index.get(line.foodId))),
    { ...ZERO_MACROS }
  );
  const serves = Math.max(1, recipe.serves);
  return {
    kcal: batch.kcal / serves,
    protein: batch.protein / serves,
    carbs: batch.carbs / serves,
    fat: batch.fat / serves,
  };
}

/** Lines the generator is allowed to move. Role gives the default; the line may override. */
export function isFlexible(line: RecipeLine, food: FoodItem | undefined): boolean {
  if (line.flex != null) return line.flex;
  return food?.role === 'carb';
}

/** Units this food can actually be measured in, for the line editor's dropdown. */
export function unitsFor(food: FoodItem): Unit[] {
  const base: Unit[] = food.base === 'g' ? ['g', 'kg'] : ['ml', 'l'];
  const extra: Unit[] = (['pcs', 'tbsp', 'tsp'] as const).filter(
    (u) => food.gramsPer?.[u] != null
  );
  return [...base, ...extra];
}

// ---------------------------------------------------------------------------
// The seeded library
// ---------------------------------------------------------------------------

const f = (
  id: string,
  name: string,
  fi: string,
  aisle: FoodItem['aisle'],
  role: FoodItem['role'],
  kcal: number,
  protein: number,
  carbs: number,
  fat: number,
  extra: Partial<FoodItem> = {}
): FoodItem => ({
  id,
  name,
  fi,
  aisle,
  role,
  per100: { kcal, protein, carbs, fat },
  base: 'g',
  example: true,
  ...extra,
});

export const seedFoods: FoodItem[] = [
  // ---- meat and fish, raw ----
  f('fd-chicken', 'Chicken breast', 'Broilerin rintafilee', 'meat', 'protein', 120, 23, 0, 2.5, { state: 'raw' }),
  f('fd-turkey', 'Ground turkey', 'Kalkkunajauheliha', 'meat', 'protein', 150, 20, 0, 8, { state: 'raw, 7% fat' }),
  f('fd-beef', 'Lean beef', 'Vähärasvainen naudanliha', 'meat', 'protein', 135, 21, 0, 5, { state: 'raw' }),
  f('fd-pork', 'Pork tenderloin', 'Porsaan sisäfilee', 'meat', 'protein', 120, 21, 0, 4, { state: 'raw' }),
  f('fd-salmon', 'Salmon fillet', 'Lohifilee', 'fish', 'protein', 200, 20, 0, 13, { state: 'raw' }),
  f('fd-trout', 'Rainbow trout', 'Kirjolohi', 'fish', 'protein', 170, 20, 0, 10, { state: 'raw' }),

  // ---- dairy and eggs ----
  f('fd-egg', 'Eggs', 'Kananmuna', 'dairy', 'protein', 140, 12.5, 0.5, 10, { gramsPer: { pcs: 55 } }),
  f('fd-eggwhite', 'Egg white', 'Munanvalkuainen', 'dairy', 'protein', 48, 11, 0.7, 0.2, { base: 'ml' }),
  f('fd-milk', 'Milk 1.5%', 'Maito 1,5%', 'dairy', 'other', 45, 3.4, 4.8, 1.5, { base: 'ml' }),
  f('fd-greekyog', 'Greek yoghurt 2%', 'Kreikkalainen jogurtti 2%', 'dairy', 'protein', 73, 9.5, 4, 2),
  f('fd-quark', 'Quark, plain', 'Maitorahka', 'dairy', 'protein', 65, 12, 4, 0.2),
  f('fd-cottage', 'Cottage cheese', 'Raejuusto', 'dairy', 'protein', 100, 13, 3, 4),
  f('fd-cheese', 'Grated cheese', 'Juustoraaste', 'dairy', 'fat', 350, 25, 1, 27),
  f('fd-smetana', 'Soured cream 15%', 'Smetana 15%', 'dairy', 'fat', 160, 3, 4, 15),
  f('fd-butter', 'Butter', 'Voi', 'dairy', 'fat', 720, 0.6, 0.6, 80, { gramsPer: { tbsp: 14, tsp: 5 } }),
  f('fd-almondmilk', 'Almond milk, unsweetened', 'Mantelimaito', 'dairy', 'other', 15, 0.5, 0.3, 1.2, { base: 'ml' }),

  // ---- grains and starches, dry or raw ----
  f('fd-oats', 'Rolled oats', 'Kaurahiutaleet', 'dry', 'carb', 370, 13, 58, 7, { state: 'dry' }),
  f('fd-brownrice', 'Brown rice', 'Täysjyväriisi', 'dry', 'carb', 355, 8, 72, 3, { state: 'dry' }),
  f('fd-whiterice', 'White rice', 'Riisi', 'dry', 'carb', 355, 7, 78, 1, { state: 'dry' }),
  f('fd-pasta', 'Pasta', 'Pasta', 'dry', 'carb', 360, 12.5, 70, 1.5, { state: 'dry' }),
  f('fd-quinoa', 'Quinoa', 'Kvinoa', 'dry', 'carb', 370, 14, 62, 6, { state: 'dry' }),
  f('fd-potato', 'Potatoes', 'Perunat', 'produce', 'carb', 75, 2, 15, 0.1, { state: 'raw' }),
  f('fd-sweetpotato', 'Sweet potato', 'Bataatti', 'produce', 'carb', 86, 1.6, 20, 0.1, { state: 'raw' }),
  f('fd-ryebread', 'Rye bread', 'Ruisleipä', 'bakery', 'carb', 220, 7, 38, 1.5, { gramsPer: { pcs: 30 } }),
  f('fd-wholebread', 'Wholegrain bread', 'Täysjyväleipä', 'bakery', 'carb', 240, 9, 38, 3.5, { gramsPer: { pcs: 35 } }),

  // ---- legumes ----
  f('fd-lentils', 'Red lentils', 'Punaiset linssit', 'dry', 'carb', 350, 25, 55, 1.5, { state: 'dry' }),
  f('fd-chickpeas', 'Chickpeas, canned', 'Kikherneet, säilyke', 'dry', 'protein', 120, 7, 16, 2, { state: 'drained' }),

  // ---- fats and nuts ----
  f('fd-oliveoil', 'Olive oil', 'Oliiviöljy', 'dry', 'fat', 900, 0, 0, 100, { base: 'ml', gramsPer: { tbsp: 13.5, tsp: 4.5 } }),
  f('fd-rapeseedoil', 'Rapeseed oil', 'Rypsiöljy', 'dry', 'fat', 900, 0, 0, 100, { base: 'ml', gramsPer: { tbsp: 13.5, tsp: 4.5 } }),
  f('fd-peanutbutter', 'Peanut butter', 'Maapähkinävoi', 'dry', 'fat', 600, 25, 12, 50, { gramsPer: { tbsp: 16 } }),
  f('fd-walnuts', 'Walnuts', 'Saksanpähkinä', 'dry', 'fat', 690, 15, 7, 65),
  f('fd-almonds', 'Almonds', 'Manteli', 'dry', 'fat', 600, 21, 6, 51),
  f('fd-avocado', 'Avocado', 'Avokado', 'produce', 'fat', 160, 2, 2, 15, { gramsPer: { pcs: 150 } }),

  // ---- produce ----
  f('fd-banana', 'Banana', 'Banaani', 'produce', 'carb', 90, 1.1, 20, 0.3, { gramsPer: { pcs: 118 } }),
  f('fd-berries', 'Berries, frozen', 'Marjat, pakaste', 'frozen', 'veg', 50, 1, 8, 0.4),
  f('fd-mixedveg', 'Mixed vegetables', 'Sekavihannekset', 'produce', 'veg', 45, 2.5, 5, 0.4),
  f('fd-spinach', 'Spinach', 'Pinaatti', 'produce', 'veg', 23, 2.9, 1.4, 0.4),
  f('fd-broccoli', 'Broccoli', 'Parsakaali', 'produce', 'veg', 34, 2.8, 4, 0.4),
  f('fd-asparagus', 'Asparagus', 'Parsa', 'produce', 'veg', 20, 2.2, 2, 0.1),
  f('fd-carrot', 'Carrot', 'Porkkana', 'produce', 'veg', 35, 0.8, 7, 0.2, { gramsPer: { pcs: 70 } }),
  f('fd-onion', 'Onion', 'Sipuli', 'produce', 'veg', 40, 1.1, 8, 0.1, { gramsPer: { pcs: 110 } }),
  f('fd-garlic', 'Garlic', 'Valkosipuli', 'produce', 'veg', 150, 6, 30, 0.5, { gramsPer: { pcs: 5 } }),
  f('fd-tomato', 'Tomato', 'Tomaatti', 'produce', 'veg', 18, 0.9, 3, 0.2, { gramsPer: { pcs: 90 } }),
  f('fd-crushedtomato', 'Crushed tomatoes', 'Tomaattimurska', 'dry', 'veg', 32, 1.6, 5, 0.3),
  f('fd-cucumber', 'Cucumber', 'Kurkku', 'produce', 'veg', 15, 0.7, 2, 0.1),
  f('fd-lemon', 'Lemon', 'Sitruuna', 'produce', 'veg', 29, 1.1, 6, 0.3, { gramsPer: { pcs: 90 } }),
  f('fd-chives', 'Chives', 'Ruohosipuli', 'produce', 'veg', 30, 3, 4, 0.7, { gramsPer: { tbsp: 3 } }),

  // ---- store cupboard ----
  f('fd-whey', 'Whey protein powder', 'Heraproteiinijauhe', 'dry', 'protein', 380, 80, 6, 5),
  f('fd-honey', 'Honey', 'Hunaja', 'dry', 'carb', 300, 0.3, 80, 0, { gramsPer: { tbsp: 21, tsp: 7 } }),
  f('fd-granola', 'Granola', 'Mysli', 'dry', 'carb', 450, 9, 65, 16),
  f('fd-soysauce', 'Soy sauce', 'Soijakastike', 'dry', 'other', 60, 6, 6, 0, { base: 'ml', gramsPer: { tbsp: 18, tsp: 6 } }),
];
