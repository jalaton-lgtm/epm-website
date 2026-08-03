// Current partners. One file so a name or a link cannot drift between the
// English and Finnish pages — the same discipline as telemetry.ts.
//
// `name` is the exact brand form each partner confirmed (rule 29). Do not
// abbreviate it, restyle its capitalisation, or translate it: both names stay
// Finnish on the English page because that is what they are called.
//
// Naming permission for both was confirmed by EP on 3.8.2026.
//
// `contribution` is deliberately NOT rendered. It is recorded here so the
// nature of each relationship lives next to the name rather than only in the
// plan, but the page names and links the partners and says nothing more —
// see the constraint below.
//
// HARD CONSTRAINT, do not relax without EP: no health claims. Name and link
// only. Do not describe what any Apteekki product does or is for. Supplement
// and cosmetic claim wording is regulated, and inventing our own version of
// it on an athlete's site is exactly the way to get it wrong.
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
