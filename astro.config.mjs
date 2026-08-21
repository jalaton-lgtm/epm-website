import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://esapekkamattila.com',
  integrations: [
    // Preact powers exactly one thing: the meal planner island at /kitchen.
    // Every other page on this site still ships zero JavaScript, and the
    // ~4 kB runtime only loads on the page that needs it. React proper would
    // have cost roughly ten times that for the same JSX.
    preact(),

    // i18n makes the sitemap emit <xhtml:link rel="alternate" hreflang> for
    // each page's language twin. EN is the default locale (served at the
    // root); FI lives under /fi/. Pages are paired by matching path once the
    // /fi prefix is stripped, so every mirrored page (/, /profile, /press …)
    // gets its alternate. Blog posts have language-divergent slugs that don't
    // pair structurally — those alternates are still carried by the per-page
    // <head> links in BaseLayout, which reads postTwins.
    sitemap({
      // Pages that carry <meta name="robots" content="noindex"> must not
      // appear here. Listing a URL in the sitemap says "index this"; the
      // meta tag says the opposite, and Search Console reports the pair as
      // an error rather than picking a winner. /kitchen is the meal planner
      // — a tool that runs in the browser, shareable by link, but not part
      // of what the site is about.
      filter: (page) => !new URL(page).pathname.startsWith('/kitchen'),
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', fi: 'fi' },
      },
    }),
  ],
});
