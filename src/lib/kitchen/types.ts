// The meal planner's data model.
//
// Four decisions here are load-bearing. None is recoverable cheaply once a
// recipe library has been typed in, so they are stated before the types.
//
// 1. INGREDIENTS ARE AN ENTITY, NOT A STRING ON A RECIPE.
//    A FoodItem carries macros per 100 g and is referenced by recipes, which
//    hold quantities. So "chicken breast, 400 g" resolves its own nutrition,
//    and changing that 400 to 600 recomputes the recipe rather than requiring
//    four numbers to be recalculated by hand. This is not about typing less —
//    at a small library, deriving is MORE data entry than stating macros
//    directly, and the break-even is somewhere around a hundred recipes. It is
//    about the arithmetic not being the cook's job, and staying right when a
//    quantity changes.
//
// 2. FOOD MACROS ARE STATED AS BOUGHT: RAW MEAT, DRY GRAINS.
//    The single most destructive ambiguity available here. 100 g of dry rice
//    is around 360 kcal; cooked, around 130. Chicken sheds roughly a quarter
//    of its weight in the pan. A library that says "per 100 g" without pinning
//    the state is wrong by up to threefold and silent about it. As-bought is
//    the convention that makes one number serve both jobs, because the
//    shopping list needs purchase weights anyway.
//
// 3. MACROS ARE PER SERVING. RECIPE LINES ARE PER BATCH.
//    A recipe serving four lists the shopping for all four and the nutrition
//    for one. Both consumers stay correct: a plan slot eats servings, a
//    shopping list buys batches.
//
// 4. NOTHING PERSONAL IS A CONSTANT.
//    Body weight, targets, deficit, rest-day figure, what a session costs,
//    when the meals are and what share each carries — all in Settings, all
//    editable.

export type ISODate = string; // YYYY-MM-DD
export type WeekKey = string; // ISO week, e.g. "2026-W34"
export type Id = string;

/** Monday-first, matching ISO weeks and Finnish calendars. */
export const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;
export type Day = (typeof DAYS)[number];

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ---------------------------------------------------------------------------
// Foods
// ---------------------------------------------------------------------------

/**
 * Units a recipe line may be written in. Mass and volume convert against a
 * food's base directly; pieces and spoons need the food to declare what one
 * weighs, which is what `gramsPer` is for.
 */
export type Unit = 'g' | 'kg' | 'ml' | 'l' | 'pcs' | 'tbsp' | 'tsp';

export const UNITS: Unit[] = ['g', 'kg', 'ml', 'l', 'pcs', 'tbsp', 'tsp'];

/** Where it sits in the shop. Drives the grouping of the shopping list. */
export type Aisle =
  | 'produce'
  | 'meat'
  | 'fish'
  | 'dairy'
  | 'dry'
  | 'frozen'
  | 'bakery'
  | 'other';

export const AISLES: Aisle[] = [
  'produce',
  'meat',
  'fish',
  'dairy',
  'dry',
  'frozen',
  'bakery',
  'other',
];

export const AISLE_LABELS: Record<Aisle, string> = {
  produce: 'Produce',
  meat: 'Meat',
  fish: 'Fish',
  dairy: 'Dairy & eggs',
  dry: 'Dry goods',
  frozen: 'Frozen',
  bakery: 'Bakery',
  other: 'Other',
};

/**
 * What a food is FOR, which decides whether the generator may move it.
 *
 * Carbohydrate is the adjustable part of a meal, and that is not an arbitrary
 * choice: protein and fat targets track body weight and barely move, so every
 * calorie training adds and every calorie a deficit removes has to arrive or
 * leave as carbohydrate. Rice and potatoes are the dial. Chicken is not.
 */
export type FoodRole = 'protein' | 'carb' | 'fat' | 'veg' | 'other';

export const FOOD_ROLES: FoodRole[] = ['protein', 'carb', 'fat', 'veg', 'other'];

export interface FoodItem {
  id: Id;
  /** English name. */
  name: string;
  /** Finnish name, shown first in the shopping list. */
  fi?: string;
  aisle: Aisle;
  role: FoodRole;
  /** Macros per 100 of `base`, AS BOUGHT. See note 2 at the top of this file. */
  per100: Macros;
  base: 'g' | 'ml';
  /**
   * What one piece or spoonful weighs, so a recipe can say "1 banana" or
   * "2 tbsp oil" and still resolve to grams. Missing entries simply make that
   * unit unavailable for this food rather than guessing.
   */
  gramsPer?: Partial<Record<'pcs' | 'tbsp' | 'tsp', number>>;
  /** "raw", "dry", "drained" — shown in the picker to keep note 2 honest. */
  state?: string;
  example?: boolean;
}

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

