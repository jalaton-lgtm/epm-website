// The recipe library.

import { useMemo, useState } from 'preact/hooks';
import type { FoodItem, KitchenState, Recipe, RecipeLine, Unit } from '../../lib/kitchen/types';
import {
  isFlexible,
  macrosOfLine,
  recipeMacros,
  toBaseAmount,
  unitsFor,
  ZERO_MACROS,
} from '../../lib/kitchen/foods';
import { newId, recipeToMarkdown } from '../../lib/kitchen/store';
import { Empty, Field, Modal, NumberInput } from './ui';
import { blankFood, FoodForm } from './Foods';

type Update = (fn: (s: KitchenState) => KitchenState) => void;

function blankRecipe(): Recipe {
  return {
    id: newId(),
    name: '',
    macroSource: 'derived',
    macros: { ...ZERO_MACROS },
    serves: 1,
    lines: [],
    prepMinutes: 10,
    mealTypes: [],
    batchFriendly: false,
  };
}

// ---------------------------------------------------------------------------

/** Type-ahead over the food library, with an escape hatch to create one. */
function FoodPicker({
  foods,
  onPick,
  onCreate,
}: {
  foods: FoodItem[];
  onPick: (f: FoodItem) => void;
  onCreate: (name: string) => void;
}) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();
  const matches = query
    ? foods
        .filter(
          (f) =>
            f.name.toLowerCase().includes(query) || (f.fi ?? '').toLowerCase().includes(query)
        )
        .slice(0, 8)
    : [];

  return (
    <div class="k-foodpicker">
      <input
        class="k-input"
        type="search"
        placeholder="Add an ingredient…"
        value={q}
        onInput={(e) => setQ((e.target as HTMLInputElement).value)}
      />
      {query && (
        <div class="k-foodresults">
          {matches.map((f) => (
            <button
              key={f.id}
              class="k-pick"
              onClick={() => {
                onPick(f);
                setQ('');
              }}
            >
              <span class="k-pick-name">
                {f.fi || f.name}
                {f.state && <span class="k-tag">{f.state}</span>}
              </span>
              <span class="k-pick-meta">
                {f.per100.kcal} kcal · {f.per100.protein}g P per 100 {f.base}
              </span>
            </button>
          ))}
          {/* Always offered, even when there are matches — "chicken" matching
              "chicken breast" does not mean you meant chicken breast. */}
          <button
            class="k-pick k-pick-new"
            onClick={() => {
              onCreate(q.trim());
              setQ('');
            }}
          >
            + Add "{q.trim()}" as a new food
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function RecipeForm({
  initial,
  foods,
  slots,
  onSave,
  onCreateFood,
  onClose,
}: {
  initial: Recipe;
  foods: FoodItem[];
  slots: { id: string; name: string }[];
  onSave: (r: Recipe) => void;
  onCreateFood: (name: string, then: (f: FoodItem) => void) => void;
  onClose: () => void;
}) {
  const [r, setR] = useState<Recipe>(structuredClone(initial));
  const set = <K extends keyof Recipe>(k: K, v: Recipe[K]) => setR((p) => ({ ...p, [k]: v }));
  const foodIndex = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);

  const setLine = (i: number, patch: Partial<RecipeLine>) =>
    setR((p) => ({
      ...p,
      lines: p.lines.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    }));

  const addLine = (food: FoodItem) =>
    setR((p) => ({
      ...p,
      lines: [...p.lines, { foodId: food.id, qty: 100, unit: unitsFor(food)[0] }],
    }));

  // Recomputed on every keystroke — watching the per-serving figures move as
  // you change 400 g to 600 g is the entire argument for doing it this way.
  const live = recipeMacros({ ...r, macroSource: 'derived' }, foods);
  const shown = r.macroSource === 'derived' ? live : r.macros;
  const broken = r.lines.filter((l) => {
    const f = foodIndex.get(l.foodId);
    return !f || toBaseAmount(l, f) == null;
  });

  const canSave = r.name.trim().length > 0;

  return (
    <Modal title={initial.name ? `Edit ${initial.name}` : 'New recipe'} onClose={onClose} wide>
      <div class="k-row4">
        <Field label="Name">
          <input
            class="k-input"
            value={r.name}
            onInput={(e) => set('name', (e.target as HTMLInputElement).value)}
          />
        </Field>
        <Field label="Serves" hint="Ingredients below are for this many">
          <NumberInput value={r.serves} onInput={(n) => set('serves', Math.max(1, n))} min={1} />
        </Field>
        <Field label="Prep">
          <NumberInput
            value={r.prepMinutes}
            onInput={(n) => set('prepMinutes', Math.max(0, n))}
            suffix="min"
          />
        </Field>
        <Field label="Batch friendly" hint="Cooks in bulk and keeps">
          <input
            type="checkbox"
            checked={r.batchFriendly}
            onChange={(e) => set('batchFriendly', (e.target as HTMLInputElement).checked)}
          />
        </Field>
      </div>

      <h4 class="k-subhead">
        Ingredients for {r.serves} serving{r.serves === 1 ? '' : 's'}
      </h4>

      {r.lines.length === 0 && (
        <Empty>No ingredients yet. Search below to add one.</Empty>
      )}

      <div class="k-lines">
        {r.lines.map((line, i) => {
          const food = foodIndex.get(line.foodId);
          const m = macrosOfLine(line, food);
          const flex = food ? isFlexible(line, food) : false;
          return (
            <div class="k-line" key={`${line.foodId}-${i}`}>
              <NumberInput
                value={line.qty}
                onInput={(n) => setLine(i, { qty: n })}
                step={food?.base === 'g' ? 10 : 10}
              />
              <select
                class="k-input k-line-unit"
                value={line.unit}
                aria-label="Unit"
                onChange={(e) => setLine(i, { unit: (e.target as HTMLSelectElement).value as Unit })}
              >
                {(food ? unitsFor(food) : ['g']).map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              <span class="k-line-name">
                {food ? food.fi || food.name : <span class="k-danger">missing food</span>}
                {food?.state && <span class="k-dim"> ({food.state})</span>}
              </span>
              <span class="k-line-macros k-dim">
                {Math.round(m.kcal)} kcal · {Math.round(m.protein)}P · {Math.round(m.carbs)}C
              </span>
              <label class="k-line-flex" title="The generator may adjust this to hit a target">
                <input
                  type="checkbox"
                  checked={flex}
                  onChange={(e) =>
                    setLine(i, { flex: (e.target as HTMLInputElement).checked })
                  }
                />
                <span class="k-dim">flex</span>
              </label>
              <button
                class="k-icon"
                aria-label={`Remove ${food?.name ?? 'ingredient'}`}
                onClick={() => setR((p) => ({ ...p, lines: p.lines.filter((_, x) => x !== i) }))}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <FoodPicker
        foods={foods}
        onPick={addLine}
        onCreate={(name) => onCreateFood(name, addLine)}
      />

      {broken.length > 0 && (
        <p class="k-warn">
          {broken.length} ingredient{broken.length === 1 ? '' : 's'} cannot be converted to a
          weight, so {broken.length === 1 ? 'it contributes' : 'they contribute'} nothing to
          the macros below. Usually the food has no "what one piece weighs" figure — set it
          in the food editor, or measure the line in grams.
        </p>
      )}

      <div class="k-livemacros">
        <span class="k-livemacros-label mono">Per serving</span>
        <span class="k-fig">{Math.round(shown.kcal)}</span>
        <span class="k-dim">kcal</span>
        <span>{Math.round(shown.protein)}g P</span>
        <span>{Math.round(shown.carbs)}g C</span>
        <span>{Math.round(shown.fat)}g F</span>
      </div>

      <Field
        label="Where the macros come from"
        hint="Manual is for anything not worth itemising — a bar, a restaurant meal"
      >
        <select
          class="k-input"
          value={r.macroSource}
          onChange={(e) => {
            const v = (e.target as HTMLSelectElement).value as 'derived' | 'manual';
            // Switching to manual seeds the boxes with what was computed, so
            // the numbers do not jump to zero the moment you take over.
            setR((p) => ({ ...p, macroSource: v, macros: v === 'manual' ? live : p.macros }));
          }}
        >
          <option value="derived">Calculated from the ingredients</option>
          <option value="manual">Typed by hand</option>
        </select>
      </Field>

      {r.macroSource === 'manual' && (
        <div class="k-row4">
          {(['kcal', 'protein', 'carbs', 'fat'] as const).map((k) => (
            <Field key={k} label={k}>
              <NumberInput
                value={r.macros[k]}
                onInput={(n) => setR((p) => ({ ...p, macros: { ...p.macros, [k]: n } }))}
              />
            </Field>
          ))}
        </div>
      )}

      <Field label="Suits which meals" hint="Used by the week generator">
        <div class="k-chips">
          {slots.map((s) => {
            const on = r.mealTypes.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                class={`k-chip${on ? ' k-chip-on' : ''}`}
                onClick={() =>
                  set('mealTypes', on ? r.mealTypes.filter((m) => m !== s.id) : [...r.mealTypes, s.id])
                }
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Notes">
        <textarea
          class="k-input"
          rows={3}
          value={r.notes ?? ''}
          onInput={(e) => set('notes', (e.target as HTMLTextAreaElement).value)}
        />
      </Field>

      <div class="k-modal-actions">
        <button
          class="k-btn"
          disabled={!canSave}
          onClick={() =>
            onSave({
              ...r,
              name: r.name.trim(),
              example: false,
              macros: r.macroSource === 'derived' ? live : r.macros,
            })
          }
        >
          Save recipe
        </button>
        <button class="k-btn k-btn-quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------

export default function Recipes({ state, update }: { state: KitchenState; update: Update }) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [markdown, setMarkdown] = useState<Recipe | null>(null);
  // A food being created from inside the recipe form, plus what to do with it
  // once saved — so the new ingredient lands straight in the line you were
  // writing rather than making you find it again.
  const [newFood, setNewFood] = useState<{ food: FoodItem; then: (f: FoodItem) => void } | null>(
    null
  );

  const query = q.trim().toLowerCase();
  const foodIndex = useMemo(() => new Map(state.foods.map((f) => [f.id, f])), [state.foods]);

  // One box, two jobs: matches recipe names and the foods inside them, so
  // "what can I make with the chicken in the fridge" is the same search.
  const filtered = state.recipes.filter((r) => {
    if (!query) return true;
    if (r.name.toLowerCase().includes(query)) return true;
    return r.lines.some((l) => {
      const f = foodIndex.get(l.foodId);
      return (
        f &&
        (f.name.toLowerCase().includes(query) || (f.fi ?? '').toLowerCase().includes(query))
      );
    });
  });

  const save = (r: Recipe) => {
    update((s) => ({
      ...s,
      recipes: s.recipes.some((x) => x.id === r.id)
        ? s.recipes.map((x) => (x.id === r.id ? r : x))
        : [...s.recipes, r],
    }));
    setEditing(null);
  };

  const exampleCount = state.recipes.filter((r) => r.example).length;

  return (
    <>
      <div class="k-toolbar">
        <input
          class="k-input"
          type="search"
          placeholder="Search recipes or ingredients"
          value={q}
          onInput={(e) => setQ((e.target as HTMLInputElement).value)}
        />
        <button class="k-btn" onClick={() => setEditing(blankRecipe())}>
          + New recipe
        </button>
        {exampleCount > 0 && (
          <button
            class="k-btn k-btn-quiet"
            onClick={() => update((s) => ({ ...s, recipes: s.recipes.filter((r) => !r.example) }))}
          >
            Remove {exampleCount} examples
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <Empty>
          {state.recipes.length === 0
            ? 'No recipes yet. Add one, or import a backup from Setup.'
            : 'Nothing matches that search.'}
        </Empty>
      )}

      <div class="k-recipes">
        {filtered.map((r) => {
          const m = recipeMacros(r, state.foods);
          return (
            <article class="k-recipe" key={r.id}>
              <div class="k-recipe-main">
                <h3>
                  {r.name}
                  {r.example && <span class="k-tag">example</span>}
                  {r.batchFriendly && <span class="k-tag">batch</span>}
                  {r.macroSource === 'manual' && <span class="k-tag">manual macros</span>}
                </h3>
                <p class="k-recipe-macros">
                  {Math.round(m.kcal)} kcal · {Math.round(m.protein)}g P ·{' '}
                  {Math.round(m.carbs)}g C · {Math.round(m.fat)}g F{' '}
                  <span class="k-dim">per serving</span>
                </p>
                <p class="k-dim k-recipe-meta">
                  Serves {r.serves} · {r.prepMinutes} min
                  {r.lines.length > 0 &&
                    ` · ${r.lines
                      .map((l) => {
                        const f = foodIndex.get(l.foodId);
                        return f ? `${l.qty}${l.unit} ${f.fi || f.name}` : '?';
                      })
                      .join(', ')}`}
                </p>
              </div>
              <div class="k-recipe-actions">
                <button class="k-link" onClick={() => setEditing(r)}>Edit</button>
                <button class="k-link" onClick={() => setMarkdown(r)}>Text</button>
                <button
                  class="k-link k-danger"
                  onClick={() =>
                    update((s) => ({ ...s, recipes: s.recipes.filter((x) => x.id !== r.id) }))
                  }
                >
                  Delete
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {editing && (
        <RecipeForm
          initial={editing}
          foods={state.foods}
          slots={state.settings.mealSlots}
          onSave={save}
          onCreateFood={(name, then) => setNewFood({ food: blankFood(name), then })}
          onClose={() => setEditing(null)}
        />
      )}

      {newFood && (
        <FoodForm
          initial={newFood.food}
          onSave={(f) => {
            update((s) => ({ ...s, foods: [...s.foods, f] }));
            newFood.then(f);
            setNewFood(null);
          }}
          onClose={() => setNewFood(null)}
        />
      )}

      {markdown && (
        <Modal title={markdown.name} onClose={() => setMarkdown(null)} wide>
          <p class="k-formnote">
            A portable copy — paste it into a note, a message or a commit. The export in
            Setup is still the actual backup.
          </p>
          <textarea
            class="k-input k-code"
            rows={16}
            readOnly
            value={recipeToMarkdown(markdown, state.foods)}
          />
          <div class="k-modal-actions">
            <button
              class="k-btn"
              onClick={() =>
                navigator.clipboard?.writeText(recipeToMarkdown(markdown, state.foods))
              }
            >
              Copy
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
