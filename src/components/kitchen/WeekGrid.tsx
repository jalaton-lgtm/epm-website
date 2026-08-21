// The week grid: seven days, each with its training, its targets, and its meals.

import { useMemo, useState } from 'preact/hooks';
import type {
  Day,
  FoodItem,
  Id,
  KitchenState,
  PlanEntry,
  Recipe,
  WeekKey,
} from '../../lib/kitchen/types';
import { DAYS } from '../../lib/kitchen/types';
import { dayTargets, dayTotals, entryMacrosPerServing } from '../../lib/kitchen/energy';
import { recipeMacros } from '../../lib/kitchen/foods';
import { dateOfDay } from '../../lib/kitchen/weeks';
import { Bar, Empty, Modal, Stepper } from './ui';

type Update = (fn: (s: KitchenState) => KitchenState) => void;

// ---------------------------------------------------------------------------
// Immutable writes
//
// One helper, one shape. The prototype had two ways to update a week's plan —
// `setWeeklyPlan(value)` alongside call sites passing `setWeeklyPlan(prev =>
// ...)` — and the second silently stored the updater FUNCTION as the week's
// plan. Assigning a meal therefore did nothing at all, and did it quietly.
// Generating a plan worked, because that one path happened to pass a plain
// object, which is exactly why the fault could survive being used.
// ---------------------------------------------------------------------------

function writeEntry(
  s: KitchenState,
  week: WeekKey,
  day: Day,
  slot: Id,
  entry: PlanEntry | null
): KitchenState {
  const weekPlan = s.plans[week] ?? {};
  const dayPlan = { ...(weekPlan[day] ?? {}) };
  if (entry) dayPlan[slot] = entry;
  else delete dayPlan[slot];
  return {
    ...s,
    plans: { ...s.plans, [week]: { ...weekPlan, [day]: dayPlan } },
  };
}

function writeTraining(
  s: KitchenState,
  week: WeekKey,
  day: Day,
  typeId: Id,
  count: number
): KitchenState {
  const weekTraining = s.training[week] ?? {};
  const dayTraining = { ...(weekTraining[day] ?? {}), [typeId]: count };
  return {
    ...s,
    training: { ...s.training, [week]: { ...weekTraining, [day]: dayTraining } },
  };
}

// ---------------------------------------------------------------------------

