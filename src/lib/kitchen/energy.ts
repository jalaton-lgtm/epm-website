// Targets, totals, and the auto-planner.
//
// The shape of the energy model is the prototype's and it is a good one: a
// rest-day baseline, plus the cost of whatever training the day actually
// holds, minus a deficit. What changed is that every number in it is a setting
// rather than a literal, and that carbohydrate and fat get targets too instead
// of being displayed without one.
//
// Carbohydrate is the remainder, and that is on purpose. Protein tracks body
// weight and barely moves; fat tracks body weight and barely moves; so
// everything training adds arrives as carbohydrate and everything the deficit
// removes leaves as carbohydrate. Periodising carbs to training load is what
// most sports-nutrition guidance has you do by hand, and here it falls out of
// the arithmetic. It is also why the generator, when it is allowed to move an
// ingredient, moves a carbohydrate one.
//
// None of these numbers are prescriptions. They are the arithmetic consequence
// of settings the user chose, and the interface says as much.

import type {
  Day,
  DayPlan,
  DayTraining,
  FoodItem,
  Id,
  ISODate,
  Macros,
  PlanEntry,
  Recipe,
  Settings,
  WeekPlan,
  WeightEntry,
} from './types';
import { DAYS } from './types';
import {
  addMacros,
  isFlexible,
  macrosOfGrams,
  recipeMacros,
  toBaseAmount,
  ZERO_MACROS,
} from './foods';
import { daysBetween } from './weeks';

export const ZERO: Macros = ZERO_MACROS;

/**
 * Energy in a kilogram of body mass, used to turn a weight trend into an
 * energy balance. ~7700 kcal is the conventional figure for mixed tissue. It
 * is an approximation and the estimate built on it is labelled as one.
 */
export const KCAL_PER_KG = 7700;

export interface DayTargets extends Macros {
  /** The training component, broken out so the interface can show its working. */
  trainingKcal: number;
  hasStrength: boolean;
  sessions: number;
  /** Set when protein and fat alone already exceed the energy target. */
  warning?: string;
}

export function trainingKcalOf(training: DayTraining | undefined, settings: Settings): number {
  if (!training) return 0;
  return settings.sessionTypes.reduce((sum, t) => sum + (training[t.id] ?? 0) * t.kcal, 0);
}

export function sessionCountOf(training: DayTraining | undefined): number {
  if (!training) return 0;
  return Object.values(training).reduce((a, b) => a + (b || 0), 0);
}

export function hasStrengthSession(
  training: DayTraining | undefined,
  settings: Settings
): boolean {
  if (!training) return false;
  return settings.sessionTypes.some((t) => t.strength && (training[t.id] ?? 0) > 0);
}

