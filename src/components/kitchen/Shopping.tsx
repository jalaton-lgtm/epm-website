// The shopping list, and the cook list that explains it.

import { useMemo, useState } from 'preact/hooks';
import type { KitchenState, WeekKey } from '../../lib/kitchen/types';
import { AISLE_LABELS } from '../../lib/kitchen/types';
import {
  batchesByRecipe,
  buildShoppingList,
  formatLine,
  portionsByRecipe,
  shoppingListAsText,
} from '../../lib/kitchen/shopping';
import { Empty } from './ui';

type Update = (fn: (s: KitchenState) => KitchenState) => void;

export default function Shopping({
  state,
  week,
  update,
}: {
  state: KitchenState;
  week: WeekKey;
  update: Update;
}) {
  const [copied, setCopied] = useState(false);
  const plan = state.plans[week];

  const groups = useMemo(
    () => buildShoppingList(plan, state.recipes, state.foods),
    [plan, state.recipes, state.foods]
  );
  const batches = useMemo(() => batchesByRecipe(plan, state.recipes), [plan, state.recipes]);
  const portions = useMemo(() => portionsByRecipe(plan), [plan]);

  const total = groups.reduce((n, g) => n + g.lines.length, 0);
  const ticked = groups.reduce(
    (n, g) => n + g.lines.filter((l) => state.bought[`${week}::${l.key}`]).length,
    0
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shoppingListAsText(groups, AISLE_LABELS));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (total === 0) {
    return <Empty>Nothing planned this week yet, so there is nothing to buy.</Empty>;
  }

  return (
    <>
      <div class="k-toolbar k-noprint">
        <span class="k-dim">
          {ticked}/{total} picked up
        </span>
        <button class="k-btn k-btn-quiet" onClick={copy}>
          {copied ? 'Copied' : 'Copy list'}
        </button>
        <button class="k-btn k-btn-quiet" onClick={() => window.print()}>
          Print
        </button>
        <button
          class="k-btn k-btn-quiet"
          onClick={() =>
            update((s) => {
              const bought = { ...s.bought };
              for (const key of Object.keys(bought)) {
                if (key.startsWith(`${week}::`)) delete bought[key];
              }
              return { ...s, bought };
            })
          }
        >
          Reset ticks
        </button>
      </div>

      <div class="k-shopcols">
        <div>
          {groups.map((group) => (
            <section class="k-aisle" key={group.aisle}>
              <h3>{AISLE_LABELS[group.aisle]}</h3>
              <ul class="k-shoplist">
                {group.lines.map((line) => {
                  const id = `${week}::${line.key}`;
                  const done = !!state.bought[id];
                  return (
                    <li key={line.key} class={done ? 'k-shop-done' : ''}>
                      <label>
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={() =>
                            update((s) => ({ ...s, bought: { ...s.bought, [id]: !done } }))
                          }
                        />
                        <span class="k-shop-amount">{formatLine(line)}</span>
                        {/* Finnish leads because this list gets read in a
                            Finnish shop; the English name stays for the
                            recipes, which are written in English. */}
                        <span class="k-shop-name">{line.fi || line.item}</span>
                        {line.fi && <span class="k-dim k-shop-en">{line.item}</span>}
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <aside class="k-cooklist">
          <h3>Cook this week</h3>
          <p class="k-dim">
            The list above buys for these batches. Planning three portions of something that
            serves four is one cooking session, not three shops.
          </p>
          <ul>
            {[...batches.entries()].map(([id, count]) => {
              const recipe = state.recipes.find((r) => r.id === id);
              if (!recipe) return null;
              const p = portions.get(id) ?? 0;
              return (
                <li key={id}>
                  <strong>{recipe.name}</strong>
                  <span class="k-dim">
                    {' '}
                    — cook {count}×, {p} portion{p === 1 ? '' : 's'} planned
                    {count * recipe.serves > p && `, ${count * recipe.serves - p} spare`}
                  </span>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </>
  );
}
