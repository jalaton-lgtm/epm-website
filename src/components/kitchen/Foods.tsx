// The food library.
//
// The entity recipes are built from: name, aisle, role, and macros per 100 as
// bought. Editing one value here corrects every recipe that uses it, which is
// the whole reason ingredients were pulled out of recipes in the first place.

import { useState } from 'preact/hooks';
import type { Aisle, FoodItem, FoodRole, KitchenState } from '../../lib/kitchen/types';
import { AISLES, AISLE_LABELS, FOOD_ROLES } from '../../lib/kitchen/types';
import { newId, refreshDerivedMacros } from '../../lib/kitchen/store';
import { Empty, Field, Modal, NumberInput } from './ui';

type Update = (fn: (s: KitchenState) => KitchenState) => void;

export function blankFood(name = ''): FoodItem {
  return {
    id: newId('fd'),
    name,
    fi: '',
    aisle: 'other',
    role: 'other',
    per100: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    base: 'g',
  };
}

const ROLE_HINT: Record<FoodRole, string> = {
  protein: 'Structural — the generator will not move it',
  carb: 'The dial — the generator may adjust this to hit a target',
  fat: 'Structural — the generator will not move it',
  veg: 'Structural — the generator will not move it',
  other: 'Structural — the generator will not move it',
};

/**
 * The food editor, exported because the recipe editor opens it inline.
 *
 * A recipe being written is exactly when a missing ingredient turns up, and
 * sending someone to another tab to add it — losing the half-written recipe on
 * the way — is how a library stops getting filled in.
 */
