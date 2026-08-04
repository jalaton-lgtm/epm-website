// Does `pageUpdated` in src/lib/schema.ts still tell the truth?
//
// WHY THIS EXISTS, AND WHY IT IS NOT A RULE
//
// "Bump pageUpdated when you change what a page says" was a standing rule for
// four sessions. It was well-reasoned, written down twice, and it broke anyway
// — PR #23 rewrote most of /partners on 4.8.2026 and shipped it with
// dateModified: 2026-08-03 still in the JSON-LD. A rule whose enforcement
// mechanism is remembering at close-out will keep failing that way, so this
// takes over the checkable part.
//
// IT ASKS, IT DOES NOT DECIDE. The script cannot tell a rewritten paragraph
// from a changed margin, and the rule it replaces is explicitly "not for CSS".
// So it reports a page whose file moved after its date and stops; the human
// says which kind of change it was. The escape hatch is a `[no-copy]` tag in
// the commit subject, chosen because it lands in the permanent record — an
// override nobody can see is the failure mode this whole file is about.
//
// DELIBERATELY OUT OF SCOPE: copy that lives in components, layouts or lib
// (Nav labels, footer, telemetry.ts strings). Those change what a page renders
// without touching its file. Watching them would trip every page on every
// shared edit, and the actual stale entries — '/' and '/press' after the
// 28 July voice pass — were all page-file edits. Widen it if that stops
// being true.
//
// NOT WIRED INTO `npm run build`. Cloudflare runs the build to deploy, and a
// date mismatch must never be able to take production down. Local gate only:
// `npm run check:dates`, or `npm run check` for build + gate together.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA = 'src/lib/schema.ts';

// Commits before this date cannot be tagged [no-copy] retroactively, so the
// gate would flag them forever. All four entries were reviewed by hand on
// 4.8.2026, when this script landed, and the findings were:
//
//   /          index.astro moved in a7c2e31 — a crop-anchor prop, markup only.
//              Correctly NOT a copy change, so 2026-07-28 stands.
//   /profile   clean.
//   /press     clean.
//   /partners  genuinely stale: PR #23 rewrote most of the page on 4.8. and
//              left 2026-08-03 in the JSON-LD. Bumped in the same commit as
//              this script.
//
// So history is settled and the gate governs from here. Do not move this date
// to silence a failure — that is what [no-copy] is for.
const GATE_FROM = '2026-08-04';

/** Local calendar date, matching git's %cs (which is also local). */
function today() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

/** The pageUpdated object literal, read as text so this needs no TS toolchain. */
function readPageUpdated() {
  const src = readFileSync(join(root, SCHEMA), 'utf8');
  const block = src.match(/pageUpdated:\s*Record<string,\s*string>\s*=\s*\{([\s\S]*?)\}/);
  if (!block) throw new Error(`Could not find pageUpdated in ${SCHEMA}`);
  const entries = [...block[1].matchAll(/'([^']*)':\s*'(\d{4}-\d{2}-\d{2})'/g)];
  if (!entries.length) throw new Error(`pageUpdated in ${SCHEMA} parsed as empty`);
  return entries.map(([, path, date]) => ({ path, date }));
}

/** EN page and FI twin for a canonical path. '/' is index.astro. */
function pageFilesFor(canonical) {
  const stem = canonical === '/' ? '/index' : canonical;
  return [`src/pages${stem}.astro`, `src/pages/fi${stem}.astro`];
}

/**
 * When this file's copy last changed: the newest commit touching it whose
 * subject is not tagged [no-copy]. Uncommitted edits count as today, so the
 * gate is useful before the commit as well as after.
 */
function lastCopyChange(file) {
  if (!existsSync(join(root, file))) return { missing: true };
  if (git(['status', '--porcelain', '--', file])) {
    return { date: today(), dirty: true };
  }
  const log = git(['log', '--format=%cs%x09%s', '--', file]);
  if (!log) return { untracked: true };
  for (const line of log.split('\n')) {
    const [date, subject = ''] = line.split('\t');
    if (date < GATE_FROM) break; // settled history, see GATE_FROM
    if (!subject.includes('[no-copy]')) return { date, subject };
  }
  return { allSkipped: true };
}

/** Top-level info pages on disk. Blog and 404 carry no pageUpdated by design. */
function infoPagesOnDisk() {
  return readdirSync(join(root, 'src/pages'))
    .filter((f) => f.endsWith('.astro') && f !== '404.astro')
    .map((f) => (f === 'index.astro' ? '/' : `/${f.replace(/\.astro$/, '')}`));
}

const problems = [];
const notes = [];
const entries = readPageUpdated();

for (const { path, date } of entries) {
  for (const file of pageFilesFor(path)) {
    const change = lastCopyChange(file);

    if (change.missing) {
      problems.push(`${path}  ${file} is in pageUpdated but not on disk`);
      continue;
    }
    if (change.untracked) {
      notes.push(`${path}  ${file} is untracked — no history to check yet`);
      continue;
    }
    if (change.allSkipped) continue;

    if (change.date > date) {
      const how = change.dirty ? 'uncommitted changes' : `last changed ${change.date}`;
      problems.push(
        `${path}  pageUpdated says ${date}, but ${file} has ${how}.\n` +
          `        → Did the COPY change? Bump '${path}' in ${SCHEMA} to ${change.date}.\n` +
          `        → CSS, markup or tooling only? Say so: commit with [no-copy] in the subject.`
      );
    }
  }
}

// Rule "a page ships complete": a new info page with no pageUpdated entry
// emits no dateModified at all, silently.
const covered = new Set(entries.map((e) => e.path));
for (const path of infoPagesOnDisk()) {
  if (!covered.has(path)) {
    problems.push(`${path}  info page has no pageUpdated entry, so it ships without dateModified`);
  }
}

for (const note of notes) console.log(`note:  ${note}`);

if (problems.length) {
  console.error(`\npageUpdated is out of date in ${problems.length} place(s):\n`);
  for (const p of problems) console.error(`  ${p}\n`);
  process.exit(1);
}

console.log(`pageUpdated is current for all ${entries.length} info pages.`);
