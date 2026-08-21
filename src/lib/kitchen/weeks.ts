// ISO week keys.
//
// The prototype generated its week list by counting forward in seven-day steps
// from a hardcoded 30 June 2025, which means the app had a shelf life: opened
// today it would offer a dropdown of weeks that ended fourteen months ago, and
// week 0 would mean different calendar dates depending on when you looked.
//
// Weeks are identified here by their ISO week key instead — "2026-W34" — which
// is stable, sorts correctly as a string within a year, is what Finnish
// calendars and training programmes already use, and starts on Monday like the
// day grid. Nothing is stored against a week index, so nothing shifts when the
// year rolls over.
//
// All arithmetic runs in UTC. The dates here are calendar labels, not
// instants, and doing this in local time means a week boundary lands an hour
// wrong twice a year.

import type { Day, ISODate, WeekKey } from './types';
import { DAYS } from './types';

const MS_PER_DAY = 86_400_000;

/** ISO week number and its week-numbering year, which can differ from the calendar year. */
function isoWeekOf(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Monday = 1 ... Sunday = 7, then step to the Thursday of the same week.
  // ISO defines a week's year as the year containing that Thursday.
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - yearStart) / MS_PER_DAY + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

export function weekKeyOf(date: Date): WeekKey {
  const { year, week } = isoWeekOf(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function currentWeekKey(): WeekKey {
  return weekKeyOf(new Date());
}

export function parseWeekKey(key: WeekKey): { year: number; week: number } {
  const m = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!m) return isoWeekOf(new Date());
  return { year: Number(m[1]), week: Number(m[2]) };
}

/** The Monday that opens the given ISO week. */
export function weekStart(key: WeekKey): Date {
  const { year, week } = parseWeekKey(key);
  // 4 January is by definition in ISO week 1, so its Monday anchors the year.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const dayNum = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - dayNum + 1 + (week - 1) * 7);
  return monday;
}

/** Move n weeks forward (or back, for negative n). */
export function addWeeks(key: WeekKey, n: number): WeekKey {
  const d = weekStart(key);
  d.setUTCDate(d.getUTCDate() + n * 7);
  return weekKeyOf(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function toISODate(d: Date): ISODate {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate()
  ).padStart(2, '0')}`;
}

/** Today, as a calendar date in the viewer's own timezone. */
export function todayISO(): ISODate {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;
}

/** The calendar date a given weekday falls on within a week. */
export function dateOfDay(key: WeekKey, day: Day): ISODate {
  const d = weekStart(key);
  d.setUTCDate(d.getUTCDate() + DAYS.indexOf(day));
  return toISODate(d);
}

/** "Week 34 · 17–23 Aug" — enough to recognise without reading a date range twice. */
export function weekLabel(key: WeekKey): string {
  const { week } = parseWeekKey(key);
  const start = weekStart(key);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);

  const month = (d: Date) =>
    d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();

  const range = sameMonth
    ? `${start.getUTCDate()}–${end.getUTCDate()} ${month(end)}`
    : `${start.getUTCDate()} ${month(start)} – ${end.getUTCDate()} ${month(end)}`;

  return `Week ${week} · ${range}`;
}

/** A window of weeks around a key, for the week picker. */
export function weekRange(centre: WeekKey, back: number, forward: number): WeekKey[] {
  const keys: WeekKey[] = [];
  for (let i = -back; i <= forward; i++) keys.push(addWeeks(centre, i));
  return keys;
}

/** Whole days between two ISO dates (b - a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / MS_PER_DAY);
}
