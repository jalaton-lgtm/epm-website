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
  // The FI page is at /fi/press, not /fi/media, keeping the path convention
  // English on the Finnish side as /fi/partners already does. Only the
  // visible label is Finnish.
  '/press': { en: '/press', fi: '/fi/press' },
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

/**
 * hreflang alternates: the path of this page in each language.
 *
 * Returns null when there is no honest set to advertise — an untranslated
 * blog post, or an unmapped page such as the 404 — because hreflang must
 * point at a genuine equivalent, not a fallback. `twinOf` deliberately falls
 * back to the blog index for navigation; that is the right answer for a
 * language toggle and the wrong one for an alternate link, so this does not
 * reuse it.
 */
export function localeAlternates(pathname: string, lang: Lang): Record<Lang, string> | null {
  const canonical = canonicalPathOf(pathname, lang);

  const post = canonical.match(/^\/blog\/(.+)$/);
  if (post) {
    const currentSlug = post[1];
    // Resolve to the EN slug, which is the key side of postTwins.
    const enSlug = lang === 'en'
      ? currentSlug
      : Object.keys(postTwins).find((s) => postTwins[s] === currentSlug);
    const fiSlug = enSlug ? postTwins[enSlug] : undefined;
    if (!enSlug || !fiSlug) return null; // untranslated — no honest alternate
    return {
      en: `${pageTwins['/blog'].en}/${enSlug}`,
      fi: `${pageTwins['/blog'].fi}/${fiSlug}`,
    };
  }

  const twins = pageTwins[canonical];
  return twins ? { en: twins.en, fi: twins.fi } : null;
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