export interface RecipeLine {
  foodId: Id;
  /** Quantity for the WHOLE batch — i.e. for `Recipe.serves` servings. */
  qty: number;
  unit: Unit;
  /**
   * Override the food's role-derived adjustability for this recipe only.
   * Rice in a stir-fry is a dial; rice in a rice pudding is structural.
   */
  flex?: boolean;
}

export interface Recipe {
  id: Id;
  name: string;
  /**
   * Where the per-serving macros come from.
   *
   * 'derived' computes them from the lines, which is the default and the
   * point of the whole exercise. 'manual' takes the `macros` field as typed —
   * the escape hatch for a protein bar, a restaurant meal, or anything else
   * not worth itemising. Without it the model would be a cage.
   */
  macroSource: 'derived' | 'manual';
  /**
   * Per SERVING. Authoritative when macroSource is 'manual'; a cache of the
   * computed value when 'derived', so that reading a recipe never requires
   * the food library to be at hand.
   */
  macros: Macros;
  /** How many servings one batch makes. Lines are sized for this. */
  serves: number;
  lines: RecipeLine[];
  prepMinutes: number;
  /** Which slots this recipe suits. Used by the auto-planner, not enforced. */
  mealTypes: string[];
  /** Cooks in bulk and keeps — what makes a Sunday cook worth doing. */
  batchFriendly: boolean;
  notes?: string;
  example?: boolean;
}

// ---------------------------------------------------------------------------
// Training
// ---------------------------------------------------------------------------

export interface SessionType {
  id: Id;
  name: string;
  /** Estimated kcal cost of one session. Editable, and only ever an estimate. */
  kcal: number;
  /** Adds the protein bonus on days that include this session. */
  strength: boolean;
}

/** Counts per session type for one day, e.g. { athletics: 1, gym: 1 }. */
export type DayTraining = Record<Id, number>;

/** A week's training. Keyed by week, never global. */
export type WeekTraining = Partial<Record<Day, DayTraining>>;

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

export interface PlanEntry {
  recipeId: Id;
  /** Servings eaten in this slot. Batch cooking is several slots, one recipe. */
  portions: number;
  consumed: boolean;
  /**
   * Extra (or less) of a flexible food, in grams PER SERVING, for this planned
   * instance only.
   *
   * It cannot live on the recipe, because the recipe is shared and adjusting it
   * for Tuesday would silently rewrite Thursday. Putting it on the plan entry
   * also happens to match how the cooking really goes: the batch is the recipe,
   * the extra rice goes on the plate.
   */
  adjustments?: Record<Id, number>;
  /**
   * Macros frozen when the meal was marked eaten. A plan is a forecast and
   * should track the recipe; a record of what was eaten must not move because
   * the recipe was retuned in November.
   */
  eatenMacros?: Macros;
}

/** One day: slot id -> entry. */
export type DayPlan = Record<Id, PlanEntry>;

/** One week: day -> day plan. */
export type WeekPlan = Partial<Record<Day, DayPlan>>;

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export interface MealSlotDef {
  id: Id;
  name: string;
  /** HH:MM, informational — the planner does not schedule against it. */
  time: string;
  /** Share of the day's energy, 0-1. The auto-planner aims each slot at this. */
  share: number;
}

export interface Settings {
  /**
   * Rest-day total energy, NOT basal metabolic rate.
   *
   * A starting estimate and nothing more. Published equations assume
   * able-bodied lean mass and ambulatory background movement, and overstate
   * resting expenditure for wheelchair athletes. The honest calibration is the
   * weight log: if the trend does not match what this number predicts, this
   * number is wrong, not the scale.
   */
  restDayKcal: number;
  /** Daily deficit. Negative for a surplus. */
  dailyDeficit: number;

  proteinPerKg: number;
  /** Extra grams of protein on days containing a strength session. */
  proteinStrengthBonus: number;
  fatPerKg: number;

  weightKg: number;
  goalWeightKg: number | null;
  goalDate: ISODate | null;

  sessionTypes: SessionType[];
  mealSlots: MealSlotDef[];

  /** Let the generator move flexible foods to close a day's energy gap. */
  tuneIngredients: boolean;
}

// ---------------------------------------------------------------------------
// Weight log
// ---------------------------------------------------------------------------

export interface WeightEntry {
  date: ISODate;
  kg: number;
}

// ---------------------------------------------------------------------------
// Persisted state
// ---------------------------------------------------------------------------

export const STATE_VERSION = 2;

export interface KitchenState {
  version: number;
  settings: Settings;
  foods: FoodItem[];
  recipes: Recipe[];
  plans: Record<WeekKey, WeekPlan>;
  training: Record<WeekKey, WeekTraining>;
  weights: WeightEntry[];
  /** Ticked-off shopping lines, per week. Keyed `${week}::${aisle}::${item}`. */
  bought: Record<string, boolean>;
}
