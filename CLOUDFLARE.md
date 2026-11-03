# IdeaForge: Cloudflare Workers + OpenAI

This deployment serves the existing frontend and a same-origin `/api/ai` endpoint. It does not migrate, delete or recreate Supabase accounts or projects. The public GitHub Pages copy remains unchanged in behavior: without a separately configured backend it cannot run AI.

## Cloudflare Git setup

- Repository: `jjgrm/Ideaforge-AI`, branch `main`, root `/`.
- Worker/project name: `ideaforge-ai` (matches `wrangler.jsonc`).
- Build command: `npm run build`.
- Deploy command: `npx wrangler deploy`.
- Preview/version command, if required: `npx wrangler versions upload`.
- The checked-in lock file pins the deployment tools. The build exposes only an explicit list of browser assets, not this repository's source or credential helpers.
- `wrangler.jsonc` provisions one SQLite Durable Object for persistent request limits. This storage type supports Workers Free, subject to its quotas.

## Required secret: never commit it

After creating the Worker, go to **Worker > Settings > Variables and Secrets > Add**:

- Type: **Secret**
- Name: `OPENAI_API_KEY`
- Value: paste your complete, active OpenAI secret key yourself.

Save and deploy the configuration. This key requires permission to create Responses. The public Supabase URL and publishable key are already in configuration; neither is an admin/service-role key. Do not add an OpenAI key as a plain build variable, to `supabase-config.js`, or to GitHub files. Old Gemini/NVIDIA keys are never used by this Worker.

## Connect the domain after a successful Worker deployment

1. Wait for the domain zone to become Active in Cloudflare (nameservers already assigned: `love.ns.cloudflare.com`, `mack.ns.cloudflare.com`).
2. In Worker > Settings > Domains & Routes, add `ideaforgeai.xyz` as a Custom Domain. Let Cloudflare manage the correct record; do not invent an A record/IP.
3. If using `www`, explicitly add it or configure a redirect to the apex domain. Test both.
4. Add the new HTTPS origin and its callback URL to Supabase Auth allowed redirects; update the Auth Site URL for the new primary domain. Keep the existing GitHub Pages redirect during migration. This requires an account owner in the Supabase dashboard.
5. Test signup/login and the three AI features from the deployed URL. Provider connectivity tested locally does not prove deployed secrets, Supabase redirect settings, domain routing, or browser sessions.

## Budget and privacy

- Server revalidates the Supabase bearer session before any OpenAI request; user IDs never come from the client payload.
- OpenAI `store:false`, strict JSON schemas, no provider-key logging, no raw provider errors returned to browsers.
- Default request admission caps: 6/minute and 100/day per authenticated account, 500/day site-wide, reset at midnight UTC. They are persisted across isolates/redeploys. Configure through `AI_USER_RPM`, `AI_USER_DAILY`, `AI_SITE_DAILY`.
- Caps count admitted attempts, including provider failures. Idea deduplication can use at most two generations per admitted request. Long file reviews consume one request per chunk.
- Only `gpt-6-luna` is allowed. Response limits: 2,500 output tokens for ideas, 7,000 for plans, 14,000 for reviews. No automatic paid-model fallback or automatic retry after provider errors.
- These are request guards, not an exact dollar billing cap, provider SLA, or protection against all distributed abuse. Monitor OpenAI billing and Cloudflare usage independently. Paid costs and provider quotas still apply.
- Robots rules exclude admin, activation and API paths; robots is not access control. Supabase authorization still controls stored data. Add this domain to Google Search Console after it works; indexing is not guaranteed.

## Validation

Run `npm ci`, `npm run check`, `npm test`, `npm run build`, and `npx wrangler deploy --dry-run` before deployment. Automated fixtures do not prove model quality or a live browser login. Review the generated test report for what was actually run.
