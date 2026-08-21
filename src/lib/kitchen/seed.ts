// First-run defaults.
//
// Nothing here is anybody's real data. The defaults are deliberately round and
// generic — 70 kg, 2000 kcal, no deficit, no goal — because the planner is
// shareable by link and a stranger opening it should meet a neutral starting
// point, not somebody else's cut.
//
// The example recipes exist so the grid, the shopping list and the generator
// have something to chew on before a single real recipe has been entered. They
// are flagged `example: true` and can be cleared in one click, as can the
// seeded foods they reference.
//
// Their macros are no longer typed in: they are computed from the food library
// at module load, which is the whole point of the ingredient refactor. If a
// figure here looks wrong, the fix is in foods.ts, once, rather than in every
// recipe that uses that ingredient.

import type { Recipe, Settings } from './types';
import { recipeMacros, seedFoods, ZERO_MACROS } from './foods';

export const defaultSettings: Settings = {
  restDayKcal: 2000,
  dailyDeficit: 0,

  proteinPerKg: 2.0,
  proteinStrengthBonus: 20,
  fatPerKg: 1.0,

  weightKg: 70,
  goalWeightKg: null,
  goalDate: null,

  sessionTypes: [
    { id: 'athletics', name: 'Athletics', kcal: 400, strength: false },
    { id: 'gym', name: 'Gym', kcal: 300, strength: true },
    { id: 'cycling', name: 'Cycling', kcal: 200, strength: false },
  ],

  mealSlots: [
    { id: 'breakfast1', name: 'Breakfast 1', time: '10:00', share: 0.15 },
    { id: 'breakfast2', name: 'Breakfast 2', time: '11:30', share: 0.15 },
    { id: 'lunch', name: 'Post-training lunch', time: '16:00', share: 0.35 },
    { id: 'snack', name: 'Snack', time: '18:00', share: 0.1 },
    { id: 'dinner', name: 'Dinner', time: '20:00', share: 0.25 },
  ],

  tuneIngredients: true,
};

/** Written without macros, which are filled in below from the food library. */
type RecipeDraft = Omit<Recipe, 'macros'>;