export function dayTargets(training: DayTraining | undefined, settings: Settings): DayTargets {
  const trainingKcal = trainingKcalOf(training, settings);
  const strength = hasStrengthSession(training, settings);

  const kcal = Math.round(settings.restDayKcal + trainingKcal - settings.dailyDeficit);
  const protein = Math.round(
    settings.weightKg * settings.proteinPerKg + (strength ? settings.proteinStrengthBonus : 0)
  );
  const fat = Math.round(settings.weightKg * settings.fatPerKg);

  const remaining = kcal - protein * 4 - fat * 9;
  const carbs = Math.round(Math.max(0, remaining) / 4);

  return {
    kcal,
    protein,
    carbs,
    fat,
    trainingKcal,
    hasStrength: strength,
    sessions: sessionCountOf(training),
    warning:
      remaining < 0
        ? 'Protein and fat alone exceed the energy target, so there is nothing left for carbohydrate. Lower the per-kg figures or raise the energy target.'
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------

const scale = (m: Macros, k: number): Macros => ({
  kcal: m.kcal * k,
  protein: m.protein * k,
  carbs: m.carbs * k,
  fat: m.fat * k,
});

/**
 * One serving of a planned entry, adjustments included.
 *
 * Kept separate from the portion multiplier because adjustments are expressed
 * per serving — the batch is the recipe, the extra rice goes on the plate.
 */
export function entryMacrosPerServing(
  entry: PlanEntry,
  recipes: Recipe[],
  foods: FoodItem[]
): Macros {
  if (entry.consumed && entry.eatenMacros) return entry.eatenMacros;
  const recipe = recipes.find((r) => r.id === entry.recipeId);
  if (!recipe) return { ...ZERO };

  let per = recipeMacros(recipe, foods);
  if (entry.adjustments) {
    const index = new Map(foods.map((f) => [f.id, f]));
    for (const [foodId, grams] of Object.entries(entry.adjustments)) {
      if (!grams) continue;
      per = addMacros(per, macrosOfGrams(index.get(foodId), grams));
    }
  }
  return per;
}

/** What a planned entry contributes in total: one serving times the portions. */
export function entryMacros(entry: PlanEntry, recipes: Recipe[], foods: FoodItem[]): Macros {
  return scale(entryMacrosPerServing(entry, recipes, foods), entry.portions || 1);
}

/**
 * What a day adds up to.
 *
 * A consumed meal is counted from the macros frozen when it was ticked; an
 * unconsumed one is counted from the recipe as it stands now. A plan is a
 * forecast and should follow the recipe; a record of what was eaten should not
 * move because the recipe was retuned afterwards.
 */
export function dayTotals(
  plan: DayPlan | undefined,
  recipes: Recipe[],
  foods: FoodItem[]
): Macros {
  if (!plan) return { ...ZERO };
  let out: Macros = { ...ZERO };
  for (const entry of Object.values(plan)) {
    if (!entry) continue;
    out = addMacros(out, entryMacros(entry, recipes, foods));
  }
  return out;
}

export function weekTotals(
  plan: WeekPlan | undefined,
  recipes: Recipe[],
  foods: FoodItem[]
): Macros {
  let out: Macros = { ...ZERO };
  if (!plan) return out;
  for (const day of DAYS) out = addMacros(out, dayTotals(plan[day], recipes, foods));
  return out;
}

export interface Adherence {
  planned: number;
  consumed: number;
  percent: number;
}

export function weekAdherence(plan: WeekPlan | undefined): Adherence {
  let planned = 0;
  let consumed = 0;
  if (plan) {
    for (const day of DAYS) {
      for (const entry of Object.values(plan[day] ?? {})) {
        if (!entry) continue;
        planned++;
        if (entry.consumed) consumed++;
      }
    }
  }
  return { planned, consumed, percent: planned ? (consumed / planned) * 100 : 0 };
}

// ---------------------------------------------------------------------------
// Auto-planner
// ---------------------------------------------------------------------------

interface FlexCandidate {
  slotId: Id;
  foodId: Id;
  /** Grams of this food in one serving, before adjustment. */
  perServingGrams: number;
  kcalPer100: number;
  portions: number;
}

/**
 * Fill a week.
 *
 * Two things the prototype's version lacked. A repeat penalty gives variety —
 * but variety and batch cooking want opposite things, so the penalty does not
 * apply to a batch-friendly recipe until it has been used as many times as it
 * has servings: a tray of four is MEANT to appear on four plates, and only the
 * fifth appearance is monotony. And each slot is scored against the day's
 * running total rather than in isolation, because five individually sensible
 * choices otherwise add up to twice the day's protein.
 *
 * Then, if `tuneIngredients` is on, a final pass per day nudges the flexible
 * foods to close whatever energy gap is left.
 */
export function autoPlanWeek(
  training: Partial<Record<Day, DayTraining>>,
  settings: Settings,
  recipes: Recipe[],
  foods: FoodItem[]
): WeekPlan {
  const plan: WeekPlan = {};
  if (recipes.length === 0) return plan;

  const foodIndex = new Map(foods.map((f) => [f.id, f]));
  const macrosOf = (r: Recipe) => recipeMacros(r, foods);
  const usesThisWeek = new Map<Id, number>();

  for (const day of DAYS) {
    const targets = dayTargets(training[day], settings);
    const dayPlan: DayPlan = {};
    const usedToday = new Set<Id>();
    let running: Macros = { ...ZERO };
    const flexCandidates: FlexCandidate[] = [];

    for (const slot of settings.mealSlots) {
      const slotKcal = Math.max(1, targets.kcal * slot.share);

      const tagged = recipes.filter((r) => r.mealTypes.includes(slot.id));
      const pool = tagged.length ? tagged : recipes;

      let best: Recipe | null = null;
      let bestPortions = 1;
      let bestScore = -Infinity;

      for (const r of pool) {
        const m = macrosOf(r);
        if (m.kcal <= 0) continue;

        // Score the portioned amount, not one bare serving: rounding to half
        // servings moves the figure enough to change which recipe wins.
        const portions = Math.min(3, Math.max(0.5, Math.round((slotKcal / m.kcal) * 2) / 2));
        const kcal = m.kcal * portions;
        const protein = m.protein * portions;

        const fit = -Math.abs(kcal - slotKcal) / slotKcal;

        // Lean towards protein density on a strength day, but only while there
        // is protein still to find. Past the target it is just calories.
        const shortOfProtein = running.protein < targets.protein;
        const density = m.protein / Math.max(1, m.kcal);
        const proteinBonus = targets.hasStrength && shortOfProtein ? density * 8 : 0;

        // Overshooting the day's protein costs more than missing anything
        // else, because protein is the macro most likely to run away: the
        // recipes that score well on fit tend to be the dense ones, and five
        // individually reasonable picks compound. At a weight of 1.5 the
        // heaviest training day still came out 38% over.
        const over = Math.max(0, running.protein + protein - targets.protein);
        const overshootPenalty = (over / Math.max(1, targets.protein)) * 3;

        const used = usesThisWeek.get(r.id) ?? 0;
        const free = r.batchFriendly ? Math.max(1, r.serves) : 1;
        const repeatPenalty = Math.max(0, used - free + 1) * 0.6;

        const sameDayPenalty = usedToday.has(r.id) ? 5 : 0;

        const score = fit + proteinBonus - overshootPenalty - repeatPenalty - sameDayPenalty;
        if (score > bestScore) {
          bestScore = score;
          best = r;
          bestPortions = portions;
        }
      }

      if (!best) continue;

      dayPlan[slot.id] = { recipeId: best.id, portions: bestPortions, consumed: false };
      usedToday.add(best.id);
      usesThisWeek.set(best.id, (usesThisWeek.get(best.id) ?? 0) + 1);
      running = addMacros(running, scale(macrosOf(best), bestPortions));

      // Note which of this meal's ingredients may be moved later.
      if (settings.tuneIngredients && best.macroSource === 'derived') {
        for (const line of best.lines) {
          const food = foodIndex.get(line.foodId);
          if (!food || !isFlexible(line, food)) continue;
          const grams = toBaseAmount(line, food);
          if (grams == null || grams <= 0) continue;
          flexCandidates.push({
            slotId: slot.id,
            foodId: food.id,
            perServingGrams: grams / Math.max(1, best.serves),
            kcalPer100: food.per100.kcal,
            portions: bestPortions,
          });
        }
      }
    }

    if (settings.tuneIngredients) {
      tuneDay(dayPlan, flexCandidates, targets.kcal - running.kcal);
    }

    plan[day] = dayPlan;
  }

  return plan;
}

/**
 * Spend (or claw back) an energy gap across the day's flexible foods.
 *
 * Scales them all by one factor rather than dumping the whole difference on
 * one plate, and clamps that factor so a day short by 800 kcal does not
 * triple the rice at breakfast. What the clamp cannot absorb is simply left
 * unclosed — the bars will show it, which is the honest outcome. Deltas are
 * rounded to 5 g because nobody weighs rice to the gram.
 */
function tuneDay(dayPlan: DayPlan, candidates: FlexCandidate[], gapKcal: number): void {
  if (!candidates.length || Math.abs(gapKcal) < 20) return;

  const currentKcal = candidates.reduce(
    (sum, c) => sum + (c.perServingGrams * c.kcalPer100) / 100 * c.portions,
    0
  );
  if (currentKcal <= 0) return;

  const factor = Math.min(2, Math.max(0.5, (currentKcal + gapKcal) / currentKcal));
  if (Math.abs(factor - 1) < 0.02) return;

  for (const c of candidates) {
    const entry = dayPlan[c.slotId];
    if (!entry) continue;
    const delta = Math.round((c.perServingGrams * (factor - 1)) / 10) * 10;
    // Below ten grams it is not an instruction, it is noise: "+5 g banana" is
    // not something anyone can act on, and printing it makes the ones that do
    // matter harder to see. Dropping the small ones costs a little accuracy
    // and the day still lands inside about thirty kcal.
    if (Math.abs(delta) < 10) continue;
    // Never take away more than there was.
    const bounded = Math.max(delta, -c.perServingGrams);
    entry.adjustments = { ...(entry.adjustments ?? {}), [c.foodId]: bounded };
  }
}

// ---------------------------------------------------------------------------
// Weight trend
// ---------------------------------------------------------------------------

export function sortedWeights(weights: WeightEntry[]): WeightEntry[] {
  return [...weights].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Trailing mean over a window of days.
 *
 * Body weight swings a kilo or more day to day on hydration and gut contents
 * alone, which is larger than a week of deliberate deficit. A single reading
 * cannot tell you anything; the smoothed line can.
 */
export function rollingMean(weights: WeightEntry[], windowDays = 7): WeightEntry[] {
  const sorted = sortedWeights(weights);
  return sorted.map((entry, i) => {
    let sum = 0;
    let n = 0;
    for (let j = i; j >= 0; j--) {
      if (daysBetween(sorted[j].date, entry.date) >= windowDays) break;
      sum += sorted[j].kg;
      n++;
    }
    return { date: entry.date, kg: n ? sum / n : entry.kg };
  });
}

export interface TrendResult {
  /** Kilograms per week, negative for loss. */
  kgPerWeek: number;
  from: ISODate;
  to: ISODate;
  days: number;
  points: number;
}

export function weightTrend(weights: WeightEntry[], windowDays = 28): TrendResult | null {
  const smoothed = rollingMean(weights);
  if (smoothed.length < 2) return null;

  const last = smoothed[smoothed.length - 1];
  const cutoff = smoothed.filter((w) => daysBetween(w.date, last.date) <= windowDays);
  if (cutoff.length < 2) return null;

  const first = cutoff[0];
  const days = daysBetween(first.date, last.date);
  if (days < 7) return null;

  return {
    kgPerWeek: ((last.kg - first.kg) / days) * 7,
    from: first.date,
    to: last.date,
    days,
    points: cutoff.length,
  };
}

export interface ImpliedExpenditure {
  restDayKcal: number;
  /** Difference from the current setting; positive means the setting is low. */
  delta: number;
  days: number;
  weighIns: number;
  adherence: number;
}

export interface ImpliedResult {
  result?: ImpliedExpenditure;
  blocked?: string;
}

/**
 * What the logged data implies your rest-day figure actually is.
 *
 * READ-ONLY, ON PURPOSE. It changes nothing; it reports. Automatic
 * recalibration was deliberately deferred, and an estimate that quietly moves
 * the target underneath a plan is worse than one you have to act on yourself.
 *
 * It is also only as good as the consumed-meal ticking, which is why adherence
 * is returned alongside and shown next to it. Half-logged eating produces a
 * confidently wrong number, and the honest thing is to make that visible.
 */
export function impliedRestDayKcal(
  weights: WeightEntry[],
  plans: Record<string, WeekPlan>,
  training: Record<string, Partial<Record<Day, DayTraining>>>,
  settings: Settings,
  recipes: Recipe[],
  foods: FoodItem[],
  weekKeysInOrder: string[]
): ImpliedResult {
  const trend = weightTrend(weights, 42);
  if (!trend) return { blocked: 'Log weight over at least two weeks to see this.' };
  if (trend.points < 6) return { blocked: 'Needs at least six weigh-ins across the period.' };

  let intake = 0;
  let trainingKcal = 0;
  let planned = 0;
  let consumed = 0;

  for (const week of weekKeysInOrder) {
    const plan = plans[week];
    if (!plan) continue;
    for (const day of DAYS) {
      for (const entry of Object.values(plan[day] ?? {})) {
        if (!entry) continue;
        planned++;
        if (!entry.consumed) continue;
        consumed++;
        intake += entryMacros(entry, recipes, foods).kcal;
      }
      trainingKcal += trainingKcalOf(training[week]?.[day], settings);
    }
  }

  if (consumed === 0) {
    return { blocked: 'Tick meals as eaten so there is an intake to compare against.' };
  }

  const days = trend.days;
  const balance = (trend.kgPerWeek / 7) * days * KCAL_PER_KG;
  const expenditure = (intake - balance) / days;
  const restDay = expenditure - trainingKcal / days;

  return {
    result: {
      restDayKcal: Math.round(restDay),
      delta: Math.round(restDay - settings.restDayKcal),
      days,
      weighIns: trend.points,
      adherence: planned ? (consumed / planned) * 100 : 0,
    },
  };
}
