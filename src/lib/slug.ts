// Content collection entries under src/content/blog/en/... and
// src/content/blog/fi/... get slugs like "en/my-post" / "fi/my-post"
// (Astro includes subfolder names in the slug). We store posts in
// per-language folders for editorial clarity in the CMS, but don't want
// that folder name leaking into the URL — URLs are already language-
// scoped via /blog vs /fi/blog. Strip the first path segment.
export function cleanSlug(slug: string): string {
  const parts = slug.split('/');
  return parts.length > 1 ? parts.slice(1).join('/') : slug;
}
