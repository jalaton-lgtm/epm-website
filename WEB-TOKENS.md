# Web Tokens Reference

Companion to `design_handoff_epm_brand/brand-tokens.jsx` (your source of
truth for social cards and slides). That file defines `social` and `slide`
surfaces only — nothing for a website. This doc covers the third surface:
**web**. Source of implementation: `src/styles/tokens.css`.

Two categories below, kept strictly separate:
- **PORTED** — taken 1:1 from your brand file. Not up for debate here;
  restated for reference.
- **NEW** — invented for this website. Nobody has reviewed these numbers
  but me. Flag anything that's wrong.

A third source shaped the *application* of these tokens (not the values
themselves): the reference mockup `Esa-Pekka_Mattila__standalone_.html`.
Where it conflicted with your brand file, the brand file won — see
"Reconciliation" at the end.

---

## PORTED (from brand-tokens.jsx)

### Colors

| Token | Value | Source |
|---|---|---|
| `--accent-competition` | `#C8392E` | Crimson |
| `--accent-raceday` | `#E25E1F` | Orange |
| `--accent-training` | `#3F5468` | Steel |
| `--accent-commercial` | `#2E5D3A` | Forest |
| `--accent-personal` | `#2A2A2A` | Graphite |

Dark surface tokens (`BRAND.modes.dark`):

| Token | Value |
|---|---|
| `--bg` | `#0E0D0C` |
| `--surface` | `#161413` |
| `--ink` | `#F4F1EC` |
| `--muted` | `#8E8A85` |

### Type families (Technical pairing)

| Role | Family |
|---|---|
| Display | Space Grotesk |
| Sans / body | Inter Tight |
| Mono | JetBrains Mono |

### Category → color mapping

Applied to blog posts via the `category` field: Competition, Race Day,
Training, Commercial, Personal → their respective accent color above.
Photo-tagged posts keep their category color (your call, confirmed) rather
than going neutral.

**Contrast fix applied (new, not in either source file):** three of the
five category colors fail WCAG contrast when used the way this website
uses them — verified by actual calculation, not assumption:

| Category | Problem | Fix |
|---|---|---|
| Race Day (orange) | White text on chip background measures 3.59:1 — fails the 4.5:1 minimum for small text | Chip uses dark text (`var(--bg)`) instead of white for this category only |
| Training (steel) | Dot vs page background measures 2.48:1 — fails the 3:1 minimum for meaningful UI graphics | Dot uses a lightened variant, `--accent-training-ondark: #657686` |
| Commercial (forest) | Dot vs page background measures 2.54:1 — same failure | Dot uses `--accent-commercial-ondark: #587D61` |

Personal (graphite) already had this treatment (`--accent-personal-ondark`)
from the first pass. Chip *backgrounds* keep the original, true brand hex
in all cases — only the small dot indicator and the Race Day chip's text
color are adjusted. `src/lib/categories.ts` encodes this per category
(`dotVar`, `chipTextOnColor`) rather than leaving it to be worked out ad
hoc per component.

---

## NEW — invented for web, needs your review

None of this exists in `brand-tokens.jsx`, which only speaks in fixed
card/slide pixel sizes (e.g. slide `hero: 240px`). A website is read
continuously at arbitrary widths, so it needs its own logic — same
"pick by role" philosophy as your source file's `scale`, different
mechanism (`clamp()` instead of a fixed array + JS measurement).

### Type scale

| Token | Value | Used for |
|---|---|---|
| `--text-hero` | `clamp(3.5rem, 12vw, 10.5rem)` | Home page name in hero |
| `--text-h1` | `clamp(2.125rem, 5.5vw, 4.25rem)` | Page titles (Profile, Blog) |
| `--text-h2` | `clamp(1.5rem, 3vw, 2.25rem)` | Section headings |
| `--text-h3` | `1.375rem` (fixed) | Post card / post-page titles |
| `--text-stat` | `clamp(1.625rem, 3vw, 2.5rem)` | Stat block numbers (PB, etc.) |
| `--text-lead` | `clamp(1.3125rem, 2.2vw, 1.875rem)` | Bio lead line |
| `--text-body` | `1.0625rem` (fixed) | Running body copy |
| `--text-small` | `0.9375rem` (fixed) | Captions |
| `--text-micro` | `0.75rem` (fixed) | Mono chrome: dates, labels, kickers |

Reasoning for the specific numbers: hero scales aggressively with
viewport width (`12vw`) because at mobile widths a fixed large size would
either overflow or force awkward wrapping on "Esa-Pekka" — the clamp
floor (3.5rem) keeps it legible on a phone, the ceiling (10.5rem) caps it
so it doesn't become absurd on an ultrawide monitor. Body/small/micro are
fixed rather than fluid because paragraph text reading comfort depends on
an absolute size, not viewport width — this matches ordinary web
typography practice, not something borrowed from either source file.

**I have no strong evidence these exact numbers are optimal** — they're a
reasonable first pass, tuned by eye against the actual page layouts, not
derived from a formula. Worth you actually looking at the built site
before treating them as final.

### Spacing scale

| Token | Value |
|---|---|
| `--space-1` | `0.5rem` |
| `--space-2` | `1rem` |
| `--space-3` | `1.5rem` |
| `--space-4` | `2.5rem` |
| `--space-5` | `4rem` |
| `--space-6` | `clamp(4.5rem, 12vh, 9.375rem)` (section vertical padding) |

A plain doubling-ish scale, not tied to any brand rule — just consistency
so spacing choices across pages don't drift into arbitrary values.

### Layout

| Token | Value | Note |
|---|---|---|
| `--maxw` | `1200px` | Content width ceiling — taken from the mockup |
| `--gutter` | `clamp(20px, 5vw, 64px)` | Side padding — also from the mockup |

### Line height

| Token | Value | Used for |
|---|---|---|
| `--line-body` | `1.5` | Body copy |
| `--line-tight` | `0.95` | Display headings (Space Grotesk reads fine tight; this would be too tight for body text) |

---

## Reconciliation with the reference mockup

The mockup (`Esa-Pekka_Mattila__standalone_.html`) supplied layout and
interaction ideas, not tokens — but it did make three token-level claims
that conflicted with your brand file. Brand file won in all three:

1. **Typography** — mockup used Archivo (Modern Sans pairing). Kept
   Space Grotesk (Technical) since that's what you confirmed earlier.
2. **Mode** — mockup was dark-only, no light variant. This actually
   isn't a conflict — your brand file's light mode was never applied
   here either; both agree on fixed dark for this deliverable.
3. **Chrome accent** — mockup used one fixed accent color (`#E25E1F`,
   Orange) for nav/hero/CTAs, not the 5-category system. Adopted this:
   `--accent` = Race Day orange, reserving the full 5-color system for
   category-specific badges only (blog post tags). This wasn't in either
   source document as an explicit rule — it's my synthesis, flagged here
   so you can override it if you'd rather the general chrome used a
   different one of the five, or a neutral.

---

## What this doc deliberately does NOT include

No character budgets (your source file's `budgets` table) — those exist
to prevent a fixed-size card from overflowing. A web page reflows freely,
so there's nothing to budget against. No `FitText`-style auto-fit
JavaScript — `clamp()` does that job at the CSS level for continuous
layouts.