export function FoodForm({
  initial,
  onSave,
  onClose,
}: {
  initial: FoodItem;
  onSave: (f: FoodItem) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<FoodItem>(structuredClone(initial));
  const set = <K extends keyof FoodItem>(k: K, v: FoodItem[K]) =>
    setF((p) => ({ ...p, [k]: v }));
  const setPer = (k: keyof FoodItem['per100'], v: number) =>
    setF((p) => ({ ...p, per100: { ...p.per100, [k]: v } }));
  const setGramsPer = (k: 'pcs' | 'tbsp' | 'tsp', v: number) =>
    setF((p) => ({
      ...p,
      gramsPer: { ...(p.gramsPer ?? {}), [k]: v > 0 ? v : undefined },
    }));

  const derived = f.per100.protein * 4 + f.per100.carbs * 4 + f.per100.fat * 9;
  const drift = f.per100.kcal > 0 ? Math.abs(derived - f.per100.kcal) / f.per100.kcal : 0;

  return (
    <Modal title={initial.name ? `Edit ${initial.name}` : 'New food'} onClose={onClose} wide>
      <div class="k-row4">
        <Field label="Name">
          <input
            class="k-input"
            value={f.name}
            onInput={(e) => set('name', (e.target as HTMLInputElement).value)}
          />
        </Field>
        <Field label="Suomeksi">
          <input
            class="k-input"
            value={f.fi ?? ''}
            onInput={(e) => set('fi', (e.target as HTMLInputElement).value)}
          />
        </Field>
        <Field label="Aisle">
          <select
            class="k-input"
            value={f.aisle}
            onChange={(e) => set('aisle', (e.target as HTMLSelectElement).value as Aisle)}
          >
            {AISLES.map((a) => (
              <option key={a} value={a}>{AISLE_LABELS[a]}</option>
            ))}
          </select>
        </Field>
        <Field label="Role" hint={ROLE_HINT[f.role]}>
          <select
            class="k-input"
            value={f.role}
            onChange={(e) => set('role', (e.target as HTMLSelectElement).value as FoodRole)}
          >
            {FOOD_ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </Field>
      </div>

      <p class="k-formnote">
        Macros per 100 {f.base}, <strong>as bought</strong> — raw meat, dry grains, uncooked
        pasta. This is the one thing here that must not be guessed: 100 g of dry rice is
        around 360 kcal and 100 g of cooked rice around 130, so a figure taken from the wrong
        state is wrong by a factor of three. Read it off the packet, or from Fineli.
      </p>

      <div class="k-row4">
        <Field label="Measured in">
          <select
            class="k-input"
            value={f.base}
            onChange={(e) => set('base', (e.target as HTMLSelectElement).value as 'g' | 'ml')}
          >
            <option value="g">grams</option>
            <option value="ml">millilitres</option>
          </select>
        </Field>
        <Field label="kcal">
          <NumberInput value={f.per100.kcal} onInput={(n) => setPer('kcal', n)} />
        </Field>
        <Field label="Protein">
          <NumberInput value={f.per100.protein} onInput={(n) => setPer('protein', n)} step={0.1} suffix="g" />
        </Field>
        <Field label="Carbs">
          <NumberInput value={f.per100.carbs} onInput={(n) => setPer('carbs', n)} step={0.1} suffix="g" />
        </Field>
        <Field label="Fat">
          <NumberInput value={f.per100.fat} onInput={(n) => setPer('fat', n)} step={0.1} suffix="g" />
        </Field>
      </div>

      {drift > 0.25 && (
        <p class="k-warn">
          Those macros come to about {Math.round(derived)} kcal, but the food says{' '}
          {f.per100.kcal}. One of them is probably a slip.
        </p>
      )}

      <Field label="State" hint="Shown in the picker: raw, dry, drained…">
        <input
          class="k-input"
          value={f.state ?? ''}
          onInput={(e) => set('state', (e.target as HTMLInputElement).value)}
        />
      </Field>

      <h4 class="k-subhead">What one of these weighs</h4>
      <p class="k-formnote">
        Fill these in only where they make sense. A recipe can then say "1 banana" or "2 tbsp
        oil". Leave one blank and that unit simply is not offered, which is better than the
        planner inventing a number.
      </p>
      <div class="k-row4">
        <Field label="One piece">
          <NumberInput
            value={f.gramsPer?.pcs ?? 0}
            onInput={(n) => setGramsPer('pcs', n)}
            suffix={f.base}
          />
        </Field>
        <Field label="One tbsp">
          <NumberInput
            value={f.gramsPer?.tbsp ?? 0}
            onInput={(n) => setGramsPer('tbsp', n)}
            suffix={f.base}
          />
        </Field>
        <Field label="One tsp">
          <NumberInput
            value={f.gramsPer?.tsp ?? 0}
            onInput={(n) => setGramsPer('tsp', n)}
            suffix={f.base}
          />
        </Field>
      </div>

      <div class="k-modal-actions">
        <button
          class="k-btn"
          disabled={!f.name.trim()}
          onClick={() => onSave({ ...f, name: f.name.trim(), example: false })}
        >
          Save food
        </button>
        <button class="k-btn k-btn-quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

export default function Foods({ state, update }: { state: KitchenState; update: Update }) {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<FoodItem | null>(null);

  const query = q.trim().toLowerCase();
  const filtered = state.foods.filter(
    (f) =>
      !query ||
      f.name.toLowerCase().includes(query) ||
      (f.fi ?? '').toLowerCase().includes(query)
  );

  const save = (food: FoodItem) => {
    update((s) =>
      // Recipe caches have to be recomputed: a changed food silently
      // invalidates the per-serving macros of everything that uses it.
      refreshDerivedMacros({
        ...s,
        foods: s.foods.some((x) => x.id === food.id)
          ? s.foods.map((x) => (x.id === food.id ? food : x))
          : [...s.foods, food],
      })
    );
    setEditing(null);
  };

  const usedBy = (foodId: string) =>
    state.recipes.filter((r) => r.lines.some((l) => l.foodId === foodId));

  return (
    <>
      <p class="k-note">
        Everything recipes are built from. Values are per 100 as bought — raw meat, dry
        grains. They are approximations good enough to plan on; check anything that matters
        against the packet or Fineli, the Finnish food composition database.
      </p>

      <div class="k-toolbar">
        <input
          class="k-input"
          type="search"
          placeholder="Search foods"
          value={q}
          onInput={(e) => setQ((e.target as HTMLInputElement).value)}
        />
        <button class="k-btn" onClick={() => setEditing(blankFood())}>
          + New food
        </button>
        <span class="k-dim">{state.foods.length} foods</span>
      </div>

      {filtered.length === 0 && <Empty>Nothing matches that.</Empty>}

      <table class="k-table k-foodtable">
        <thead>
          <tr>
            <th>Food</th>
            <th>Role</th>
            <th>Per 100</th>
            <th>Used in</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {filtered.map((f) => {
            const uses = usedBy(f.id);
            return (
              <tr key={f.id}>
                <td>
                  {f.fi || f.name}
                  {f.fi && <span class="k-dim"> · {f.name}</span>}
                  {f.state && <span class="k-tag">{f.state}</span>}
                </td>
                <td class="k-dim">{f.role}</td>
                <td class="k-nums">
                  {f.per100.kcal} kcal · {f.per100.protein}P · {f.per100.carbs}C ·{' '}
                  {f.per100.fat}F
                </td>
                <td class="k-dim">{uses.length || '—'}</td>
                <td class="k-right">
                  <button class="k-link" onClick={() => setEditing(f)}>
                    Edit
                  </button>{' '}
                  <button
                    class="k-link k-danger"
                    // Deleting a food that recipes depend on would leave them
                    // quietly miscounting, so the count is the guard.
                    disabled={uses.length > 0}
                    title={uses.length ? `Used in ${uses.length} recipe(s)` : 'Delete'}
                    onClick={() =>
                      update((s) => ({ ...s, foods: s.foods.filter((x) => x.id !== f.id) }))
                    }
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {editing && (
        <FoodForm initial={editing} onSave={save} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
