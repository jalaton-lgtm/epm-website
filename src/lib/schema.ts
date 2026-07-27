// JSON-LD structured data.
//
// The Person mirrors Appendix C of the action plan — keep the two in step if
// either changes. The @id lets every page that emits the Person (home and
// profile, both languages) refer to one entity rather than declaring four
// separate people, and lets each BlogPosting name its author by reference.
//
// The Person image is portrait.jpg, EP's own photo and the one image on the
// site with unambiguous rights (Appendix G). That is deliberate, matching the
// note in Appendix C.

import type { Lang } from './i18n';

export const PERSON_ID = 'https://esapekkamattila.com/#person';

export const person = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Esa-Pekka Mattila',
  url: 'https://esapekkamattila.com/',
  image: 'https://esapekkamattila.com/images/portrait.jpg',
  birthDate: '1989-03-07',
  nationality: 'FI',
  affiliation: [{ '@type': 'SportsTeam', name: 'Espoon Tapiot' }],
  sameAs: [
    'https://instagram.com/mattilae',
    'https://x.com/epmattila',
    'https://fi.linkedin.com/in/epmattila',
    'https://www.paralympic.org/esa-pekka-mattila',
    'https://www.facebook.com/EPMattila',
    'https://www.olympiakomitea.fi/en/about-us/contact-information/esa-pekka-mattila/',
    // Finnish Wikipedia. There is no English article — the English-language
    // searches that turned up "Wikipedia" were the round-by-round articles
    // about the events, not about EP.
    'https://fi.wikipedia.org/wiki/Esa-Pekka_Mattila',
  ],
};

// When each info page's CONTENT last changed — not when the site last
// deployed. Hand-maintained on purpose: a build timestamp would tell Google
// the page changed every time anything shipped, which is false, and a date
// that is visibly automatic gets discounted anyway. Same idea as
// telemetry.ts — one file to edit, so the value cannot drift.
//
// Bump an entry when you change what the page SAYS. Not for CSS, not for a
// dependency bump. Keyed by language-agnostic path (canonicalPathOf), so an
// EN page and its FI twin share a line — which is correct, because rule 10
// means they change together anyway.
export const pageUpdated: Record<string, string> = {
  '/': '2026-07-24',
  '/profile': '2026-07-27',
  '/partners': '2026-07-24',
  '/press': '2026-07-27',
};

export interface WebPageInput {
  url: string;
  name: string;
  lang: Lang;
  dateModified: string;
}

/**
 * A WebPage carrying dateModified, for the info pages.
 *
 * Blog posts do not use this — they carry a visible date and a BlogPosting
 * with datePublished, which is the honest signal for a dated piece of
 * writing. This exists for the pages that are maintained rather than
 * published, where a visible stamp would read as "possibly out of date"
 * (the press kit especially) but machine-readable freshness still helps.
 */
export function webPage(input: WebPageInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    url: input.url,
    name: input.name,
    inLanguage: input.lang === 'fi' ? 'fi-FI' : 'en-US',
    dateModified: input.dateModified,
    about: { '@id': PERSON_ID },
  };
}

export interface BlogPostingInput {
  title: string;
  description?: string;
  datePublished: string;
  url: string;
  lang: Lang;
}

export function blogPosting(input: BlogPostingInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.title,
    ...(input.description ? { description: input.description } : {}),
    datePublished: input.datePublished,
    inLanguage: input.lang === 'fi' ? 'fi-FI' : 'en-US',
    author: { '@id': PERSON_ID },
    mainEntityOfPage: input.url,
    // image is intentionally omitted. post.data.image is Lightray's
    // photograph, and putting it on Google's rich-result surfaces is the same
    // distribution question as the per-post OG card — both are held until the
    // share-image decision is made, so they land on one switch, not two.
  };
}
