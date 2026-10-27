# GitHub Pages deployment

The public pages are served from the repository root. Keep the `images/` directory beside `index.html`, using exactly the same filenames and case as the page references. Administration navigation and email callbacks must remain relative to this project path.

## AI service

GitHub Pages serves static assets; it does not execute the AI server route. This repository currently has no deployed AI backend. The UI reports that condition explicitly instead of parsing a GitHub 404 page as JSON.

To connect a separately deployed authenticated backend, set the public `IDEAFORGE_AI.endpoint` URL in `supabase-config.js`. Use HTTPS. The backend must validate the Supabase session, enforce usage limits, keep provider keys in server-side secrets, and allow the site's origin through CORS. Never add provider keys to this repository or browser code.

For account verification redirects, allow `https://jjgrm.github.io/Ideaforge-AI/` in the Supabase project's redirect URL settings when email confirmation is enabled. This does not require disabling account authentication.

## Checks

Run `tsc --project tsconfig.json`, `node --test tests/*.test.cjs`, and `python tests/check-pages-assets.py` before publishing. Live signup, administrator login and real model generation need separate authenticated checks; mocked tests do not prove those services are operational.