function RecipePicker({
  recipes,
  foods,
  slotName,
  onPick,
  onClose,
}: {
  recipes: Recipe[];
  foods: FoodItem[];
  slotName: string;
  onPick: (r: Recipe) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <Modal title={`Choose a meal for ${slotName}`} onClose={onClose}>
      <input
        class="k-input k-block"
        type="search"
        placeholder="Search recipes"
        value={q}
        onInput={(e) => setQ((e.target as HTMLInputElement).value)}
      />
      <div class="k-picker">
        {filtered.length === 0 && <Empty>No recipe matches that.</Empty>}
        {filtered.map((r) => {
          const m = recipeMacros(r, foods);
          return (
            <button key={r.id} class="k-pick" onClick={() => onPick(r)}>
              <span class="k-pick-name">{r.name}</span>
              <span class="k-pick-meta">
                {Math.round(m.kcal)} kcal · {Math.round(m.protein)}g protein · serves {r.serves}
                {r.batchFriendly && <span class="k-tag">batch</span>}
              </span>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

function MealCell({
  state,
  week,
  day,
  slotId,
  slotName,
  slotTime,
  update,
}: {
  state: KitchenState;
  week: WeekKey;
  day: Day;
  slotId: Id;
  slotName: string;
  slotTime: string;
  update: Update;
}) {
  const [picking, setPicking] = useState(false);
  const entry = state.plans[week]?.[day]?.[slotId];
  const recipe = entry ? state.recipes.find((r) => r.id === entry.recipeId) : undefined;

  // What one serving of this actually comes to, adjustments included.
  const perServing = entry
    ? entryMacrosPerServing(entry, state.recipes, state.foods)
    : undefined;

  // Say out loud where the generator moved an ingredient. An adjustment that
  // only shows up as a changed calorie count is indistinguishable from a bug.
  const adjustmentNote = (() => {
    const adj = Object.entries(entry?.adjustments ?? {}).filter(([, g]) => g);
    if (!adj.length) return null;
    return adj
      .map(([foodId, grams]) => {
        const food = state.foods.find((x) => x.id === foodId);
        const sign = grams > 0 ? '+' : '';
        return `${sign}${Math.round(grams)} ${food?.base ?? 'g'} ${food?.fi || food?.name || foodId}`;
      })
      .join(', ');
  })();

  const assign = (r: Recipe) => {
    update((s) =>
      writeEntry(s, week, day, slotId, { recipeId: r.id, portions: 1, consumed: false })
    );
    setPicking(false);
  };

  // Applies the step to whatever is in state right now rather than to the
  // `entry` captured by this render, so two quick taps both count.
  const stepPortions = (delta: number) =>
    update((s) => {
      const current = s.plans[week]?.[day]?.[slotId];
      if (!current) return s;
      const next = Math.min(4, Math.max(0.5, Math.round((current.portions + delta) * 2) / 2));
      return writeEntry(s, week, day, slotId, { ...current, portions: next });
    });

  const toggleConsumed = () => {
    if (!entry || !recipe) return;
    update((s) =>
      writeEntry(s, week, day, slotId, {
        ...entry,
        consumed: !entry.consumed,
        // Freeze what was eaten on the way in, adjustments and all; drop it
        // on the way out, so an accidental tick leaves no stale record behind.
        eatenMacros: !entry.consumed
          ? entryMacrosPerServing(entry, state.recipes, state.foods)
          : undefined,
      })
    );
  };

  return (
    <div class={`k-cell${entry?.consumed ? ' k-cell-done' : ''}`}>
      <div class="k-cell-head">
        <span class="k-cell-slot">
          {slotName} <span class="k-dim">{slotTime}</span>
        </span>
        {entry && (
          <input
            type="checkbox"
            checked={entry.consumed}
            onChange={toggleConsumed}
            aria-label={`Mark ${slotName} on ${day} as eaten`}
          />
        )}
      </div>

      {entry ? (
        recipe ? (
          <>
            <button class="k-cell-name" onClick={() => setPicking(true)}>
              {recipe.name}
            </button>
            <div class="k-cell-macros">
              {Math.round(perServing!.kcal * entry.portions)} kcal ·{' '}
              {Math.round(perServing!.protein * entry.portions)}g P
            </div>
            {adjustmentNote && <div class="k-cell-adjust">{adjustmentNote}</div>}
            <div class="k-cell-foot">
              <Stepper
                value={entry.portions}
                onChange={(_next, delta) => stepPortions(delta)}
                min={0.5}
                max={4}
                step={0.5}
                label={`portions of ${recipe.name}`}
              />
              <button
                class="k-link"
                onClick={() => update((s) => writeEntry(s, week, day, slotId, null))}
              >
                Clear
              </button>
            </div>
          </>
        ) : (
          // The recipe was deleted after the plan was made. Say so rather
          // than rendering a blank cell that looks empty but is not.
          <div class="k-cell-missing">
            Recipe deleted
            <button
              class="k-link"
              onClick={() => update((s) => writeEntry(s, week, day, slotId, null))}
            >
              Remove
            </button>
          </div>
        )
      ) : (
        <button class="k-cell-add" onClick={() => setPicking(true)}>
          + Add
        </button>
      )}

      {picking && (
        <RecipePicker
          recipes={state.recipes}
          foods={state.foods}
          slotName={`${slotName}, ${day}`}
          onPick={assign}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function DayCard({
  state,
  week,
  day,
  update,
}: {
  state: KitchenState;
  week: WeekKey;
  day: Day;
  update: Update;
}) {
  const training = state.training[week]?.[day];
  const targets = dayTargets(training, state.settings);
  const totals = dayTotals(state.plans[week]?.[day], state.recipes, state.foods);
  const date = dateOfDay(week, day);

  return (
    <section class={`k-day${targets.sessions > 0 ? ' k-day-training' : ''}`}>
      <header class="k-day-head">
        <h3>{day}</h3>
        <span class="k-dim">{date.slice(8)}.{date.slice(5, 7)}.</span>
      </header>

      <div class="k-training">
        {state.settings.sessionTypes.map((t) => (
          <div class="k-training-row" key={t.id}>
            <span class="k-training-name">
              {t.name} <span class="k-dim">{t.kcal}</span>
            </span>
            <Stepper
              value={training?.[t.id] ?? 0}
              onChange={(_next, delta) =>
                update((s) => {
                  const current = s.training[week]?.[day]?.[t.id] ?? 0;
                  return writeTraining(
                    s,
                    week,
                    day,
                    t.id,
                    Math.min(3, Math.max(0, current + delta))
                  );
                })
              }
              min={0}
              max={3}
              label={`${t.name} sessions on ${day}`}
            />
          </div>
        ))}
        <div class="k-training-sum">
          {targets.sessions === 0 ? (
            <span class="k-dim">Rest day</span>
          ) : (
            <>
              +{targets.trainingKcal} kcal
              {targets.hasStrength && <span class="k-tag">high protein</span>}
            </>
          )}
        </div>
      </div>

      <div class="k-bars">
        <Bar label="Energy" current={totals.kcal} target={targets.kcal} unit=" kcal" />
        <Bar label="Protein" current={totals.protein} target={targets.protein} tone="protein" />
        <Bar label="Carbs" current={totals.carbs} target={targets.carbs} tone="carbs" />
        <Bar label="Fat" current={totals.fat} target={targets.fat} tone="fat" />
      </div>
      {targets.warning && <p class="k-warn">{targets.warning}</p>}

      <div class="k-cells">
        {state.settings.mealSlots.map((slot) => (
          <MealCell
            key={slot.id}
            state={state}
            week={week}
            day={day}
            slotId={slot.id}
            slotName={slot.name}
            slotTime={slot.time}
            update={update}
          />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------

export default function WeekGrid({
  state,
  week,
  update,
}: {
  state: KitchenState;
  week: WeekKey;
  update: Update;
}) {
  const weekSessions = useMemo(
    () =>
      DAYS.reduce(
        (n, day) =>
          n +
          Object.values(state.training[week]?.[day] ?? {}).reduce((a, b) => a + (b || 0), 0),
        0
      ),
    [state.training, week]
  );

  return (
    <>
      <p class="k-note">
        Set each day's training first — the targets below follow it. Training is stored
        per week, so changing this week leaves last week's record alone.
        {weekSessions > 0 && ` ${weekSessions} sessions this week.`}
      </p>
      <div class="k-grid">
        {DAYS.map((day) => (
          <DayCard key={day} state={state} week={week} day={day} update={update} />
        ))}
      </div>
    </>
  );
}
