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

// ---------------------------------------------------------------------------
// The library ingredients
// ---------------------------------------------------------------------------
//
// What the recipes in `library.ts` actually call for: the cuts, the pastes and
// the spice jars that a staples list has no reason to carry. Two entries are
// here without a line referencing them — naan and cashews — because their
// recipe names them as the alternative to something else. Same caveats as
// above — conventional reference values, rounded, stated AS BOUGHT — with two
// worth stating again here.
//
// SPICES ARE IN THE LIBRARY FOR THE SHOPPING LIST, NOT FOR THE MACROS. A
// teaspoon of paprika is six calories. They earn their place because a recipe
// that needs star anise should say so at the counter, and the arithmetic they
// contribute is noise either way.
//
// BOTTLED SAUCES AND PASTES VARY MORE THAN ANYTHING ELSE HERE. Gochujang,
// oyster sauce and barbecue sauce are mostly sugar in proportions the maker
// chooses; two brands can differ by half. Anything used by the spoonful is
// harmless, and anything used by the cup is worth reading off its own jar.
//
// `gramsPer` is filled in wherever a recipe measures the thing in spoons or
// pieces. Without it those lines resolve to nothing at all — silently — which
// is the one failure mode in this file that does not announce itself.

const lf = (
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
): FoodItem => f(id, name, fi, aisle, role, kcal, protein, carbs, fat, { example: false, ...extra });

