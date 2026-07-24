import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://esapekkamattila.com',
  integrations: [
    // i18n makes the sitemap emit <xhtml:link rel="alternate" hreflang> for
    // each page's language twin. EN is the default locale (served at the
    // root); FI lives under /fi/. Pages are paired by matching path once the
    // /fi prefix is stripped, so every mirrored page (/, /profile, /press …)
    // gets its alternate. Blog posts have language-divergent slugs that don't
    // pair structurally — those alternates are still carried by the per-page
    // <head> links in BaseLayout, which reads postTwins.
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', fi: 'fi' },
      },
    }),
  ],
});
