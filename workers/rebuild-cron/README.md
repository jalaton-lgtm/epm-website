# epm-rebuild-cron

A small Cloudflare Worker that rebuilds esapekkamattila.com once a day, so the
homepage Instagram strip shows new posts without anyone committing anything.

It is **not** part of the site. The site's build (`npm run build` at the repo
root) does not read this folder, and this Worker is deployed separately.

Why not a GitHub Action: the repo is public, and GitHub disables scheduled
workflows in a public repo after 60 days with no activity. The site can easily
go that long without a commit.

## Setup (once)

1. In the Cloudflare dashboard: Workers & Pages → epm-website → Settings →
   Builds → Deploy Hooks. Create a hook for the production branch and copy
   its URL. Treat it as a secret.
2. From this folder, deploy the Worker and store the hook URL as a secret:

   ```bash
   npx wrangler deploy
   ```

   ```bash
   npx wrangler secret put DEPLOY_HOOK_URL
   ```

   Paste the hook URL when prompted.
3. The day after, check that the Deploy Hooks list shows the hook was
   triggered and that a build with trigger source `deploy_hook` appears.

To test without waiting for the schedule, run `npx wrangler dev --test-scheduled`
here with `DEPLOY_HOOK_URL` in a local `.dev.vars` file, then open
`http://localhost:8787/__scheduled`. That triggers a real build.

## Changing the time

Edit `triggers.crons` in `wrangler.jsonc` (UTC) and deploy again.
