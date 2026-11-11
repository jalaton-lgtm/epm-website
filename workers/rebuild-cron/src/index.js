// Once a day, ask Cloudflare to rebuild esapekkamattila.com so the homepage
// Instagram strip picks up new posts. It POSTs to the site's Deploy Hook,
// whose URL is the Worker secret DEPLOY_HOOK_URL. Never commit that URL:
// anyone who has it can trigger builds.

export default {
  async scheduled(controller, env, ctx) {
    if (!env.DEPLOY_HOOK_URL) {
      throw new Error('DEPLOY_HOOK_URL secret is not set');
    }
    const res = await fetch(env.DEPLOY_HOOK_URL, { method: 'POST' });
    if (!res.ok) {
      // Throwing marks the cron run as failed in the dashboard.
      throw new Error(`Deploy Hook returned HTTP ${res.status}: ${await res.text()}`);
    }
    console.log(`Deploy Hook triggered (${controller.cron})`);
  },
};
