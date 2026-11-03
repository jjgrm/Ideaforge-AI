// Run explicitly only. Key arrives over stdin, never an argument or log.
import { handleAI } from '../worker/openai.mjs';
let key = ''; for await (const chunk of process.stdin) key += chunk.toString(); key = key.trim();
if (!key.startsWith('sk-')) throw Error('Missing credential');
const cases = [
  ['ideas', { specialty: 'programming', subspecialty: '061301', skills: 'HTML and JavaScript', goal: 'project', duration: { count: 2, unit: 'weeks' } }],
  ['review', { specialty: 'programming', code: 'function add(a,b){ return a-b; }', request: 'Fix the addition function. Keep the report concise.' }],
  ['plan', { specialty: 'programming', project: { title: 'Simple personal task list', description: 'An offline educational task list using HTML and JavaScript.' }, duration: { count: 2, unit: 'weeks' } }]
];
const results = [];
for (const [kind, payload] of cases) {
  let usage; const started = Date.now();
  const fetcher = async (url, init) => {
    if (url.includes('/auth/')) return Response.json({ id: 'provider-fixture-only' });
    if (url.includes('if_ai_idea_context')) return Response.json({ titles: [] });
    if (url.includes('if_ai_claim_ideas')) return Response.json({ accepted: true });
    const response = await fetch(url, init);
    if (response.ok) usage = (await response.clone().json()).usage;
    return response;
  };
  const env = { OPENAI_API_KEY: key, SUPABASE_URL: 'https://fixture.invalid', SUPABASE_PUBLISHABLE_KEY: 'fixture',
    AI_LIMITS: { idFromName: x => x, get: () => ({ fetch: async () => Response.json({ allowed: true }) }) } };
  const response = await handleAI(new Request('https://ideaforgeai.xyz/api/ai', { method: 'POST',
    headers: { 'content-type': 'application/json', authorization: 'Bearer fixture', origin: 'https://ideaforgeai.xyz' },
    body: JSON.stringify({ kind, payload }) }), env, fetcher);
  const data = await response.json();
  results.push({ kind, success: response.ok, status: response.status, error: data.error, seconds: Math.round((Date.now() - started) / 100) / 10,
    inputTokens: usage?.input_tokens, outputTokens: usage?.output_tokens, resultItems: data.data?.ideas?.length ?? data.data?.phases?.length,
    correctedAddition: kind === 'review' && response.ok ? /a\s*\+\s*b/.test(data.data.correctedCode) : undefined });
}
key = '';
console.log(JSON.stringify({ providerFixturesOnly: true, liveSupabaseAuthTested: false, results }));
if (results.some(x => !x.success)) process.exitCode = 1;