export const libraryFoods: FoodItem[] = [
  // ---- meat, raw unless stated ----
  lf('fd-beefmince', 'Ground beef 17%', 'Naudan jauheliha 17%', 'meat', 'protein', 220, 18, 0, 17, { state: 'raw' }),
  lf('fd-steak', 'Beef steak, sirloin or rump', 'Naudan ulko- tai sisäfilee', 'meat', 'protein', 180, 21, 0, 10, { state: 'raw' }),
  lf('fd-brisket', 'Beef brisket', 'Naudan rinta', 'meat', 'protein', 230, 19, 0, 17, { state: 'raw' }),
  lf('fd-beefchuck', 'Beef chuck, stewing', 'Naudan palapaisti', 'meat', 'protein', 200, 20, 0, 13, { state: 'raw' }),
  lf('fd-vealshank', 'Veal shank, osso buco', 'Vasikan potka', 'meat', 'protein', 150, 20, 0, 7, { state: 'raw, bone in' }),
  lf('fd-bonemarrow', 'Bone marrow', 'Luuydin', 'meat', 'fat', 780, 7, 0, 84, { state: 'raw' }),
  lf('fd-lambshank', 'Lamb shank', 'Karitsan potka', 'meat', 'protein', 200, 19, 0, 14, { state: 'raw, bone in', gramsPer: { pcs: 350 } }),
  lf('fd-lambshoulder', 'Lamb shoulder, boneless', 'Karitsan lapa', 'meat', 'protein', 240, 18, 0, 19, { state: 'raw' }),
  lf('fd-porkbelly', 'Pork belly', 'Siankylki', 'meat', 'protein', 380, 14, 0, 36, { state: 'raw' }),
  lf('fd-porkshoulder', 'Pork shoulder or neck', 'Porsaan niska tai lapa', 'meat', 'protein', 230, 18, 0, 17, { state: 'raw' }),
  lf('fd-porkchop', 'Pork chop', 'Porsaankyljys', 'meat', 'protein', 175, 21, 0, 10, { state: 'raw' }),
  lf('fd-chickenthigh', 'Chicken thigh, boneless', 'Broilerin reisifilee', 'meat', 'protein', 175, 18, 0, 11, { state: 'raw' }),
  lf('fd-chickendrum', 'Chicken drumsticks and thighs', 'Broilerin koipireidet', 'meat', 'protein', 180, 17, 0, 12, { state: 'raw, bone in' }),
  lf('fd-chickenwing', 'Chicken wings', 'Broilerin siivet', 'meat', 'protein', 200, 18, 0, 14, { state: 'raw' }),
  lf('fd-rotisserie', 'Rotisserie chicken, whole', 'Grillattu broileri', 'meat', 'protein', 190, 25, 0, 10, { state: 'cooked', gramsPer: { pcs: 1200 } }),
  lf('fd-bacon', 'Bacon', 'Pekoni', 'meat', 'protein', 350, 14, 1, 32, { state: 'raw' }),
  lf('fd-pancetta', 'Pancetta or guanciale', 'Pancetta', 'meat', 'protein', 400, 15, 0, 38, { state: 'raw' }),
  lf('fd-ham', 'Cooked ham', 'Keittokinkku', 'meat', 'protein', 110, 18, 1, 4),
  lf('fd-chorizo', 'Chorizo', 'Chorizo', 'meat', 'protein', 380, 22, 2, 32),
  lf('fd-sausage', 'Smoked sausage, andouille', 'Savustettu makkara', 'meat', 'protein', 300, 15, 2, 26),
  lf('fd-italiansausage', 'Italian sausage meat', 'Italialainen makkaramassa', 'meat', 'protein', 320, 15, 1, 28, { state: 'raw' }),
  lf('fd-meatballs', 'Meatballs, ready-made', 'Lihapullat', 'meat', 'protein', 250, 14, 8, 18),

  // ---- fish ----
  lf('fd-prawns', 'Prawns, peeled', 'Katkaravut', 'fish', 'protein', 85, 18, 0, 1),

  // ---- dairy ----
  lf('fd-cream', 'Double cream 38%', 'Kuohukerma 38%', 'dairy', 'fat', 360, 2, 3, 38, { base: 'ml', gramsPer: { tbsp: 15 } }),
  lf('fd-singlecream', 'Single cream 15%', 'Ruokakerma 15%', 'dairy', 'fat', 155, 2.5, 4, 15, { base: 'ml', gramsPer: { tbsp: 15 } }),
  lf('fd-wholemilk', 'Whole milk 3.5%', 'Täysmaito 3,5%', 'dairy', 'other', 64, 3.3, 4.7, 3.5, { base: 'ml' }),
  lf('fd-yoghurt', 'Plain yoghurt, full fat', 'Maustamaton jogurtti', 'dairy', 'protein', 61, 3.5, 4.7, 3.3, { gramsPer: { tbsp: 15 } }),
  lf('fd-parmesan', 'Parmesan', 'Parmesaani', 'dairy', 'fat', 400, 33, 0, 29, { gramsPer: { tbsp: 6 } }),
  lf('fd-pecorino', 'Pecorino Romano', 'Pecorino', 'dairy', 'fat', 390, 32, 0, 28, { gramsPer: { tbsp: 6 } }),
  lf('fd-slicedcheese', 'Sliced cheese', 'Juustoviipale', 'dairy', 'protein', 350, 25, 1, 27, { gramsPer: { pcs: 20 } }),

  // ---- produce, alliums and aromatics ----
  lf('fd-springonion', 'Spring onion', 'Kevätsipuli', 'produce', 'veg', 32, 1.8, 4, 0.2, { gramsPer: { pcs: 15 } }),
  lf('fd-shallot', 'Shallot', 'Salottisipuli', 'produce', 'veg', 72, 2.5, 16, 0.1, { gramsPer: { pcs: 30, tbsp: 10 } }),
  lf('fd-redonion', 'Red onion', 'Punasipuli', 'produce', 'veg', 40, 1.1, 8, 0.1, { gramsPer: { pcs: 110 } }),
  lf('fd-leek', 'Leek', 'Purjo', 'produce', 'veg', 60, 1.5, 12, 0.3, { gramsPer: { pcs: 150 } }),
  lf('fd-celery', 'Celery', 'Varsiselleri', 'produce', 'veg', 16, 0.7, 2, 0.2, { gramsPer: { pcs: 45 } }),
  lf('fd-fennelbulb', 'Fennel bulb', 'Fenkoli', 'produce', 'veg', 31, 1.2, 5, 0.2, { gramsPer: { pcs: 250 } }),
  lf('fd-ginger', 'Fresh ginger', 'Inkivääri', 'produce', 'veg', 80, 1.8, 15, 0.8, { gramsPer: { tbsp: 8, tsp: 3 } }),
  lf('fd-lemongrass', 'Lemongrass', 'Sitruunaruoho', 'produce', 'veg', 99, 1.8, 25, 0.5, { gramsPer: { pcs: 20, tbsp: 6 } }),

  // ---- produce, chillies and peppers ----
  lf('fd-chili', 'Fresh chilli', 'Tuore chili', 'produce', 'veg', 40, 2, 9, 0.4, { gramsPer: { pcs: 15, tbsp: 9 } }),
  lf('fd-jalapeno', 'Jalapeño', 'Jalapeño', 'produce', 'veg', 29, 0.9, 6, 0.4, { gramsPer: { pcs: 25 } }),
  lf('fd-habanero', 'Habanero chilli', 'Habanero', 'produce', 'veg', 40, 2, 9, 0.4, { gramsPer: { pcs: 8 } }),
  lf('fd-bellpepper', 'Bell pepper', 'Paprika', 'produce', 'veg', 30, 1, 6, 0.3, { gramsPer: { pcs: 150 } }),

  // ---- produce, vegetables ----
  lf('fd-cherrytomato', 'Cherry tomatoes', 'Kirsikkatomaatit', 'produce', 'veg', 20, 0.9, 3.5, 0.2),
  lf('fd-mushroom', 'Mushrooms', 'Herkkusienet', 'produce', 'veg', 25, 3, 1, 0.4),
  lf('fd-shiitake', 'Shiitake mushrooms', 'Shiitake-sienet', 'produce', 'veg', 34, 2.2, 7, 0.5, { gramsPer: { pcs: 20 } }),
  lf('fd-zucchini', 'Courgette', 'Kesäkurpitsa', 'produce', 'veg', 17, 1.2, 3, 0.3, { gramsPer: { pcs: 300 } }),
  lf('fd-cabbage', 'White cabbage', 'Valkokaali', 'produce', 'veg', 25, 1.3, 5, 0.1),
  lf('fd-lettuce', 'Iceberg lettuce', 'Jäävuorisalaatti', 'produce', 'veg', 14, 0.9, 2, 0.1),
  lf('fd-bokchoy', 'Bok choy', 'Pak choi', 'produce', 'veg', 13, 1.5, 1, 0.2),
  lf('fd-daikon', 'Daikon radish', 'Retikka', 'produce', 'veg', 18, 0.6, 3.4, 0.1),

  // ---- produce, fruit ----
  lf('fd-lime', 'Lime', 'Limetti', 'produce', 'veg', 30, 0.7, 8, 0.2, { gramsPer: { pcs: 65 } }),
  lf('fd-limejuice', 'Lime juice', 'Limetinmehu', 'produce', 'veg', 25, 0.4, 8, 0.1, { base: 'ml', gramsPer: { tbsp: 15, tsp: 5 } }),
  lf('fd-lemonjuice', 'Lemon juice', 'Sitruunamehu', 'produce', 'veg', 22, 0.4, 7, 0.2, { base: 'ml', gramsPer: { tbsp: 15, tsp: 5 } }),
  lf('fd-orange', 'Orange', 'Appelsiini', 'produce', 'carb', 47, 0.9, 9, 0.1, { gramsPer: { pcs: 180 } }),
  lf('fd-orangejuice', 'Orange juice', 'Appelsiinimehu', 'produce', 'carb', 45, 0.7, 10, 0.2, { base: 'ml', gramsPer: { tbsp: 15 } }),
  lf('fd-pineapple', 'Pineapple', 'Ananas', 'produce', 'carb', 50, 0.5, 12, 0.1),
  lf('fd-pear', 'Pear', 'Päärynä', 'produce', 'carb', 57, 0.4, 13, 0.1, { gramsPer: { pcs: 170 } }),

  // ---- produce, fresh herbs ----
  lf('fd-coriander', 'Fresh coriander', 'Tuore korianteri', 'produce', 'veg', 23, 2.1, 1, 0.5, { gramsPer: { tbsp: 4 } }),
  lf('fd-parsley', 'Fresh parsley', 'Persilja', 'produce', 'veg', 36, 3, 3, 0.8, { gramsPer: { tbsp: 4 } }),
  lf('fd-basil', 'Fresh basil', 'Basilika', 'produce', 'veg', 23, 3.2, 1, 0.6, { gramsPer: { tbsp: 3, pcs: 0.5 } }),
  lf('fd-mint', 'Fresh mint', 'Minttu', 'produce', 'veg', 44, 3.3, 5, 0.7, { gramsPer: { tbsp: 4, pcs: 0.3 } }),
  lf('fd-thyme', 'Fresh thyme', 'Tuore timjami', 'produce', 'veg', 100, 5.6, 10, 1.7, { gramsPer: { tbsp: 3, tsp: 1 } }),
  lf('fd-rosemary', 'Fresh rosemary', 'Rosmariini', 'produce', 'veg', 130, 3.3, 10, 5.9, { gramsPer: { tbsp: 3, pcs: 3 } }),
  lf('fd-dillfresh', 'Fresh dill', 'Tilli', 'produce', 'veg', 43, 3.5, 3, 1.1, { gramsPer: { tbsp: 3 } }),
  lf('fd-oreganofresh', 'Fresh oregano', 'Tuore oregano', 'produce', 'veg', 70, 2.2, 9, 2, { gramsPer: { tbsp: 3 } }),

  // ---- pickles and preserves ----
  lf('fd-gherkin', 'Gherkin', 'Maustekurkku', 'dry', 'veg', 20, 0.6, 3, 0.2, { gramsPer: { pcs: 30 } }),
  lf('fd-pickledonion', 'Pickled onion', 'Pikkelöity sipuli', 'dry', 'veg', 40, 0.9, 8, 0.1),
  lf('fd-pickledcabbage', 'Pickled cabbage', 'Hapankaali', 'dry', 'veg', 20, 1, 4, 0.1),

  // ---- grains, noodles and starches, dry ----
  lf('fd-tofu', 'Firm tofu', 'Tofu', 'dry', 'protein', 145, 15, 3, 8),
  lf('fd-ricenoodle', 'Rice noodles', 'Riisinuudelit', 'dry', 'carb', 360, 6, 80, 0.5, { state: 'dry' }),
  lf('fd-wheatnoodle', 'Wheat noodles', 'Vehnänuudelit', 'dry', 'carb', 350, 12, 70, 1.5, { state: 'dry' }),
  lf('fd-jasminerice', 'Jasmine rice', 'Jasmiiniriisi', 'dry', 'carb', 355, 7, 78, 1, { state: 'dry' }),
  lf('fd-basmati', 'Basmati rice', 'Basmatiriisi', 'dry', 'carb', 350, 8, 77, 1, { state: 'dry' }),
  lf('fd-sushirice', 'Short-grain rice', 'Sushiriisi', 'dry', 'carb', 355, 6, 79, 0.6, { state: 'dry' }),
  lf('fd-orzo', 'Orzo', 'Orzo', 'dry', 'carb', 360, 12.5, 70, 1.5, { state: 'dry' }),
  lf('fd-flour', 'Wheat flour', 'Vehnäjauho', 'dry', 'carb', 345, 10, 72, 1.2, { gramsPer: { tbsp: 8 } }),
  lf('fd-riceflour', 'Rice flour', 'Riisijauho', 'dry', 'carb', 365, 6, 80, 1.4),
  lf('fd-oatflour', 'Oat flour', 'Kaurajauho', 'dry', 'carb', 375, 13, 60, 7),
  lf('fd-cornstarch', 'Cornflour', 'Maissitärkkelys', 'dry', 'carb', 380, 0.3, 91, 0.1, { gramsPer: { tbsp: 8, tsp: 3 } }),
  lf('fd-potatostarch', 'Potato starch', 'Perunajauho', 'dry', 'carb', 350, 0.1, 85, 0.1, { gramsPer: { tbsp: 10, tsp: 3 } }),
  lf('fd-panko', 'Panko breadcrumbs', 'Panko-korppujauho', 'dry', 'carb', 370, 12, 72, 2),
  lf('fd-breadcrumbs', 'Breadcrumbs', 'Korppujauho', 'dry', 'carb', 380, 13, 72, 4),
  lf('fd-cornflakes', 'Cornflakes', 'Maissihiutaleet', 'dry', 'carb', 380, 7, 84, 1),
  lf('fd-kidneybeans', 'Kidney beans, canned', 'Kidneypavut, säilyke', 'dry', 'protein', 100, 7, 13, 0.5, { state: 'drained' }),
  lf('fd-cashews', 'Cashews', 'Cashewpähkinät', 'dry', 'fat', 580, 18, 27, 44, { gramsPer: { tbsp: 15 } }),
  lf('fd-sesameseed', 'Sesame seeds', 'Seesaminsiemenet', 'dry', 'fat', 570, 17, 23, 50, { gramsPer: { tbsp: 9, tsp: 3 } }),
  lf('fd-darkchocolate', 'Dark chocolate 85%', 'Tumma suklaa 85%', 'dry', 'fat', 590, 10, 20, 50),

  // ---- bakery ----
  lf('fd-baguette', 'Baguette', 'Patonki', 'bakery', 'carb', 270, 9, 52, 2, { gramsPer: { pcs: 250 } }),
  lf('fd-briochebun', 'Brioche bun', 'Briossisämpylä', 'bakery', 'carb', 320, 9, 50, 10, { gramsPer: { pcs: 70 } }),
  lf('fd-tortilla', 'Tortilla', 'Tortilla', 'bakery', 'carb', 300, 8, 50, 7, { gramsPer: { pcs: 45 } }),
  lf('fd-lavash', 'Lavash bread', 'Lavash-leipä', 'bakery', 'carb', 280, 9, 55, 2, { gramsPer: { pcs: 70 } }),
  lf('fd-naan', 'Naan bread', 'Naan-leipä', 'bakery', 'carb', 290, 9, 50, 6, { gramsPer: { pcs: 90 } }),

  // ---- tinned tomato, stock and other wet store cupboard ----
  lf('fd-passata', 'Passata', 'Tomaattipyre', 'dry', 'veg', 32, 1.4, 6, 0.2, { base: 'ml' }),
  lf('fd-tomatopaste', 'Tomato paste', 'Tomaattisose', 'dry', 'veg', 85, 4, 15, 0.5, { gramsPer: { tbsp: 16, tsp: 5 } }),
  lf('fd-coconutmilk', 'Coconut milk', 'Kookosmaito', 'dry', 'fat', 190, 2, 3, 19, { base: 'ml' }),
  lf('fd-chickenstock', 'Chicken stock', 'Kanaliemi', 'dry', 'other', 6, 1, 0.4, 0.2, { base: 'ml' }),
  lf('fd-beefstock', 'Beef or veal stock', 'Liha- tai vasikkaliemi', 'dry', 'other', 7, 1.2, 0.4, 0.2, { base: 'ml' }),
  lf('fd-vegstock', 'Vegetable stock', 'Kasvisliemi', 'dry', 'other', 5, 0.3, 0.8, 0.1, { base: 'ml' }),
  lf('fd-dashi', 'Dashi, bonito stock', 'Dashi-liemi', 'dry', 'other', 4, 0.6, 0.3, 0, { base: 'ml' }),
  lf('fd-stockcube', 'Stock cube or bouillon powder', 'Liemikuutio', 'dry', 'other', 230, 12, 20, 10, { gramsPer: { pcs: 10, tbsp: 9, tsp: 3 } }),

  // ---- oils ----
  lf('fd-vegoil', 'Neutral oil', 'Neutraali öljy', 'dry', 'fat', 900, 0, 0, 100, { base: 'ml', gramsPer: { tbsp: 13.5, tsp: 4.5 } }),
  lf('fd-sesameoil', 'Sesame oil', 'Seesamiöljy', 'dry', 'fat', 900, 0, 0, 100, { base: 'ml', gramsPer: { tbsp: 13.5, tsp: 4.5 } }),
  lf('fd-chilioil', 'Chilli oil', 'Chiliöljy', 'dry', 'fat', 880, 1, 2, 97, { base: 'ml', gramsPer: { tbsp: 13.5, tsp: 4.5 } }),

  // ---- bottled sauces and pastes ----
  lf('fd-darksoy', 'Dark soy sauce', 'Tumma soijakastike', 'dry', 'other', 90, 4, 15, 0, { base: 'ml', gramsPer: { tbsp: 18, tsp: 6 } }),
  lf('fd-kecapmanis', 'Sweet soy sauce, kecap manis', 'Makea soijakastike', 'dry', 'carb', 250, 3, 55, 0.1, { base: 'ml', gramsPer: { tbsp: 20, tsp: 7 } }),
  lf('fd-oystersauce', 'Oyster sauce', 'Osterikastike', 'dry', 'other', 120, 2, 25, 0.2, { base: 'ml', gramsPer: { tbsp: 18, tsp: 6 } }),
  lf('fd-fishsauce', 'Fish sauce', 'Kalakastike', 'dry', 'other', 50, 8, 4, 0, { base: 'ml', gramsPer: { tbsp: 18, tsp: 6 } }),
  lf('fd-worcestershire', 'Worcestershire sauce', 'Worcestershire-kastike', 'dry', 'other', 80, 0, 20, 0, { base: 'ml', gramsPer: { tbsp: 17, tsp: 6 } }),
  lf('fd-ketchup', 'Ketchup', 'Ketsuppi', 'dry', 'carb', 110, 1.2, 26, 0.1, { gramsPer: { tbsp: 15, tsp: 5 } }),
  lf('fd-mustard', 'Mustard', 'Sinappi', 'dry', 'other', 100, 6, 6, 6, { gramsPer: { tbsp: 15, tsp: 5 } }),
  lf('fd-mayo', 'Mayonnaise', 'Majoneesi', 'dry', 'fat', 680, 1, 2, 74, { gramsPer: { tbsp: 14, tsp: 5 } }),
  lf('fd-lightmayo', 'Light mayonnaise', 'Kevytmajoneesi', 'dry', 'fat', 300, 1, 8, 29, { gramsPer: { tbsp: 14, tsp: 5 } }),
  lf('fd-bbqsauce', 'Barbecue sauce', 'Barbecue-kastike', 'dry', 'carb', 170, 0.8, 40, 0.5, { gramsPer: { tbsp: 17, tsp: 6 } }),
  lf('fd-sriracha', 'Sriracha', 'Sriracha', 'dry', 'other', 100, 1, 20, 0.5, { gramsPer: { tbsp: 16, tsp: 5 } }),
  lf('fd-sweetchilli', 'Sweet chilli sauce', 'Makea chilikastike', 'dry', 'carb', 230, 0.6, 55, 0.2, { gramsPer: { tbsp: 20, tsp: 7 } }),
  lf('fd-chiligarlic', 'Chilli garlic sauce', 'Chili-valkosipulikastike', 'dry', 'other', 60, 1, 12, 0.5, { gramsPer: { tbsp: 16, tsp: 5 } }),
  lf('fd-blackpeppersauce', 'Black pepper sauce', 'Mustapippurikastike', 'dry', 'other', 120, 2, 20, 3, { gramsPer: { tbsp: 18, tsp: 6 } }),
  lf('fd-gochujang', 'Gochujang', 'Gochujang', 'dry', 'other', 220, 5, 45, 1.5, { gramsPer: { tbsp: 20, tsp: 7 } }),
  lf('fd-doenjang', 'Doenjang, soybean paste', 'Doenjang', 'dry', 'other', 200, 12, 20, 7, { gramsPer: { tbsp: 18, tsp: 6 } }),
  lf('fd-doubanjiang', 'Doubanjiang, chilli bean paste', 'Doubanjiang', 'dry', 'other', 150, 8, 15, 5, { gramsPer: { tbsp: 18, tsp: 6 } }),
  lf('fd-miso', 'Miso paste', 'Misotahna', 'dry', 'other', 200, 12, 26, 6, { gramsPer: { tbsp: 18, tsp: 6 } }),
  lf('fd-harissa', 'Harissa paste', 'Harissa', 'dry', 'other', 180, 3, 10, 15, { gramsPer: { tbsp: 16, tsp: 5 } }),
  lf('fd-currypaste', 'Curry paste', 'Currytahna', 'dry', 'other', 150, 3, 12, 10, { gramsPer: { tbsp: 16, tsp: 5 } }),
  lf('fd-salsa', 'Salsa', 'Salsa', 'dry', 'veg', 35, 1.5, 7, 0.2, { gramsPer: { tbsp: 16 } }),
  lf('fd-teriyaki', 'Teriyaki sauce', 'Teriyaki-kastike', 'dry', 'carb', 160, 3, 35, 0, { base: 'ml', gramsPer: { tbsp: 18, tsp: 6 } }),
  lf('fd-wasabi', 'Wasabi paste', 'Wasabi', 'dry', 'other', 290, 7, 60, 10, { gramsPer: { tbsp: 15, tsp: 5 } }),
  lf('fd-blackbeansalted', 'Salted black beans', 'Suolatut mustapavut', 'dry', 'other', 200, 20, 20, 6, { gramsPer: { tbsp: 15, tsp: 5 } }),
  lf('fd-nori', 'Nori', 'Nori-levä', 'dry', 'other', 350, 40, 45, 2, { gramsPer: { pcs: 3 } }),

  // ---- vinegars, wines and spirits ----
  lf('fd-vinegar', 'Vinegar', 'Etikka', 'dry', 'other', 20, 0, 1, 0, { base: 'ml', gramsPer: { tbsp: 15, tsp: 5 } }),
  lf('fd-balsamic', 'Balsamic vinegar', 'Balsamiviinietikka', 'dry', 'other', 90, 0.5, 17, 0, { base: 'ml', gramsPer: { tbsp: 16, tsp: 5 } }),
  lf('fd-mirin', 'Mirin', 'Mirin', 'dry', 'carb', 230, 0.2, 43, 0, { base: 'ml', gramsPer: { tbsp: 18, tsp: 6 } }),
  lf('fd-sake', 'Sake', 'Sake', 'dry', 'other', 130, 0.5, 5, 0, { base: 'ml', gramsPer: { tbsp: 15, tsp: 5 } }),
  lf('fd-shaoxing', 'Shaoxing rice wine', 'Shaoxing-riisiviini', 'dry', 'other', 130, 0.5, 5, 0, { base: 'ml', gramsPer: { tbsp: 15, tsp: 5 } }),
  lf('fd-redwine', 'Red wine', 'Punaviini', 'dry', 'other', 85, 0.1, 2.6, 0, { base: 'ml', gramsPer: { tbsp: 15 } }),
  lf('fd-whitewine', 'White wine', 'Valkoviini', 'dry', 'other', 82, 0.1, 2.6, 0, { base: 'ml', gramsPer: { tbsp: 15 } }),
  lf('fd-cognac', 'Cognac', 'Konjakki', 'dry', 'other', 250, 0, 0, 0, { base: 'ml', gramsPer: { tbsp: 15 } }),
  lf('fd-vodka', 'Vodka', 'Vodka', 'dry', 'other', 230, 0, 0, 0, { base: 'ml', gramsPer: { tbsp: 15 } }),
  lf('fd-beer', 'Beer, pale ale', 'Olut', 'dry', 'other', 45, 0.5, 3.5, 0, { base: 'ml' }),
  lf('fd-cider', 'Dry cider', 'Kuiva siideri', 'dry', 'other', 40, 0, 2.5, 0, { base: 'ml' }),
  lf('fd-coffee', 'Brewed coffee', 'Kahvi', 'dry', 'other', 2, 0.1, 0, 0, { base: 'ml' }),

  // ---- sugars and syrups ----
  lf('fd-sugar', 'Sugar', 'Sokeri', 'dry', 'carb', 400, 0, 100, 0, { gramsPer: { tbsp: 12, tsp: 4 } }),
  lf('fd-brownsugar', 'Brown sugar or muscovado', 'Fariinisokeri', 'dry', 'carb', 380, 0, 98, 0, { gramsPer: { tbsp: 13, tsp: 4 } }),
  lf('fd-palmsugar', 'Palm sugar', 'Palmusokeri', 'dry', 'carb', 380, 0, 95, 0, { gramsPer: { tbsp: 15, tsp: 5 } }),
  lf('fd-molasses', 'Molasses', 'Tumma siirappi', 'dry', 'carb', 290, 0, 75, 0, { gramsPer: { tbsp: 20, tsp: 7 } }),
  lf('fd-maplesyrup', 'Maple syrup', 'Vaahterasiirappi', 'dry', 'carb', 260, 0, 67, 0, { gramsPer: { tbsp: 20, tsp: 7 } }),

  // ---- salt, raising agents and seasoning ----
  lf('fd-salt', 'Salt', 'Suola', 'dry', 'other', 0, 0, 0, 0, { gramsPer: { tbsp: 18, tsp: 6 } }),
  lf('fd-bakingsoda', 'Bicarbonate of soda', 'Ruokasooda', 'dry', 'other', 0, 0, 0, 0, { gramsPer: { tbsp: 14, tsp: 5 } }),
  lf('fd-bakingpowder', 'Baking powder', 'Leivinjauhe', 'dry', 'other', 55, 0, 28, 0, { gramsPer: { tbsp: 12, tsp: 4 } }),
  lf('fd-msg', 'MSG', 'Natriumglutamaatti', 'dry', 'other', 0, 0, 0, 0, { gramsPer: { tbsp: 12, tsp: 4 } }),

  // ---- dried spices and herbs ----
  lf('fd-blackpepper', 'Black pepper', 'Mustapippuri', 'dry', 'other', 250, 10, 64, 3, { gramsPer: { tbsp: 7, tsp: 2.3 } }),
  lf('fd-whitepepper', 'White pepper', 'Valkopippuri', 'dry', 'other', 300, 10, 69, 2, { gramsPer: { tbsp: 7, tsp: 2.4 } }),
  lf('fd-sichuanpepper', 'Sichuan peppercorns', 'Sichuaninpippuri', 'dry', 'other', 300, 10, 60, 10, { gramsPer: { tbsp: 6, tsp: 2, pcs: 0.05 } }),
  lf('fd-paprika', 'Paprika powder', 'Paprikajauhe', 'dry', 'other', 280, 14, 54, 13, { gramsPer: { tbsp: 7, tsp: 2.3 } }),
  lf('fd-cayenne', 'Cayenne pepper', 'Cayennepippuri', 'dry', 'other', 320, 12, 57, 17, { gramsPer: { tbsp: 5.3, tsp: 1.8 } }),
  lf('fd-chilipowder', 'Chilli powder', 'Chilijauhe', 'dry', 'other', 280, 13, 50, 14, { gramsPer: { tbsp: 8, tsp: 2.6 } }),
  lf('fd-chiliflakes', 'Chilli flakes', 'Chilihiutaleet', 'dry', 'other', 280, 12, 50, 13, { gramsPer: { tbsp: 7, tsp: 2 } }),
  lf('fd-driedchili', 'Dried chillies', 'Kuivatut chilit', 'dry', 'other', 280, 12, 50, 13, { gramsPer: { pcs: 5 } }),
  lf('fd-cumin', 'Cumin', 'Juustokumina', 'dry', 'other', 375, 18, 44, 22, { gramsPer: { tbsp: 6, tsp: 2 } }),
  lf('fd-groundcoriander', 'Ground coriander', 'Korianterijauhe', 'dry', 'other', 300, 12, 55, 17, { gramsPer: { tbsp: 5, tsp: 1.8 } }),
  lf('fd-turmeric', 'Turmeric', 'Kurkuma', 'dry', 'other', 310, 10, 65, 3, { gramsPer: { tbsp: 9, tsp: 3 } }),
  lf('fd-garammasala', 'Garam masala', 'Garam masala', 'dry', 'other', 380, 14, 45, 15, { gramsPer: { tbsp: 6, tsp: 2 } }),
  lf('fd-fivespice', 'Chinese five spice', 'Viiden mausteen jauhe', 'dry', 'other', 350, 12, 50, 15, { gramsPer: { tbsp: 6, tsp: 2 } }),
  lf('fd-tacoseasoning', 'Taco seasoning', 'Tacomauste', 'dry', 'other', 300, 10, 50, 7, { gramsPer: { pcs: 30, tbsp: 8, tsp: 2.7 } }),
  lf('fd-garlicpowder', 'Garlic powder', 'Valkosipulijauhe', 'dry', 'other', 330, 17, 72, 0.7, { gramsPer: { tbsp: 9, tsp: 3 } }),
  lf('fd-onionpowder', 'Onion powder', 'Sipulijauhe', 'dry', 'other', 340, 10, 79, 1, { gramsPer: { tbsp: 7, tsp: 2.4 } }),
  lf('fd-groundginger', 'Ground ginger', 'Inkiväärijauhe', 'dry', 'other', 335, 9, 72, 4, { gramsPer: { tbsp: 5.4, tsp: 1.8 } }),
  lf('fd-driedthyme', 'Dried thyme', 'Kuivattu timjami', 'dry', 'other', 275, 9, 64, 7, { gramsPer: { tbsp: 3, tsp: 1 } }),
  lf('fd-driedbasil', 'Dried basil', 'Kuivattu basilika', 'dry', 'other', 235, 23, 48, 4, { gramsPer: { tbsp: 3, tsp: 1 } }),
  lf('fd-driedoregano', 'Dried oregano', 'Kuivattu oregano', 'dry', 'other', 265, 9, 69, 4, { gramsPer: { tbsp: 3, tsp: 1 } }),
  lf('fd-drieddill', 'Dried dill', 'Kuivattu tilli', 'dry', 'other', 250, 20, 56, 4, { gramsPer: { tbsp: 3, tsp: 1 } }),
  lf('fd-bayleaf', 'Bay leaves', 'Laakerinlehdet', 'dry', 'other', 310, 7, 75, 8, { gramsPer: { pcs: 0.2 } }),
  lf('fd-staranise', 'Star anise', 'Tähtianis', 'dry', 'other', 340, 18, 50, 16, { gramsPer: { pcs: 1, tsp: 2 } }),
  lf('fd-cinnamon', 'Cinnamon', 'Kaneli', 'dry', 'other', 250, 4, 81, 1.2, { gramsPer: { pcs: 3, tbsp: 8, tsp: 2.6 } }),
  lf('fd-allspice', 'Allspice', 'Maustepippuri', 'dry', 'other', 260, 6, 72, 9, { gramsPer: { tbsp: 6, tsp: 2 } }),
  lf('fd-nutmeg', 'Nutmeg', 'Muskotti', 'dry', 'other', 525, 6, 49, 36, { gramsPer: { tbsp: 7, tsp: 2.2 } }),
  lf('fd-clove', 'Cloves', 'Neilikka', 'dry', 'other', 275, 6, 66, 13, { gramsPer: { tbsp: 6, tsp: 2 } }),
  lf('fd-fennelseed', 'Fennel seeds', 'Fenkolinsiemenet', 'dry', 'other', 345, 16, 52, 15, { gramsPer: { tbsp: 6, tsp: 2 } }),
  lf('fd-fenugreek', 'Fenugreek seeds', 'Sarviapilansiemenet', 'dry', 'other', 320, 23, 58, 6, { gramsPer: { tbsp: 11, tsp: 4 } }),
  lf('fd-driedorangepeel', 'Dried orange peel', 'Kuivattu appelsiininkuori', 'dry', 'other', 300, 4, 70, 1, { gramsPer: { pcs: 2 } }),
];

/**
 * Everything a fresh planner starts with: the staples, then the ingredients
 * the recipe library needs. One list, because a food id has to resolve
 * whichever half of the library a recipe came from.
 */
export const allFoods: FoodItem[] = [...seedFoods, ...libraryFoods];
