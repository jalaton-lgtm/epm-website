// Setup: every number the planner uses, plus the backup controls.
//
// Nothing personal is a constant anywhere in this codebase, which means all of
// it has to be reachable from here.

import { useRef, useState } from 'preact/hooks';
import type { KitchenState, SessionType } from '../../lib/kitchen/types';
import { defaultState, exportJSON, importJSON, newId } from '../../lib/kitchen/store';
import { Field, NumberInput } from './ui';

type Update = (fn: (s: KitchenState) => KitchenState) => void;

export default function SettingsPanel({
  state,
  update,
  replace,
}: {
  state: KitchenState;
  update: Update;
  replace: (s: KitchenState) => void;
}) {
  const s = state.settings;
  const setS = <K extends keyof typeof s>(k: K, v: (typeof s)[K]) =>
    update((prev) => ({ ...prev, settings: { ...prev.settings, [k]: v } }));

  const fileInput = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const shareTotal = s.mealSlots.reduce((n, m) => n + m.share, 0);

  const download = () => {
    const blob = new Blob([exportJSON(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kitchen-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const result = importJSON(await file.text());
    if (result.ok && result.state) {
      replace(result.state);
      setImportError(null);
    } else {
      setImportError(result.error ?? 'Could not read that file.');
    }
    if (fileInput.current) fileInput.current.value = '';
  };

  const setSession = (id: string, patch: Partial<SessionType>) =>
    setS(
      'sessionTypes',
      s.sessionTypes.map((t) => (t.id === id ? { ...t, ...patch } : t))
    );

  return (
    <div class="k-stats">
      <section class="k-panel">
        <h3>Energy</h3>
        <p class="k-dim">
          The rest-day figure is what a day costs you with no training in it, everything else
          included — not a basal metabolic rate. It is a starting estimate. The published
          equations assume able-bodied lean mass and a day spent walking about, so they read
          high for a wheelchair athlete; the weight log on the Stats tab is what will tell you
          whether this number is right.
        </p>
        <div class="k-row4">
          <Field label="Rest day" hint="kcal, training excluded">
            <NumberInput value={s.restDayKcal} onInput={(n) => setS('restDayKcal', n)} step={25} />
          </Field>
          <Field label="Daily deficit" hint="Negative for a surplus">
            <NumberInput
              value={s.dailyDeficit}
              onInput={(n) => setS('dailyDeficit', n)}
              step={25}
            />
          </Field>
          <Field label="Body weight">
            <NumberInput
              value={s.weightKg}
              onInput={(n) => setS('weightKg', n)}
              step={0.1}
              suffix="kg"
            />
          </Field>
        </div>
        {Math.abs(s.dailyDeficit) > 0 && (
          <p class="k-dim">
            {s.dailyDeficit > 0 ? 'A deficit' : 'A surplus'} of {Math.abs(s.dailyDeficit)} kcal a
            day works out at roughly {Math.abs((s.dailyDeficit * 7) / 7700).toFixed(2)} kg a week,
            at 7700 kcal per kilogram.
          </p>
        )}
      </section>

      <section class="k-panel">
        <h3>Macros</h3>
        <p class="k-dim">
          Protein and fat are set per kilogram of body weight. Carbohydrate is whatever energy
          is left after those two, which is why it rises on training days and falls on rest
          days without anyone having to set it.
        </p>
        <div class="k-row4">
          <Field label="Protein" hint="g per kg">
            <NumberInput
              value={s.proteinPerKg}
              onInput={(n) => setS('proteinPerKg', n)}
              step={0.1}
            />
          </Field>
          <Field label="Strength bonus" hint="extra g on gym days">
            <NumberInput
              value={s.proteinStrengthBonus}
              onInput={(n) => setS('proteinStrengthBonus', n)}
              step={5}
            />
          </Field>
          <Field label="Fat" hint="g per kg">
            <NumberInput value={s.fatPerKg} onInput={(n) => setS('fatPerKg', n)} step={0.1} />
          </Field>
        </div>
        <p class="k-dim">
          At {s.weightKg} kg that is {Math.round(s.weightKg * s.proteinPerKg)} g protein and{' '}
          {Math.round(s.weightKg * s.fatPerKg)} g fat a day.
        </p>
      </section>

      <section class="k-panel">
        <h3>The generator</h3>
        <p class="k-dim">
          With tuning on, generating a week may add or remove a flexible ingredient — more
          rice on a track day, less on a rest day — to land the day on its energy target.
          Only foods marked as carbohydrate move, and only by up to half again or half as
          much; protein and vegetables are left alone. Any adjustment is shown on the meal
          and bought on the shopping list.
        </p>
        <label class="k-inline">
          <input
            type="checkbox"
            checked={s.tuneIngredients}
            onChange={(e) =>
              setS('tuneIngredients', (e.target as HTMLInputElement).checked)
            }
          />
          <span>Let the generator adjust flexible ingredients</span>
        </label>
      </section>

      <section class="k-panel">
        <h3>Goal</h3>
        <div class="k-row4">
          <Field label="Goal weight" hint="Leave blank for none">
            <input
              class="k-input"
              type="number"
              step="0.1"
              value={s.goalWeightKg ?? ''}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                setS('goalWeightKg', v === '' ? null : Number(v));
              }}
            />
          </Field>
          <Field label="By">
            <input
              class="k-input"
              type="date"
              value={s.goalDate ?? ''}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                setS('goalDate', v === '' ? null : v);
              }}
            />
          </Field>
        </div>
      </section>

      <section class="k-panel">
        <h3>Training types</h3>
        <p class="k-dim">
          What one session of each costs, and whether it counts as strength work for the
          protein bonus. Rename them, retune them, add your own — the planner only knows what
          is in this list.
        </p>
        {s.sessionTypes.map((t) => (
          <div class="k-inline" key={t.id}>
            <Field label="Name">
              <input
                class="k-input"
                value={t.name}
                onInput={(e) => setSession(t.id, { name: (e.target as HTMLInputElement).value })}
              />
            </Field>
            <Field label="Cost">
              <NumberInput
                value={t.kcal}
                onInput={(n) => setSession(t.id, { kcal: n })}
                step={25}
                suffix="kcal"
              />
            </Field>
            <Field label="Strength">
              <input
                type="checkbox"
                checked={t.strength}
                onChange={(e) =>
                  setSession(t.id, { strength: (e.target as HTMLInputElement).checked })
                }
              />
            </Field>
            <button
              class="k-link k-danger"
              onClick={() =>
                setS(
                  'sessionTypes',
                  s.sessionTypes.filter((x) => x.id !== t.id)
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          class="k-btn k-btn-quiet"
          onClick={() =>
            setS('sessionTypes', [
              ...s.sessionTypes,
              { id: newId('t'), name: 'New type', kcal: 250, strength: false },
            ])
          }
        >
          + Training type
        </button>
      </section>

      <section class="k-panel">
        <h3>Meals</h3>
        <p class="k-dim">
          The slots each day is divided into, and the share of the day's energy each one aims
          at. Add a second snack, a pre-training feed, whatever the day actually holds.
        </p>
        {s.mealSlots.map((m, i) => (
          <div class="k-inline" key={m.id}>
            <Field label="Name">
              <input
                class="k-input"
                value={m.name}
                onInput={(e) =>
                  setS(
                    'mealSlots',
                    s.mealSlots.map((x, j) =>
                      j === i ? { ...x, name: (e.target as HTMLInputElement).value } : x
                    )
                  )
                }
              />
            </Field>
            <Field label="Time">
              <input
                class="k-input"
                type="time"
                value={m.time}
                onInput={(e) =>
                  setS(
                    'mealSlots',
                    s.mealSlots.map((x, j) =>
                      j === i ? { ...x, time: (e.target as HTMLInputElement).value } : x
                    )
                  )
                }
              />
            </Field>
            <Field label="Share">
              <NumberInput
                value={Math.round(m.share * 100)}
                onInput={(n) =>
                  setS(
                    'mealSlots',
                    s.mealSlots.map((x, j) => (j === i ? { ...x, share: n / 100 } : x))
                  )
                }
                step={5}
                suffix="%"
              />
            </Field>
            <button
              class="k-link k-danger"
              onClick={() =>
                setS(
                  'mealSlots',
                  s.mealSlots.filter((_, j) => j !== i)
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          class="k-btn k-btn-quiet"
          onClick={() =>
            setS('mealSlots', [
              ...s.mealSlots,
              { id: newId('m'), name: 'New meal', time: '12:00', share: 0.1 },
            ])
          }
        >
          + Meal slot
        </button>
        {Math.abs(shareTotal - 1) > 0.005 && (
          <p class="k-warn">
            The shares add up to {Math.round(shareTotal * 100)}%, not 100%. The generator will
            still work, but it will aim the day{' '}
            {shareTotal > 1 ? 'over' : 'under'} its energy target.
          </p>
        )}
      </section>

      <section class="k-panel">
        <h3>Recipe categories</h3>
        <p class="k-dim">
          How the recipe library is filed — breakfast, pasta, asian, whatever your cooking
          actually divides into. This is for finding things by hand and has nothing to do
          with which slot the generator will put a recipe in; that is set on the recipe
          itself. Deleting a category leaves its recipes uncategorised rather than deleting
          them.
        </p>
        {s.recipeCategories.map((c, i) => (
          <div class="k-inline" key={c.id}>
            <Field label="Name">
              <input
                class="k-input"
                value={c.name}
                onInput={(e) =>
                  setS(
                    'recipeCategories',
                    s.recipeCategories.map((x, j) =>
                      j === i ? { ...x, name: (e.target as HTMLInputElement).value } : x
                    )
                  )
                }
              />
            </Field>
            <span class="k-dim">
              {state.recipes.filter((r) => r.category === c.id).length} recipes
            </span>
            <button
              class="k-link k-danger"
              onClick={() =>
                setS(
                  'recipeCategories',
                  s.recipeCategories.filter((_, j) => j !== i)
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
        <button
          class="k-btn k-btn-quiet"
          onClick={() =>
            setS('recipeCategories', [
              ...s.recipeCategories,
              { id: newId('cat'), name: 'New category' },
            ])
          }
        >
          + Category
        </button>
      </section>

      <section class="k-panel">
        <h3>Your data</h3>
        <p class="k-dim">
          All of this lives in this browser and nowhere else. Nothing is sent anywhere, which
          is the good news and also the catch: clearing site data, or switching to another
          device, loses the lot. The export file is the only backup there is, and it is also
          how you move the planner to your phone.
        </p>
        <div class="k-inline">
          <button class="k-btn" onClick={download}>
            Export backup
          </button>
          <button class="k-btn k-btn-quiet" onClick={() => fileInput.current?.click()}>
            Import backup
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            class="k-hidden"
            onChange={onFile}
          />
          {confirmReset ? (
            <>
              <span class="k-warn">Erase everything and start over?</span>
              <button
                class="k-btn k-danger"
                onClick={() => {
                  replace(defaultState());
                  setConfirmReset(false);
                }}
              >
                Yes, erase
              </button>
              <button class="k-btn k-btn-quiet" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </>
          ) : (
            <button class="k-btn k-btn-quiet k-danger" onClick={() => setConfirmReset(true)}>
              Reset everything
            </button>
          )}
        </div>
        {importError && <p class="k-warn">{importError}</p>}
        <p class="k-dim">
          {state.foods.length} foods · {state.recipes.length} recipes ·{' '}
          {Object.keys(state.plans).length} weeks planned · {state.weights.length} weigh-ins
          logged
        </p>
      </section>
    </div>
  );
}
