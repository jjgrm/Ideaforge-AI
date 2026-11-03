import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import worker, { AILimits } from '../worker/index.mjs';
import { handleAI, schemas } from '../worker/openai.mjs';

const req = (kind = 'review', payload = { code: 'return a-b;', specialty: 'programming' }, extra = {}) => new Request('https://ideaforgeai.xyz/api/ai', {
  method: 'POST', headers: { origin: 'https://ideaforgeai.xyz', 'content-type': 'application/json', authorization: 'Bearer user-session', ...extra }, body: JSON.stringify({ kind, payload })
});
const answer = kind => kind === 'review' ? { summary: 'Review', issues: ['Wrong operator'], correctedCode: 'return a+b;', tests: ['Check addition'], limitations: 'Not executed' } :
  kind === 'ideas' ? { ideas: Array.from({ length: 3 }, (_, i) => ({ title: 'Idea ' + i, description: 'Details', reason: 'Fits', stack: ['Tool'], firstSteps: ['Begin'] })) } :
  { title: 'Plan', summary: 'Summary', tools: [{ name: 'Tool', url: 'https://example.com', setup: 'Install' }], languages: ['Knowledge'], files: ['README'], phases: Array.from({ length: 5 }, () => ({ title: 'Phase', steps: ['Step'], deliverable: 'Output', test: 'Check' })), launchChecklist: ['Ready'], nextLearning: ['Next'] };
const provider = data => Response.json({ status: 'completed', output: [{ type: 'reasoning', summary: [{ text: 'Not for display' }] }, { type: 'message', content: [{ type: 'output_text', text: JSON.stringify(data) }] }] });
function limits(settings = {}) {
  const values = new Map();
  const storage = { get: async key => structuredClone(values.get(key)), put: async (key, value) => values.set(key, structuredClone(value)) };
  let chain = Promise.resolve();
  storage.transaction = fn => { const run = chain.then(() => fn(storage)); chain = run.catch(() => {}); return run; };
  const state = { storage };
  let instance = new AILimits(state, settings);
  return { binding: { idFromName: name => name, get: () => ({ fetch: (...args) => instance.fetch(new Request(...args)) }) }, values,
    restart() { instance = new AILimits(state, settings); }, consume: user => instance.fetch(new Request('https://limits.internal/consume', { method: 'POST', body: JSON.stringify({ user }) })) };
}
function setup(options = {}) {
  const limiter = limits(options.settings);
  const env = { OPENAI_API_KEY: 'test-only-secret', SUPABASE_URL: 'https://auth.example', SUPABASE_PUBLISHABLE_KEY: 'public', AI_LIMITS: limiter.binding };
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith('/auth/v1/user')) return options.auth || Response.json({ id: options.user || 'owner-1' });
    if (url.includes('if_ai_idea_context')) return options.context || Response.json({ titles: ['Older idea'] });
    if (url.includes('if_ai_claim_ideas')) return Response.json({ accepted: options.claim !== false });
    return options.response ? options.response() : provider(answer(options.kind || 'review'));
  };
  return { env, calls, fetcher, limiter };
}

