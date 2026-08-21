// Weight log, trend, adherence, and what the kitchen actually cooks.
//
// Everything on this screen is derived from something that was logged. The
// prototype's analytics displayed a "current weight" that was a hardcoded
// literal in one place and, in the other, `startWeight - weeksPlanned * 0.25`
// — a number invented from how many weeks had been filled in, rendered in the
// same large type as a measurement. Where there is no data here, the screen
// says there is no data.

import { useMemo, useState } from 'preact/hooks';
import type { KitchenState, WeekKey } from '../../lib/kitchen/types';
import { DAYS } from '../../lib/kitchen/types';
import {
  impliedRestDayKcal,
  rollingMean,
  weekAdherence,
  weekTotals,
  weightTrend,
  dayTargets,
} from '../../lib/kitchen/energy';
import { dateOfDay, daysBetween, todayISO } from '../../lib/kitchen/weeks';
import { Empty, Field, NumberInput } from './ui';

type Update = (fn: (s: KitchenState) => KitchenState) => void;

function Sparkline({ points }: { points: { date: string; kg: number }[] }) {
  if (points.length < 2) return null;
  const w = 520;
  const h = 120;
  const pad = 8;
  const xs = points.map((p) => Date.parse(`${p.date}T00:00:00Z`));
  const ys = points.map((p) => p.kg);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1;
  // A flat line should read as flat, not be stretched to fill the box.
  const spanY = Math.max(maxY - minY, 1);

  const path = points
    .map((p, i) => {
      const x = pad + ((xs[i] - minX) / spanX) * (w - pad * 2);
      const y = h - pad - ((p.kg - minY) / spanY) * (h - pad * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg class="k-spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`Weight trend from ${points[0].kg.toFixed(1)} to ${points[points.length - 1].kg.toFixed(1)} kilograms`}>
      <path d={path} fill="none" stroke="currentColor" stroke-width="2" />
    </svg>
  );
}

export default function Stats({
  state,
  week,
  update,
}: {
  state: KitchenState;
  week: WeekKey;
  update: Update;
}) {
  const [newWeight, setNewWeight] = useState<number>(state.settings.weightKg);
  const [date, setDate] = useState(todayISO());

  const smoothed = useMemo(() => rollingMean(state.weights), [state.weights]);
  const trend = useMemo(() => weightTrend(state.weights), [state.weights]);
  const adherence = weekAdherence(state.plans[week]);
  const totals = weekTotals(state.plans[week], state.recipes, state.foods);

  const weekTarget = useMemo(
    () =>
      DAYS.reduce((n, day) => n + dayTargets(state.training[week]?.[day], state.settings).kcal, 0),
    [state.training, week, state.settings]
  );

  const weekKeys = useMemo(() => Object.keys(state.plans).sort(), [state.plans]);
  const implied = useMemo(
    () =>
      impliedRestDayKcal(
        state.weights,
        state.plans,
        state.training,
        state.settings,
        state.recipes,
        state.foods,
        weekKeys
      ),
    [state.weights, state.plans, state.training, state.settings, state.recipes, state.foods, weekKeys]
  );

  // When each recipe was last actually eaten, and how often.
  const cookStats = useMemo(() => {
    const stats = new Map<string, { count: number; last?: string }>();
    for (const wk of weekKeys) {
      for (const day of DAYS) {
        for (const entry of Object.values(state.plans[wk]?.[day] ?? {})) {
          if (!entry?.consumed) continue;
          const when = dateOfDay(wk, day);
          const s = stats.get(entry.recipeId) ?? { count: 0 };
          s.count++;
          if (!s.last || when > s.last) s.last = when;
          stats.set(entry.recipeId, s);
        }
      }
    }
    return state.recipes
      .map((r) => ({ recipe: r, ...(stats.get(r.id) ?? { count: 0 }) }))
      .sort((a, b) => b.count - a.count);
  }, [state.plans, state.recipes, weekKeys]);

  const latest = smoothed.length ? smoothed[smoothed.length - 1] : null;
  const today = todayISO();

  const addWeight = () => {
    if (!Number.isFinite(newWeight) || newWeight <= 0) return;
    update((s) => ({
      ...s,
      // One reading per date: logging twice in a day corrects rather than duplicates.
      weights: [...s.weights.filter((w) => w.date !== date), { date, kg: newWeight }],
      settings: { ...s.settings, weightKg: newWeight },
    }));
  };

  return (
    <div class="k-stats">
      <section class="k-panel">
        <h3>Weight</h3>
        <div class="k-inline">
          <Field label="Date">
            <input
              class="k-input"
              type="date"
              value={date}
              max={today}
              onInput={(e) => setDate((e.target as HTMLInputElement).value)}
            />
          </Field>
          <Field label="Weight">
            <NumberInput value={newWeight} onInput={setNewWeight} step={0.1} suffix="kg" />
          </Field>
          <button class="k-btn" onClick={addWeight}>
            Log
          </button>
        </div>

        {state.weights.length === 0 ? (
          <Empty>
            No weigh-ins yet. Three or four a week is enough — day-to-day swings are mostly
            water, so it is the smoothed line that means anything, not any single morning.
          </Empty>
        ) : (
          <>
            <div class="k-figures">
              <div>
                <span class="k-fig">{latest?.kg.toFixed(1)}</span>
                <span class="k-dim">kg, 7-day average</span>
              </div>
              {trend && (
                <div>
                  <span class="k-fig">
                    {trend.kgPerWeek > 0 ? '+' : ''}
                    {trend.kgPerWeek.toFixed(2)}
                  </span>
                  <span class="k-dim">kg/week over {trend.days} days</span>
                </div>
              )}
              {state.settings.goalWeightKg && latest && (
                <div>
                  <span class="k-fig">
                    {(latest.kg - state.settings.goalWeightKg).toFixed(1)}
                  </span>
                  <span class="k-dim">kg to go</span>
                </div>
              )}
            </div>
            <Sparkline points={smoothed} />
            {state.settings.goalWeightKg && state.settings.goalDate && trend && (
              <GoalNote
                current={latest!.kg}
                goal={state.settings.goalWeightKg}
                goalDate={state.settings.goalDate}
                kgPerWeek={trend.kgPerWeek}
              />
            )}
          </>
        )}
      </section>

      <section class="k-panel">
        <h3>This week</h3>
        <div class="k-figures">
          <div>
            <span class="k-fig">{Math.round(adherence.percent)}%</span>
            <span class="k-dim">
              of planned meals eaten ({adherence.consumed}/{adherence.planned})
            </span>
          </div>
          <div>
            <span class="k-fig">{Math.round(totals.kcal)}</span>
            <span class="k-dim">kcal planned against {weekTarget} target</span>
          </div>
          <div>
            <span class="k-fig">
              {DAYS.reduce(
                (n, day) =>
                  n +
                  Object.values(state.training[week]?.[day] ?? {}).reduce(
                    (a, b) => a + (b || 0),
                    0
                  ),
                0
              )}
            </span>
            <span class="k-dim">training sessions this week</span>
          </div>
        </div>
      </section>

      <section class="k-panel">
        <h3>What your data implies</h3>
        {implied.blocked ? (
          <Empty>{implied.blocked}</Empty>
        ) : (
          implied.result && (
            <>
              <div class="k-figures">
                <div>
                  <span class="k-fig">{implied.result.restDayKcal}</span>
                  <span class="k-dim">kcal rest-day estimate from your logs</span>
                </div>
                <div>
                  <span class="k-fig">
                    {implied.result.delta > 0 ? '+' : ''}
                    {implied.result.delta}
                  </span>
                  <span class="k-dim">against the {state.settings.restDayKcal} in settings</span>
                </div>
              </div>
              <p class="k-dim">
                Worked back from {implied.result.days} days of weight trend and the meals you
                ticked as eaten, at roughly 7700 kcal per kilogram. It changes nothing on its
                own — if you think it is right, edit the setting yourself.
              </p>
              {implied.result.adherence < 80 && (
                <p class="k-warn">
                  Only {Math.round(implied.result.adherence)}% of planned meals were ticked as
                  eaten, so the intake side of this is incomplete and the estimate will read
                  low. Treat it as noise until the logging is more complete.
                </p>
              )}
            </>
          )
        )}
      </section>

      <section class="k-panel">
        <h3>The rotation</h3>
        {cookStats.every((c) => c.count === 0) ? (
          <Empty>Nothing ticked as eaten yet. This fills in as you cook.</Empty>
        ) : (
          <table class="k-table">
            <thead>
              <tr>
                <th>Recipe</th>
                <th>Times eaten</th>
                <th>Last</th>
              </tr>
            </thead>
            <tbody>
              {cookStats.map(({ recipe, count, last }) => {
                const stale = last ? daysBetween(last, today) : null;
                return (
                  <tr key={recipe.id}>
                    <td>{recipe.name}</td>
                    <td>{count || <span class="k-dim">—</span>}</td>
                    <td>
                      {last ? (
                        <>
                          {last}
                          {stale !== null && stale > 42 && (
                            <span class="k-tag">{Math.floor(stale / 7)} weeks ago</span>
                          )}
                        </>
                      ) : (
                        <span class="k-dim">never</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function GoalNote({
  current,
  goal,
  goalDate,
  kgPerWeek,
}: {
  current: number;
  goal: number;
  goalDate: string;
  kgPerWeek: number;
}) {
  const weeksLeft = daysBetween(todayISO(), goalDate) / 7;
  const remaining = current - goal;

  if (weeksLeft <= 0) {
    return <p class="k-dim">Target date has passed. {remaining.toFixed(1)} kg from the goal.</p>;
  }
  const required = remaining / weeksLeft;
  // Comparing the rate you need against the rate you are actually on is the
  // only honest way to say whether a target is on track.
  const onTrack = kgPerWeek <= 0 && Math.abs(kgPerWeek) >= Math.abs(required) * 0.8;

  return (
    <p class={onTrack ? 'k-dim' : 'k-warn'}>
      {remaining.toFixed(1)} kg in {weeksLeft.toFixed(0)} weeks needs {required.toFixed(2)}{' '}
      kg/week. You are on {kgPerWeek.toFixed(2)}.{' '}
      {onTrack ? 'On track.' : 'Not on track at the current rate.'}
    </p>
  );
}
