# EPM Website: Blog Guide and Roadmap

## Part 1: Publishing a blog post

Everything happens in the GitHub web interface. No local tools, no CMS login. A post is one Markdown file; committing it publishes it within about two minutes.

### Where posts live

English posts: `src/content/blog/en/`
Finnish posts: `src/content/blog/fi/`

The filename becomes the URL: `kobe-race-report.md` publishes at `/blog/kobe-race-report` (or `/fi/blog/...` for Finnish). Use lowercase, hyphens, no spaces, no ä/ö. The languages are independent: a post can exist in one language only, and slugs do not need to match across languages.

The three `draft: true` sample posts in these folders are reference copies. Leave them; they render nowhere.

### Steps

1. GitHub → repo → navigate to `src/content/blog/en/` (or `fi/`).
2. **Add file** → **Create new file**.
3. Name it: `your-slug.md`.
4. Paste the template below, fill it in, write the post under the second `---` in normal Markdown.
5. **Commit changes** directly to main.
6. Wait about two minutes for the auto-deploy, then verify at `esapekkamattila.com/blog/your-slug`. Hard refresh (Ctrl+Shift+R) if the blog index looks stale.

### Templates

English (`src/content/blog/en/`):

```
---
title: "Post title here"
date: 2026-07-15
lang: en
category: competition
photo: false
summary: "One or two sentences. This becomes the meta description and the share-card text, so write it for the reader who has not clicked yet."
draft: false
---

Post body in Markdown. **Bold**, *italic*, [links](https://example.com),
and ## subheadings all work.
```

Finnish (`src/content/blog/fi/`): identical, but `lang: fi`.

### Field rules

`date` is `YYYY-MM-DD`, no quotes. `category` must be exactly one of: `competition`, `raceday`, `training`, `commercial`, `personal` (these drive the colored badges). `summary` is optional but always worth writing: it is what search results and social shares display. `photo: true` marks the post as photography-led for the index layout. `draft: true` hides a post completely; write with `draft: true`, review on GitHub, flip to `false` to publish.

### Images in posts

1. Upload the image to `public/images/` (GitHub → that folder → Add file → Upload files). Upload files individually; the folder-drag upload silently drops nested folders.
2. Reference it in the post body: `![Alt text describing the image](/images/filename.jpg)`.
3. Compress before uploading: there is no build-time image optimization, so the file ships as-is. Roughly 2000px on the long edge and under 500 KB per image keeps pages fast.

### When a commit does not deploy

Check Workers & Pages → epm-website → Deployments. If the newest build's commit hash is older than your commit, the webhook missed it: make any trivial commit (blank line in README) to re-trigger. Never press Retry on an old entry; it deploys that old commit and looks like success.

## Part 2: Improvement roadmap

Ordered by value against effort, not by novelty. Nothing here is urgent; the site is complete as launched.

| # | Item | Value | Effort | When |
|---|------|-------|--------|------|
| 1 | First real posts | The category system, empty states, and photo flag were all built for content that does not exist yet | Editorial | Now |
| 2 | Delete old WordPress | Closes the security liability; archive already secured | 15 min | Any time |
| 3 | Search Console follow-up | Surfaces old URLs that 404; each becomes one `_redirects` line | 5 min/week | First month |
| 4 | RSS feed | Standard for a blog, expected by the audience that reads governance writing; @astrojs/rss is a small add | ~1 h | With first posts |
| 5 | Per-post share images | Schema gains an `image` field passed to BaseLayout (`type: article`); race photos become the share card instead of the default | ~2 h | When photo posts start |
| 6 | Results section | Structured championship results as data, rendered like the stats grid; fits the evidence-first identity better than prose | Half a day | Off-season |
| 7 | Press page | Third-person boilerplate plus downloadable portrait and action photo; ends re-answering media requests by email | ~2 h | Before next championship cycle |
| 8 | Photography section | The photo flag and X-E5 work suggest it; a gallery layout is a natural extension | Half a day | When there is a body of work |
| 9 | Decap CMS OAuth | Browser editing without GitHub; only worth it if posting frequency makes the GitHub flow feel slow | ~2 h | If it earns itself |
| 10 | hreflang pairing | Bilingual SEO done properly requires a translation-key field linking EN/FI posts | Half a day | Low priority |
| 11 | DNS cleanup | Remove dormant mail records (MX, SPF, DKIM, mail CNAME), ftp, and localhost rows | 10 min | After item 2 |
| 12 | Domain email | hello@esapekkamattila.com via an email forwarding service, if a non-gmail address ever becomes worth having | ~1 h | Only on need |

Two habits worth more than any feature. Write the summary field like it is the whole post, because for most readers on most platforms it is. And check Cloudflare Web Analytics monthly rather than daily: cookieless analytics answer "is anyone reading" and "which posts travel", which is all a personal site needs to know.
