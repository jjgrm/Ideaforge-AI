# Cloudflare/OpenAI readiness — 3 November 2026

## Passed before publication

- TypeScript no-emit check and compilation. Added missing DOM.Iterable compiler library.
- 65 automated tests passed: the existing 50 frontend/admin/file-review cases plus 15 new Cloudflare/OpenAI cases.
- Official Wrangler 4.157.0 `deploy --dry-run` successfully built a roughly 110 KiB Worker bundle and validated ASSETS, AILimits SQLite migration, and nonsecret configuration.
- Local workerd/Miniflare runtime served `/`, `/index.html`, `/admin.html`, `/activate.html`, scripts, logo, robots and sitemap with HTTP 200. Source, environment/config paths returned 404; unauthenticated POST `/api/ai` returned 401.
- Fixed a runtime-specific HTML redirect issue by disabling automatic `.html` normalization and mapping `/` explicitly to index.html. Existing admin/activation links remain valid.
- Static-resource checker validated 27 local references, labels and IDs.
- Real OpenAI Responses tests using the owner's locally encrypted key, synthetic content, strict schemas, `store:false`, no thinking:
  - Ideas: 3 ideas, completed, ~9 seconds; 533 input / 679 output tokens.
  - Review: completed, corrected the deliberately wrong subtraction to addition, ~4 seconds; 470 input / 139 output tokens.
  - Plan: 5 phases, completed, ~18.3 seconds; 706 input / 1471 output tokens.
- These live provider tests used fixture identity/history/quota adapters; they did not impersonate a real Supabase session or write project data.
- Automated cases verify revoked sessions, cross-origin requests, quota persistence/serialization, JSON schema enforcement, malformed/partial/refused replies, duplicate-idea reservation failures, and sanitized billing/permission errors. No secret was added to code or public assets.

## Still required after deployment

1. Deploy from the updated GitHub head in Cloudflare.
2. Add OPENAI_API_KEY as a Worker secret (the local encrypted key is not automatically installed on Cloudflare).
3. Attach the active custom domain and verify TLS/DNS.
4. Update Supabase allowed redirects and primary Site URL for the new HTTPS domain; retain the previous GitHub Pages callback during migration.
5. Verify actual browser signup/login/admin permissions, saved projects/reports and all AI features from the deployed URL, with the owner's account.

Passing local tests does not guarantee zero defects, production availability, universal model correctness, Google indexing, or zero spend. Request caps do not equal an exact billing cap. No live user data or accounts were deleted or migrated.