const drafts: RecipeDraft[] = [
  {
    id: 'ex-oatmeal',
    name: 'Protein oatmeal bowl',
    macroSource: 'derived',
    serves: 1,
    prepMinutes: 10,
    mealTypes: ['breakfast1', 'breakfast2'],
    batchFriendly: false,
    example: true,
    lines: [
      { foodId: 'fd-oats', qty: 60, unit: 'g' },
      { foodId: 'fd-whey', qty: 30, unit: 'g' },
      { foodId: 'fd-banana', qty: 1, unit: 'pcs' },
      { foodId: 'fd-berries', qty: 100, unit: 'g' },
    ],
  },
  {
    id: 'ex-yoghurt',
    name: 'Greek yoghurt with berries',
    macroSource: 'derived',
    serves: 1,
    prepMinutes: 5,
    mealTypes: ['breakfast1', 'breakfast2', 'snack'],
    batchFriendly: false,
    example: true,
    lines: [
      { foodId: 'fd-greekyog', qty: 200, unit: 'g' },
      { foodId: 'fd-berries', qty: 100, unit: 'g' },
      { foodId: 'fd-honey', qty: 1, unit: 'tbsp' },
      { foodId: 'fd-granola', qty: 30, unit: 'g' },
    ],
  },
  {
    id: 'ex-chicken-rice',
    name: 'Grilled chicken and rice',
    macroSource: 'derived',
    serves: 4,
    prepMinutes: 25,
    mealTypes: ['lunch', 'dinner'],
    batchFriendly: true,
    example: true,
    lines: [
      { foodId: 'fd-chicken', qty: 600, unit: 'g' },
      { foodId: 'fd-brownrice', qty: 200, unit: 'g' },
      { foodId: 'fd-mixedveg', qty: 500, unit: 'g' },
      { foodId: 'fd-oliveoil', qty: 3, unit: 'tbsp' },
    ],
  },
  {
    id: 'ex-salmon',
    name: 'Salmon with sweet potato',
    macroSource: 'derived',
    serves: 2,
    prepMinutes: 30,
    mealTypes: ['dinner', 'lunch'],
    batchFriendly: false,
    example: true,
    lines: [
      { foodId: 'fd-salmon', qty: 300, unit: 'g' },
      { foodId: 'fd-sweetpotato', qty: 400, unit: 'g' },
      { foodId: 'fd-asparagus', qty: 200, unit: 'g' },
      { foodId: 'fd-lemon', qty: 1, unit: 'pcs' },
    ],
  },
  {
    id: 'ex-smoothie',
    name: 'Protein smoothie',
    macroSource: 'derived',
    serves: 1,
    prepMinutes: 5,
    mealTypes: ['snack', 'breakfast2'],
    batchFriendly: false,
    example: true,
    lines: [
      { foodId: 'fd-whey', qty: 30, unit: 'g' },
      { foodId: 'fd-banana', qty: 1, unit: 'pcs' },
      { foodId: 'fd-almondmilk', qty: 250, unit: 'ml' },
      { foodId: 'fd-spinach', qty: 50, unit: 'g' },
    ],
  },
  {
    id: 'ex-turkey-quinoa',
    name: 'Turkey and quinoa bowl',
    macroSource: 'derived',
    serves: 3,
    prepMinutes: 20,
    mealTypes: ['lunch', 'dinner'],
    batchFriendly: true,
    example: true,
    lines: [
      { foodId: 'fd-turkey', qty: 500, unit: 'g' },
      { foodId: 'fd-quinoa', qty: 220, unit: 'g' },
      { foodId: 'fd-mixedveg', qty: 400, unit: 'g' },
      { foodId: 'fd-avocado', qty: 1, unit: 'pcs' },
    ],
  },
  {
    id: 'ex-eggwhite',
    name: 'Egg white scramble',
    macroSource: 'derived',
    serves: 1,
    prepMinutes: 10,
    mealTypes: ['breakfast1', 'breakfast2'],
    batchFriendly: false,
    example: true,
    lines: [
      { foodId: 'fd-eggwhite', qty: 250, unit: 'ml' },
      { foodId: 'fd-mixedveg', qty: 150, unit: 'g' },
      { foodId: 'fd-cheese', qty: 20, unit: 'g' },
    ],
  },
  {
    id: 'ex-beef-stirfry',
    name: 'Lean beef stir-fry',
    macroSource: 'derived',
    serves: 3,
    prepMinutes: 15,
    mealTypes: ['dinner', 'lunch'],
    batchFriendly: true,
    example: true,
    lines: [
      { foodId: 'fd-beef', qty: 450, unit: 'g' },
      { foodId: 'fd-mixedveg', qty: 600, unit: 'g' },
      { foodId: 'fd-brownrice', qty: 100, unit: 'g' },
      { foodId: 'fd-soysauce', qty: 3, unit: 'tbsp' },
    ],
  },

  // Carbohydrate-led, and deliberately so. A library made only of
  // protein-forward dishes cannot fill a training day's energy without
  // overshooting protein by half — that is arithmetic, not a scoring bug, and
  // it is what the first version of this seed ran into.
  {
    id: 'ex-porridge',
    name: 'Porridge with berries and walnuts',
    macroSource: 'derived',
    serves: 1,
    prepMinutes: 10,
    mealTypes: ['breakfast1', 'breakfast2'],
    batchFriendly: false,
    example: true,
    lines: [
      { foodId: 'fd-oats', qty: 80, unit: 'g' },
      { foodId: 'fd-milk', qty: 300, unit: 'ml' },
      { foodId: 'fd-berries', qty: 80, unit: 'g' },
      { foodId: 'fd-walnuts', qty: 20, unit: 'g' },
    ],
  },
  {
    id: 'ex-tomato-pasta',
    name: 'Tomato pasta',
    macroSource: 'derived',
    serves: 3,
    prepMinutes: 20,
    mealTypes: ['lunch', 'dinner'],
    batchFriendly: true,
    example: true,
    lines: [
      { foodId: 'fd-pasta', qty: 300, unit: 'g' },
      { foodId: 'fd-crushedtomato', qty: 400, unit: 'g' },
      { foodId: 'fd-onion', qty: 1, unit: 'pcs' },
      { foodId: 'fd-garlic', qty: 2, unit: 'pcs' },
      { foodId: 'fd-oliveoil', qty: 2, unit: 'tbsp' },
    ],
  },
  {
    id: 'ex-baked-potato',
    name: 'Baked potatoes with soured cream',
    macroSource: 'derived',
    serves: 2,
    prepMinutes: 45,
    mealTypes: ['dinner', 'lunch'],
    batchFriendly: true,
    example: true,
    lines: [
      { foodId: 'fd-potato', qty: 600, unit: 'g' },
      { foodId: 'fd-smetana', qty: 150, unit: 'g' },
      { foodId: 'fd-chives', qty: 1, unit: 'tbsp' },
    ],
  },
  {
    id: 'ex-toast',
    name: 'Banana and peanut butter toast',
    macroSource: 'derived',
    serves: 1,
    prepMinutes: 5,
    mealTypes: ['snack', 'breakfast2'],
    batchFriendly: false,
    example: true,
    lines: [
      { foodId: 'fd-wholebread', qty: 2, unit: 'pcs' },
      { foodId: 'fd-peanutbutter', qty: 25, unit: 'g' },
      { foodId: 'fd-banana', qty: 1, unit: 'pcs' },
    ],
  },
];

export const exampleRecipes: Recipe[] = drafts.map((d) => {
  const withZero: Recipe = { ...d, macros: { ...ZERO_MACROS } };
  return { ...withZero, macros: recipeMacros(withZero, seedFoods) };
});
