// Fetch the latest @mattilae posts from Behold and self-host their images.
//
// Runs as npm's `prebuild` hook, so every `npm run build` (local or on
// Cloudflare Workers Builds) starts from fresh posts. Output is build output,
// not source, and both paths are gitignored:
//
//   public/instagram/<id>.webp   the images, served from esapekkamattila.com
//   src/data/instagram.json      [{ id, href, src, width, height, alt }]
//
// WHY BUILD TIME AND SELF-HOSTED. Visitors' browsers never talk to Behold or
// Instagram. That keeps the launch report's privacy position true: no third
// parties, nothing to disclose. It also means the strip only changes when the
// site rebuilds, which a daily Deploy Hook takes care of (see
// workers/rebuild-cron/).
//
// IT NEVER FAILS THE BUILD. Same principle as scripts/check-dates.mjs: an
// Instagram outage must not be able to take production down. On any error
// this logs, writes an empty array and exits 0. InstagramStrip.astro then
// renders nothing, heading included.
//
// The feed URL comes from the BEHOLD_FEED_URL build variable (Cloudflare
// dashboard, or .env locally). The repo is public, so it is never committed.
//
// Local run: `npm run fetch:instagram`. `npm run dev` does not fetch.

import { mkdirSync, readdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const IMG_DIR = join(root, 'public/instagram');
const DATA_FILE = join(root, 'src/data/instagram.json');

const MAX_POSTS = 6;
const FEED_TIMEOUT_MS = 10_000;
const IMAGE_TIMEOUT_MS = 15_000;
const ALT_MAX = 120;
const ALT_FALLBACK = 'Instagram post by Esa-Pekka Mattila';

// Posts to leave out by Behold post id, for example the pinned 2024 post if
// the feed carries it and Behold's dashboard cannot hide it. Empty until a
// real feed response shows it is needed.
const EXCLUDED_POST_IDS = new Set([]);

const log = (msg) => console.log(`[fetch-instagram] ${msg}`);

/** `npm run build` does not load .env, so read BEHOLD_FEED_URL from it for local runs. */
function feedUrl() {
  if (process.env.BEHOLD_FEED_URL) return process.env.BEHOLD_FEED_URL.trim();
  const envFile = join(root, '.env');
  if (!existsSync(envFile)) return '';
  const line = readFileSync(envFile, 'utf8')
    .split('\n')
    .find((l) => /^\s*BEHOLD_FEED_URL\s*=/.test(l));
  return line ? line.replace(/^\s*BEHOLD_FEED_URL\s*=\s*/, '').replace(/^["']|["']\s*$/g, '').trim() : '';
}

function resetImageDir() {
  rmSync(IMG_DIR, { recursive: true, force: true });
  mkdirSync(IMG_DIR, { recursive: true });
}

function writeData(posts) {
  mkdirSync(dirname(DATA_FILE), { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2) + '\n');
}

/** Caption → alt text: whitespace collapsed, cut at a word boundary near ALT_MAX. */
function altFrom(caption) {
  const text = String(caption ?? '').replace(/\s+/g, ' ').trim();
  if (!text) return ALT_FALLBACK;
  if (text.length <= ALT_MAX) return text;
  const cut = text.slice(0, ALT_MAX);
  const space = cut.lastIndexOf(' ');
  return (space > ALT_MAX * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:!?–—-]+$/, '') + '…';
}

async function download(url, dest) {
  const res = await fetch(url, { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const type = res.headers.get('content-type') ?? '';
  // Reject error pages served with 200, without demanding an exact image type.
  if (/^text\/|json/.test(type)) throw new Error(`not an image (${type})`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function main() {
  const url = feedUrl();
  if (!url) {
    log('BEHOLD_FEED_URL is not set, skipping. The homepage Instagram section will not render.');
    resetImageDir();
    writeData([]);
    return;
  }

  const res = await fetch(url, {
    signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`feed returned HTTP ${res.status}`);
  const feed = await res.json();

  // Field names below are from the plan, not yet checked against a live
  // response: posts[], id, permalink, prunedCaption/caption, sizes.medium.
  const raw = Array.isArray(feed?.posts) ? feed.posts : null;
  if (!raw) throw new Error('feed has no posts array');

  const candidates = raw
    .filter((p) => p && !EXCLUDED_POST_IDS.has(String(p.id)))
    .map((p) => ({
      id: String(p.id ?? '').replace(/[^A-Za-z0-9_-]/g, ''),
      href: p.permalink,
      size: p.sizes?.medium,
      caption: p.prunedCaption ?? p.caption,
    }))
    .filter((p) => p.id && typeof p.href === 'string' && p.href.startsWith('https://') && p.size?.mediaUrl)
    .slice(0, MAX_POSTS);

  if (raw.length && !candidates.length) {
    throw new Error('feed has posts, but none have id, permalink and sizes.medium.mediaUrl. Check the field names.');
  }

  resetImageDir();

  // One bad image drops that post, not the whole strip.
  const results = await Promise.allSettled(
    candidates.map(async (p) => {
      await download(p.size.mediaUrl, join(IMG_DIR, `${p.id}.webp`));
      return {
        id: p.id,
        href: p.href,
        src: `/instagram/${p.id}.webp`,
        width: Number(p.size.width) || null,
        height: Number(p.size.height) || null,
        alt: altFrom(p.caption),
      };
    })
  );

  const posts = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') posts.push(r.value);
    else log(`skipped post ${candidates[i].id}: ${r.reason?.message ?? r.reason}`);
  });

  writeData(posts);
  log(`wrote ${posts.length} post(s) of ${raw.length} in the feed.`);
}

try {
  await main();
} catch (err) {
  log(`failed, the homepage Instagram section will not render: ${err?.message ?? err}`);
  try {
    resetImageDir();
    writeData([]);
  } catch (writeErr) {
    log(`could not write the empty fallback either: ${writeErr?.message ?? writeErr}`);
  }
}
process.exit(0);
