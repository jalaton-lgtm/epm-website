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
  ],
};

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
