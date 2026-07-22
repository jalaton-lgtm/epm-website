// The language pairs behind the nav's language toggle. These used to live in
// Nav.astro's frontmatter, but Astro component frontmatter is not importable,
// so anything else that needs the maps — hreflang alternates, most obviously —
// could not reach them. They live in a module so there is exactly one list.

export type Lang = 'en' | 'fi';

/** The other of the two languages. */
export function otherLangOf(lang: Lang): Lang {
  return lang === 'en' ? 'fi' : 'en';
}

// Every top-level page has a twin at the mirrored path, so the toggle maps
// between them by lookup rather than by rewriting the URL and hoping the
// target exists.
export const pageTwins: Record<string, Record<Lang, string>> = {
  '/': { en: '/', fi: '/fi/' },
  '/profile': { en: '/profile', fi: '/fi/profile' },
  '/blog': { en: '/blog', fi: '/fi/blog' },
  '/partners': { en: '/partners', fi: '/fi/partners' },
};

// Blog posts only have a twin once they've actually been translated, so
// they're listed explicitly — EN slug on the left, FI slug on the right.
// Add a line when a translation goes up. Posts missing from the map fall
// back to the other language's blog index rather than 404ing.
export const postTwins: Record<string, string> = {
  'where-i-am': 'missa-mennaan',
};

/** Language-agnostic form of a path: /fi/profile -> /profile. */
export function canonicalPathOf(pathname: string, lang: Lang): string {
  const path = pathname.replace(/\/+$/, '') || '/';
  return (lang === 'fi' ? path.replace(/^\/fi(?=\/|$)/, '') : path) || '/';
}

/** The given page in the other language, or the nearest page that exists. */
export function twinOf(canonicalPath: string, lang: Lang): string {
  const otherLang = otherLangOf(lang);
  const post = canonicalPath.match(/^\/blog\/(.+)$/);
  if (!post) {
    // Unmapped pages — the 404 page included — go to the other home page.
    return (pageTwins[canonicalPath] ?? pageTwins['/'])[otherLang];
  }
  const slug = post[1];
  const twinSlug = lang === 'en'
    ? postTwins[slug]
    : Object.keys(postTwins).find((enSlug) => postTwins[enSlug] === slug);
  // An untranslated post falls back to the blog index, which exists in
  // both languages.
  return twinSlug
    ? `${pageTwins['/blog'][otherLang]}/${twinSlug}`
    : pageTwins['/blog'][otherLang];
}
