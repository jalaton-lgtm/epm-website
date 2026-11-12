# Plan: Instagram strip on esapekkamattila.com

Repo: `jalaton-lgtm/epm-website` (Astro 4.16, Cloudflare Workers with static assets, deployed by Workers Builds on push to the production branch).

## Goal

Add a small Instagram section to the homepage (EN and FI): the latest posts from @mattilae shown as images that link out to Instagram. It refreshes once a day without anyone committing anything.

## Decisions already made

- **Source:** a Behold JSON feed, free plan. The plan allows 6 posts at most, and Behold updates the feed once a day.
- **Fetch at build time, not in the browser.** The site ships no JavaScript outside /kitchen. That stays true.
- **Self-host the images.** They are downloaded during the build and served from esapekkamattila.com. Visitors' browsers make no requests to Behold or Instagram. This keeps the launch report's privacy position valid: no third parties, nothing to disclose.
- **Images only.** No captions and no post dates are shown. Captions would be in one language on a bilingual site, and dates would make quiet spells look like inactivity.
- **Placement:** homepage only, between Blog and Partners. The section becomes 03 and Partners becomes 04. Do not add it to /profile, /press or /partners in this round.
- **Failure mode:** if the feed can't be fetched, the section doesn't render and the build still succeeds. This is the same principle as `scripts/check-dates.mjs`, which is kept out of the build so it can never take production down.

## Step 0: EP does these by hand before any code

1. **Behold account.** Check whether the free plan on your account allows a second feed. Behold's two pricing pages disagree: behold.so/pricing says "1 source, 1 feed", while the pricing page on auth.behold.so says "unlimited sources and feeds". If Next Lap's feed is on your account and only one is allowed, give @mattilae its own Behold account. Next Lap's feed probably belongs on the client's account anyway, before handover.
2. **Create the JSON feed** for @mattilae with 6 posts. Leave any domain whitelist setting empty or off. A build-time request comes from Cloudflare's build machine, not a browser on your domain, so a whitelist could block it. That's untested: if the fetch fails during the build, check this setting first.
3. **Add the feed URL as a build variable** in Cloudflare: Workers & Pages → epm-website → Settings → Builds → build variables → `BEHOLD_FEED_URL`. The repo is public, so the URL must never be committed. For local work, put the same line in `.env`, which is already in `.gitignore`.
4. **Confirm the build command** in the same Builds settings. It must be `npm run build`. The plan relies on npm's `prebuild` hook, which runs only through `npm run build`, not `npx astro build`.

## Step 1: Fetch script (`scripts/fetch-instagram.mjs`)

Port the build-time fetch from the Next Lap project where it fits, and write it fresh where it doesn't.

- Read `process.env.BEHOLD_FEED_URL`. If it's missing, log one line and exit 0.
- GET the feed with a timeout of about 10 s. The response has a `posts` array. Each post has a `sizes` object with `small`, `medium`, `large` and `full`, and each size has `mediaUrl`, `width` and `height`. The `sizes` images are Behold-optimised webp. Use them, not the raw `mediaUrl`. For carousels and videos, the post-level `sizes` still holds a cover image.
- Before writing the mapping, inspect one real response and confirm the field names for the post link (`permalink`) and the caption (`prunedCaption`). Check also whether the pinned post from 27 Aug 2024 comes through. If it does, exclude it (see Step 5).
- For each post, download `sizes.medium` into `public/instagram/<post-id>.<ext>`, with the extension taken from the file's bytes. (Checked 11.11.2026: Behold serves these as JPEG, not webp.) Write `src/data/instagram.json` as an array of `{ id, href, src, width, height, alt }`:
  - `href` is the Instagram permalink.
  - `src` is `/instagram/<id>.webp`.
  - `alt` is the caption trimmed to about 120 characters at a word boundary. If there's no caption, use `Instagram post by Esa-Pekka Mattila`.
- Delete stale files in `public/instagram/` before writing, so old images don't pile up.
- **Never exit non-zero.** On any error, log it, write an empty array to `src/data/instagram.json` and exit 0.
- Add `public/instagram/` and `src/data/instagram.json` to `.gitignore`. They are build output, not source.
- Add to `package.json`: `"prebuild": "node scripts/fetch-instagram.mjs"`. Also add a manual alias `"fetch:instagram": "node scripts/fetch-instagram.mjs"` for local runs.

## Step 2: Component (`src/components/InstagramStrip.astro`)

