// The planner island. Owns the state, the persistence, and the week you are
// looking at; everything else is a screen it hands that state to.

import { useEffect, useState } from 'preact/hooks';
import type { KitchenState } from '../../lib/kitchen/types';
import { loadState, saveState } from '../../lib/kitchen/store';
import { autoPlanWeek } from '../../lib/kitchen/energy';
import { addWeeks, currentWeekKey, weekLabel, weekRange } from '../../lib/kitchen/weeks';
import WeekGrid from './WeekGrid';
import Recipes from './Recipes';
import Foods from './Foods';
import Shopping from './Shopping';
import Stats from './Stats';
import SettingsPanel from './SettingsPanel';

const TABS = [
  { id: 'plan', label: 'Plan' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'foods', label: 'Foods' },
  { id: 'shopping', label: 'Shopping' },
  { id: 'stats', label: 'Stats' },
  { id: 'setup', label: 'Setup' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function Planner() {
  // Starts null so the server-rendered markup and the first client render
  // agree. localStorage is only reachable after mount, so reading it in the
  // initial state would hydrate into a mismatch.
  const [state, setState] = useState<KitchenState | null>(null);
  const [week, setWeek] = useState(currentWeekKey());
  const [tab, setTab] = useState<TabId>('plan');
  const [saveFailed, setSaveFailed] = useState(false);
  const [confirmGenerate, setConfirmGenerate] = useState(false);

  useEffect(() => {
    setState(loadState());
  }, []);

  useEffect(() => {
    if (!state) return;
    setSaveFailed(!saveState(state));
  }, [state]);

  if (!state) {
    return <div class="k-loading">Loading your planner…</div>;
  }

  // The single way anything in here changes. One updater shape, applied
  // functionally, so a stale closure cannot overwrite a fresher value — and
  // so there is no second path that takes a plain value and silently stores
  // the wrong thing, which is how the prototype's meal assignment died.
  const update = (fn: (s: KitchenState) => KitchenState) =>
    setState((prev) => (prev ? fn(prev) : prev));

  const hasPlan = Object.keys(state.plans[week] ?? {}).some(
    (day) => Object.keys(state.plans[week]![day as never] ?? {}).length > 0
  );

  const generate = () => {
    update((s) => ({
      ...s,
      plans: {
        ...s.plans,
        [week]: autoPlanWeek(s.training[week] ?? {}, s.settings, s.recipes, s.foods),
      },
    }));
    setConfirmGenerate(false);
  };

  return (
    <div class="k">
      <nav class="k-tabs" aria-label="Planner sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            class={`k-tab${tab === t.id ? ' k-tab-on' : ''}`}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {saveFailed && (
        <p class="k-warn">
          Could not save to this browser's storage, so changes will not survive a reload.
          Private browsing or a full storage quota is the usual cause. Export a backup from
          Setup before you lose anything.
        </p>
      )}

      {(tab === 'plan' || tab === 'shopping' || tab === 'stats') && (
        <div class="k-weekbar">
          <button class="k-icon" onClick={() => setWeek(addWeeks(week, -1))} aria-label="Previous week">
            ←
          </button>
          <select
            class="k-input"
            value={week}
            aria-label="Week"
            onChange={(e) => setWeek((e.target as HTMLSelectElement).value)}
          >
            {weekRange(currentWeekKey(), 8, 16).map((k) => (
              <option key={k} value={k}>
                {weekLabel(k)}
                {k === currentWeekKey() ? ' · this week' : ''}
              </option>
            ))}
          </select>
          <button class="k-icon" onClick={() => setWeek(addWeeks(week, 1))} aria-label="Next week">
            →
          </button>

          {tab === 'plan' && (
            <span class="k-weekbar-end">
              {confirmGenerate ? (
                <>
                  <span class="k-dim">Replace this week's plan?</span>
                  <button class="k-btn" onClick={generate}>
                    Replace
                  </button>
                  <button class="k-btn k-btn-quiet" onClick={() => setConfirmGenerate(false)}>
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  class="k-btn"
                  onClick={() => (hasPlan ? setConfirmGenerate(true) : generate())}
                >
                  Generate week
                </button>
              )}
            </span>
          )}
        </div>
      )}

      {tab === 'plan' && <WeekGrid state={state} week={week} update={update} />}
      {tab === 'recipes' && <Recipes state={state} update={update} />}
      {tab === 'foods' && <Foods state={state} update={update} />}
      {tab === 'shopping' && <Shopping state={state} week={week} update={update} />}
      {tab === 'stats' && <Stats state={state} week={week} update={update} />}
      {tab === 'setup' && (
        <SettingsPanel state={state} update={update} replace={(s) => setState(s)} />
      )}
    </div>
  );
}
