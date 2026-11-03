import '../specialties.js';
import { system, specs } from './instructions.mjs';

export const json = (data, status = 200, headers = {}) => Response.json(data, {
  status, headers: { 'cache-control': 'no-store', ...headers }
});
const string = { type: 'string' };
const strings = { type: 'array', items: string };
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const list = items => ({ type: 'array', items });
export const schemas = {
  ideas: object({ ideas: list(object({ title: string, description: string, reason: string, stack: strings, firstSteps: strings })) }),
  review: object({ summary: string, issues: strings, correctedCode: string, tests: strings, limitations: string }),
  plan: object({ title: string, summary: string, tools: list(object({ name: string, url: string, setup: string })), languages: strings,
    files: strings, phases: list(object({ title: string, steps: strings, deliverable: string, test: string })), launchChecklist: strings, nextLearning: strings })
};
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export function matches(schema, value) {
  if (schema.type === 'string') return typeof value === 'string';
  if (schema.type === 'array') return Array.isArray(value) && value.length <= 200 && value.every(item => matches(schema.items, item));
  return plain(value) && Object.keys(value).every(key => Object.hasOwn(schema.properties, key)) &&
    schema.required.every(key => Object.hasOwn(value, key) && matches(schema.properties[key], value[key]));
}
async function boundedJSON(response, maxBytes) {
  const reader = response.body?.getReader();
  if (!reader) throw Error('invalid_input');
  let bytes = 0, raw = ''; const decoder = new TextDecoder();
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > maxBytes) { await reader.cancel(); throw Error('input_too_large'); }
      raw += decoder.decode(part.value, { stream: true });
    }
    return JSON.parse(raw + decoder.decode());
  } finally { reader.releaseLock(); }
}
export async function handleAI(request, env, fetcher = fetch) {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, { allow: 'POST' });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return json({ error: 'origin_denied' }, 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ error: 'invalid_content_type' }, 415);
  const auth = request.headers.get('authorization') || '';
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(auth)) return json({ error: 'sign_in_required' }, 401);
  if (Number(request.headers.get('content-length')) > 220000) return json({ error: 'input_too_large' }, 413);
  let input;
  try { input = await boundedJSON(request, 220000); }
  catch (error) { return json({ error: error.message === 'input_too_large' ? error.message : 'invalid_input' }, error.message === 'input_too_large' ? 413 : 400); }
  if (!plain(input) || !Object.hasOwn(schemas, input.kind) || !plain(input.payload)) return json({ error: 'invalid_input' }, 400);
  const { kind, payload } = input;
  if (kind === 'review' && (typeof payload.code !== 'string' || !payload.code.trim() || new TextEncoder().encode(payload.code).length > 150000)) return json({ error: 'code_limit' }, 400);
  if (kind !== 'review' && JSON.stringify(payload).length > 14000) return json({ error: 'input_too_large' }, 413);
  if (payload.request !== undefined && (typeof payload.request !== 'string' || payload.request.length > 10000)) return json({ error: 'invalid_input' }, 400);
  if (payload.specialty !== undefined) {
    const group = globalThis.IdeaForgeSpecialties.find(payload.specialty);
    if (!group || (payload.subspecialty && !globalThis.IdeaForgeSpecialties.valid(group.id, payload.subspecialty)) ||
      (kind === 'ideas' && !globalThis.IdeaForgeSpecialties.valid(group.id, payload.subspecialty))) return json({ error: 'invalid_input' }, 400);
    payload.specialtyName = group.name;
    payload.subspecialtyName = globalThis.IdeaForgeSpecialties.branch(group.id, payload.subspecialty)?.name || '';
  } else if (payload.subspecialty !== undefined || kind === 'ideas') return json({ error: 'invalid_input' }, 400);
  if (payload.duration !== undefined) {
    const d = payload.duration;
    if (!plain(d) || !Number.isInteger(d.count) || d.count < 1 || d.count > 120 || !['weeks', 'months'].includes(d.unit)) return json({ error: 'invalid_input' }, 400);
  }
  if (payload.segment !== undefined) {
    const s = payload.segment;
    if (kind !== 'review' || !plain(s) || !Number.isInteger(s.index) || !Number.isInteger(s.total) || s.index < 1 || s.total < s.index || s.total > 128) return json({ error: 'invalid_input' }, 400);
  }
  if (!env.OPENAI_API_KEY || !env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY || !env.AI_LIMITS) return json({ error: 'ai_not_configured' }, 503);
  const model = env.OPENAI_MODEL || 'gpt-6-luna';
  // Explicit allowlist prevents an accidental environment change selecting an expensive model.
  if (model !== 'gpt-6-luna') return json({ error: 'ai_not_configured' }, 503);
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 55000);
  let excluded = [];
  try {
    const identity = await fetcher(env.SUPABASE_URL + '/auth/v1/user', { headers: { authorization: auth, apikey: env.SUPABASE_PUBLISHABLE_KEY }, signal: controller.signal });
    if (!identity.ok) return json({ error: 'sign_in_required' }, 401);
    const user = await identity.json();
    if (typeof user.id !== 'string' || !user.id) return json({ error: 'sign_in_required' }, 401);
    const quota = env.AI_LIMITS.get(env.AI_LIMITS.idFromName('production-budget'));
    const gate = await quota.fetch('https://limits.internal/consume', { method: 'POST', body: JSON.stringify({ user: user.id }) });
    if (!gate.ok) return json(await gate.json(), gate.status);
    const history = async (name, args = {}) => {
      const response = await fetcher(env.SUPABASE_URL + '/rest/v1/rpc/' + name, { method: 'POST', signal: controller.signal,
        headers: { authorization: auth, apikey: env.SUPABASE_PUBLISHABLE_KEY, 'content-type': 'application/json' }, body: JSON.stringify(args) });
      if (!response.ok) throw Error('ideas_history_unavailable');
      return response.json();
    };
    if (kind === 'ideas') {
      const context = await history('if_ai_idea_context');
      if (!Array.isArray(context.titles)) throw Error('ideas_history_unavailable');
      excluded = context.titles.filter(t => typeof t === 'string');
      // Fail closed instead of silently dropping history and reissuing an old idea.
      if (JSON.stringify(excluded).length > 120000) throw Error('ideas_history_unavailable');
    }
    // At most two generations when a database uniqueness reservation rejects an idea.
    for (let generation = 0; generation < 2; generation++) {
      const prompt = JSON.stringify(kind === 'ideas' ? { ...payload, previouslyShownTitles: excluded } : payload);
      const response = await fetcher('https://api.openai.com/v1/responses', {
        method: 'POST', signal: controller.signal,
        headers: { authorization: 'Bearer ' + env.OPENAI_API_KEY, 'content-type': 'application/json' },
        body: JSON.stringify({ model, store: false, reasoning: { effort: 'none' },
          instructions: system + '\n' + specs[kind] + (payload.segment ? '\nهذا جزء من ملف كبير؛ راجع هذا الجزء فقط ولا تدّع فحص تكامل بقية الأجزاء.' : ''),
          input: prompt, max_output_tokens: kind === 'ideas' ? 2500 : kind === 'plan' ? 7000 : 14000,
          text: { format: { type: 'json_schema', name: 'ideaforge_' + kind, strict: true, schema: schemas[kind] } } })
      });
      if (!response.ok) {
        if ([401, 403].includes(response.status)) return json({ error: 'provider_key_rejected' }, 502);
        if (response.status === 429) {
          let code = ''; try { code = (await boundedJSON(response, 20000))?.error?.code || ''; } catch {}
          const delay = Number(response.headers.get('retry-after'));
          return json({ error: code === 'insufficient_quota' ? 'provider_billing_required' : 'provider_limit', quotaScope: 'unknown',
            ...(delay > 0 && delay <= 3600 ? { retryAfterSeconds: Math.ceil(delay) } : {}) }, 429);
        }
        return json({ error: response.status >= 500 ? 'provider_busy' : 'provider_failed' }, 502);
      }
      const result = await boundedJSON(response, 500000);
      if (result.status !== 'completed') return json({ error: 'incomplete_response' }, 502);
      const content = (result.output || []).filter(item => item.type === 'message').flatMap(item => item.content || []);
      if (content.some(item => item.type === 'refusal')) return json({ error: 'provider_refusal' }, 422);
      const raw = content.filter(item => item.type === 'output_text').map(item => item.text || '').join('');
      let data; try { data = JSON.parse(raw); } catch { return json({ error: 'invalid_response' }, 502); }
      if (!matches(schemas[kind], data) || new TextEncoder().encode(raw).length > 180000) return json({ error: 'invalid_response' }, 502);
      if (kind === 'ideas' && (data.ideas.length !== 3 || new Set(data.ideas.map(x => x.title.trim().toLowerCase())).size !== 3 || data.ideas.some(x => !x.title.trim() || x.title.length > 120))) return json({ error: 'invalid_response' }, 502);
      if (kind === 'plan' && (data.phases.length !== 5 || data.phases.some(x => !x.steps.length))) return json({ error: 'invalid_response' }, 502);
      if (kind === 'ideas') {
        const claim = await history('if_ai_claim_ideas', { p_ideas: data.ideas });
        if (!claim.accepted) { excluded.push(...data.ideas.map(x => x.title)); continue; }
      }
      return json({ data });
    }
    return json({ error: 'no_unique_ideas' }, 409);
  } catch (error) {
    return json({ error: controller.signal.aborted ? 'timeout' : error.message === 'ideas_history_unavailable' ? error.message : 'provider_failed' }, 502);
  } finally { clearTimeout(timer); }
}