test('missing auth and cross-origin requests never reach identity or OpenAI', async () => {
  const a = setup();
  assert.equal((await handleAI(req('review', { code: 'x' }, { authorization: '' }), a.env, a.fetcher)).status, 401);
  assert.equal((await handleAI(req('review', { code: 'x' }, { origin: 'https://evil.example' }), a.env, a.fetcher)).status, 403);
  assert.equal(a.calls.length, 0);
});
test('expired or revoked Supabase sessions cannot consume paid AI', async () => {
  const a = setup({ auth: Response.json({}, { status: 401 }) });
  assert.equal((await handleAI(req(), a.env, a.fetcher)).status, 401);
  assert.equal(a.calls.length, 1);
  assert.equal(a.limiter.values.size, 0);
});
test('missing new secret fails closed; old Gemini and NVIDIA secrets are ignored', async () => {
  const a = setup(); delete a.env.OPENAI_API_KEY;
  a.env.GEMINI_API_KEY = 'old-test'; a.env.NVIDIA_API_KEY = 'old-test';
  assert.equal((await handleAI(req(), a.env, a.fetcher)).status, 503);
  assert.equal(a.calls.length, 0);
});
test('malformed, too large, unknown and prototype-like inputs are rejected', async () => {
  const a = setup();
  for (const [kind, payload] of [['unknown', {}], ['constructor', {}], ['review', []], ['review', { code: '' }], ['review', { code: 'x'.repeat(150001) }], ['review', { code: 'x', duration: { count: 1.5, unit: 'weeks' } }], ['review', { code: 'x', segment: { index: 2, total: 1 } }]]) {
    assert.equal((await handleAI(req(kind, payload), a.env, a.fetcher)).status, 400);
  }
  assert.equal((await handleAI(new Request('https://ideaforgeai.xyz/api/ai', { method: 'POST', headers: { authorization: 'Bearer x', 'content-type': 'application/json' }, body: 'x'.repeat(220001) }), a.env, a.fetcher)).status, 413);
  assert.equal(a.calls.length, 0);
});
test('main/subspecialty mismatch is rejected before generation', async () => {
  const a = setup();
  assert.equal((await handleAI(req('ideas', { specialty: 'medicine', subspecialty: '061301' }), a.env, a.fetcher)).status, 400);
  assert.equal(a.calls.length, 0);
});
test('all three features use Responses, strict schema, no storage, and no reasoning', async () => {
  for (const kind of ['ideas', 'review', 'plan']) {
    const a = setup({ kind });
    const payload = kind === 'ideas' ? { specialty: 'programming', subspecialty: '061301', skills: 'HTML', duration: { count: 4, unit: 'weeks' } } : kind === 'review' ? { code: 'source', specialty: 'medicine' } : { project: { title: 'Project' }, specialty: 'engineering' };
    const response = await handleAI(req(kind, payload), a.env, a.fetcher);
    assert.equal(response.status, 200);
    const ai = a.calls.find(c => c.url.startsWith('https://api.openai.com/'));
    assert.equal(ai.url, 'https://api.openai.com/v1/responses');
    const body = JSON.parse(ai.init.body);
    assert.equal(body.store, false); assert.equal(body.reasoning.effort, 'none');
    assert.equal(body.text.format.type, 'json_schema'); assert.equal(body.text.format.strict, true);
    assert.deepEqual(body.text.format.schema, schemas[kind]);
    assert.equal(ai.init.headers.authorization, 'Bearer test-only-secret');
    const result = await response.text();
    assert.doesNotMatch(result, /test-only-secret|user-session|Not for display/);
    assert.equal(a.calls.some(c => /googleapis|nvidia/.test(c.url)), false);
  }
});
test('duplicate ideas have bounded regeneration and never return a rejected reservation', async () => {
  const a = setup({ kind: 'ideas', claim: false });
  const r = await handleAI(req('ideas', { specialty: 'programming', subspecialty: '061301' }), a.env, a.fetcher);
  assert.equal(r.status, 409);
  assert.equal(a.calls.filter(c => c.url.startsWith('https://api.openai.com')).length, 2);
  const body = JSON.parse(a.calls.find(c => c.url.startsWith('https://api.openai.com')).init.body);
  assert.match(body.input, /Older idea/);
});
test('unavailable idea history prevents generation', async () => {
  const a = setup({ kind: 'ideas', context: Response.json({}, { status: 500 }) });
  const r = await handleAI(req('ideas', { specialty: 'programming', subspecialty: '061301' }), a.env, a.fetcher);
  assert.equal((await r.json()).error, 'ideas_history_unavailable');
  assert.equal(a.calls.filter(c => c.url.startsWith('https://api.openai.com')).length, 0);
});
test('permission, billing and overload errors are sanitized and not silently retried', async () => {
  for (const [status, code, expected] of [[401, '', 'provider_key_rejected'], [429, 'insufficient_quota', 'provider_billing_required'], [429, 'rate_limit_exceeded', 'provider_limit'], [503, '', 'provider_busy']]) {
    const a = setup({ response: () => Response.json({ error: { message: 'private-secret-detail', code } }, { status }) });
    const r = await handleAI(req(), a.env, a.fetcher);
    const text = await r.text(); assert.equal(JSON.parse(text).error, expected);
    assert.doesNotMatch(text, /private-secret-detail/);
    assert.equal(a.calls.filter(c => c.url.startsWith('https://api.openai.com')).length, 1);
  }
});
test('incomplete, refused, malformed and wrong schema answers never become successful reports', async () => {
  const responses = [
    { status: 'incomplete', output: [] },
    { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }] },
    { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'not JSON' }] }] },
    { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ summary: 'Missing corrected code' }) }] }] }
  ];
  for (const body of responses) {
    const a = setup({ response: () => Response.json(body) });
    assert.ok((await handleAI(req(), a.env, a.fetcher)).status >= 400);
  }
});
test('minute quota is enforced across limiter instances and user IDs cannot bypass site daily cap', async () => {
  const l = limits({ AI_USER_RPM: '2', AI_SITE_DAILY: '3' });
  assert.equal((await l.consume('one')).status, 200); l.restart();
  assert.equal((await l.consume('one')).status, 200);
  assert.equal((await l.consume('one')).status, 429);
  assert.equal((await l.consume('two')).status, 200);
  assert.equal((await l.consume('three')).status, 429);
  assert.equal((await l.consume('three')).status, 429);
});
test('durable budget serializes simultaneous admission and resets after a UTC day', async () => {
  const l = limits({ AI_SITE_DAILY: '2' });
  const results = await Promise.all(Array.from({ length: 5 }, (_, i) => l.consume('user-' + i)));
  assert.equal(results.filter(r => r.status === 200).length, 2);
  l.values.set('budget', { day: 0, total: 50000, users: {} });
  assert.equal((await l.consume('next-day')).status, 200);
});
test('quota failures stop OpenAI calls', async () => {
  const a = setup({ settings: { AI_USER_RPM: '1' } });
  assert.equal((await handleAI(req(), a.env, a.fetcher)).status, 200);
  assert.equal((await handleAI(req(), a.env, a.fetcher)).status, 429);
  assert.equal(a.calls.filter(c => c.url.startsWith('https://api.openai.com')).length, 1);
});
test('static server only serves the asset allowlist and blocks source/config/key paths', async () => {
  let served = 0;
  const env = { ASSETS: { fetch: async () => { served++; return new Response('asset'); } } };
  for (const path of ['/', '/index.html', '/admin.html', '/images/ideaforge-logo.png', '/robots.txt', '/sitemap.xml']) {
    const r = await worker.fetch(new Request('https://ideaforgeai.xyz' + path), env);
    assert.equal(r.status, 200); assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  }
  for (const path of ['/worker/openai.mjs', '/.env', '/.dev.vars', '/openai-key.dpapi', '/wrangler.jsonc', '/tests/frontend.test.cjs', '/api/unknown', '/admin']) {
    assert.equal((await worker.fetch(new Request('https://ideaforgeai.xyz' + path), env)).status, 404);
  }
  assert.equal(served, 6);
});
test('Worker config has durable SQLite limits and public values but no API secret', async () => {
  const config = JSON.parse(await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8'));
  assert.deepEqual(config.migrations[0].new_sqlite_classes, ['AILimits']);
  assert.equal(config.assets.run_worker_first, true);
  assert.equal(config.assets.html_handling, 'none');
  assert.equal(config.vars.OPENAI_API_KEY, undefined);
  assert.equal(config.vars.OPENAI_MODEL, 'gpt-6-luna');
});
