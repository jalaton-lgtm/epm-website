// Current partners. One file so a name or a link cannot drift between the
// English and Finnish pages — the same discipline as telemetry.ts.
//
// `name` is the exact brand form each partner confirmed (rule 29). Do not
// abbreviate it, restyle its capitalisation, or translate it: both names stay
// Finnish on the English page because that is what they are called.
//
// Naming permission for both was confirmed by EP on 3.8.2026.
//
// `contribution` is still NOT rendered. It is recorded here so the commercial
// nature of each relationship lives next to the name rather than only in the
// plan; the page's own wording is EP's, not this field's.
//
// HARD CONSTRAINT, do not relax without EP: no health claims. On 4.8.2026 EP
// relaxed the earlier name-and-link-only rule himself and wrote the line each
// partner now carries, in the first person: what he uses them for, never what
// a product does. Keep it that way. Supplement and cosmetic claim wording is
// regulated, so do not add an effect, an ingredient, a condition or a benefit
// to either line — inventing our own version of that on an athlete's site is
// exactly the way to get it wrong.
//
// Also decided: no logo wall. Plain text, no images. A logo grid would
// contradict the page's own "not a shirt full of logos" argument and would
// pull partner branding into Appendix G's rights discipline for no gain.

export interface Partner {
  name: string;
  href: string;
  contribution: string;
}

export const currentPartners = {
  apteekki: {
    name: 'Apteekki-tuotesarja',
    href: 'https://www.apteekki.fi/apteekki-tuotesarja.html',
    contribution: 'products and funding',
  },
  linjaaho: {
    name: 'Osteopatiaklinikka Jere Linja-aho',
    href: 'https://www.jerelinjaaho.com/',
    contribution: 'treatment in kind',
  },
} satisfies Record<string, Partner>;