- Props: `lang: 'en' | 'fi'`. Follow the pattern of `CategoryBadge.astro`: labels are chosen in the component by `lang`, and no new i18n machinery is added.
- Read `src/data/instagram.json` with `node:fs` in the frontmatter, guarded by `existsSync`. Do not use `import`: a missing gitignored file would break the build.
- If there are no posts, render nothing. The section heading must not appear either, so the component renders the whole `<section>`, heading included.
- Markup follows the homepage pattern: `<section id="instagram-preview">`, `.wrap`, `.sec-head.blog-head.reveal` with `.idx-row`.
  - Index: `03`.
  - Heading: `Instagram` in both languages.
  - Right-side mono label: `@mattilae`.
- Grid of posts. Each tile is an `<a href={href} target="_blank" rel="noopener">` wrapping `PhotoSlot` with `aspect="4/5"`, `loading="lazy"`, `decoding="async"` and the `alt`. Instagram's profile grid uses 4:5 tiles.
- Layout: 6 columns from 860px up, and 3 columns below, which gives two rows of 3 on mobile. Use the same 860px breakpoint as `index.astro`. Tile hover can borrow the `.post:hover` border treatment.
- Below the grid, a `.more` link: `Follow @mattilae →` in EN and `Seuraa @mattilae →` in FI, linking to `https://instagram.com/mattilae`.
- Styles go in the component, using existing tokens from `tokens.css`. Add no new colours.

## Step 3: Wire into the homepage

- `src/pages/index.astro` and `src/pages/fi/index.astro`: insert `<InstagramStrip lang="en" />` (or `"fi"`) between the Blog and Partners sections.
- Renumber Partners from `03` to `04` on both pages when the strip renders, and keep `03` when it does not (EP's call, 11.11.2026). Both read `src/lib/instagram.ts`.
- Add a `border-top` for `#instagram-preview`, matching the other sections.
- Bump `pageUpdated['/']` in `src/lib/schema.ts`, because the new section changes what the page shows. Run `npm run check:dates` before committing. The daily feed refreshes are not copy changes and must not bump the date.

## Step 4: Daily rebuild

The site is static, so new posts appear only after a build. Behold refreshes once a day, so rebuild once a day.

1. **Deploy Hook** (EP, in the dashboard): Workers & Pages → epm-website → Settings → Builds → Deploy Hooks. Create a hook for the production branch and copy the URL. Treat the URL as a secret: anyone who has it can trigger builds.
2. **Scheduler: a tiny separate Worker with a Cron Trigger**, for example `epm-rebuild-cron`, scheduled once a day (for example `0 4 * * *` UTC). It POSTs to the hook URL, which is stored as a Worker secret (`DEPLOY_HOOK_URL`). Keep it in its own folder or repo. It must not become part of the site's build.
   - Why not GitHub Actions: in a public repo, GitHub disables scheduled workflows after 60 days with no repository activity. The site can easily go that long without a commit.

## Step 5: Pinned post (only if Step 1 shows it)

If the pinned 2024 post appears in the feed, first check whether Behold's dashboard can hide individual posts. If it can't, add a constant `EXCLUDED_POST_IDS` in the fetch script and filter on it. Excluding it leaves 5 tiles. Choose the layout to suit: either accept 5 or show 5 in the grid. Leave this choice to EP, and default to showing whatever count comes through.

## Acceptance checks

1. `npm run build` with `BEHOLD_FEED_URL` set: the section renders on `/` and `/fi/` with up to 6 tiles, and each tile links to the right post.
2. `npm run build` with the variable unset, and with a deliberately wrong URL: the build succeeds and neither homepage contains the section or its heading. Partners shows `03`.
3. `grep -r "behold.pictures\|cdninstagram\|feeds.behold" dist/` returns nothing. No third-party URL ships to visitors.
4. The built homepage has no new `<script>` tags.
5. `npm run check:dates` passes after the `pageUpdated` bump.
6. After deploy, fetch the live HTML of esapekkamattila.com and esapekkamattila.com/fi/ and confirm the section is there. The launch report caught a shipped placeholder exactly this way.
7. The day after setup, the Deploy Hooks list in the dashboard shows the hook was triggered, and a build with trigger source `deploy_hook` appears.

## Out of scope for this round

- The /partners page strip. Revisit after a few weeks of seeing the homepage version.
- Captions, dates, likes and follower counts.
- Roadmap item 8 (curated photography section). This strip doesn't replace it.
- Removing the duplicate `@mattilae` mentions in the hero meta and the stat grid. EP's call. The strip makes the stat-grid "Handle" the fourth mention on the page.
