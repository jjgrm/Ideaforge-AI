import { json } from './openai.mjs';
// One durable, serialized budget for all Worker isolates; no credentials or drafts are stored.
export class AILimits {
  constructor(state, env) { this.state = state; this.env = env; }
  async fetch(request) {
    if (request.method !== 'POST' || new URL(request.url).pathname !== '/consume') return json({ error: 'not_found' }, 404);
    let user; try { ({ user } = await request.json()); } catch { return json({ error: 'invalid_input' }, 400); }
    if (typeof user !== 'string' || user.length > 200 || !user) return json({ error: 'invalid_input' }, 400);
    const now = Date.now(), day = Math.floor(now / 86400000), minute = Math.floor(now / 60000);
    const number = (value, fallback, max) => Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= max ? Number(value) : fallback;
    const perMinute = number(this.env.AI_USER_RPM, 6, 60);
    const userDaily = number(this.env.AI_USER_DAILY, 100, 10000);
    const siteDaily = number(this.env.AI_SITE_DAILY, 500, 100000);
    const decision = await this.state.storage.transaction(async storage => {
      const old = await storage.get('budget');
      const budget = old?.day === day ? old : { day, total: 0, users: {} };
      const entry = budget.users[user] || { dayCount: 0, minute, count: 0 };
      if (budget.total >= siteDaily || entry.dayCount >= userDaily) return { error: 'daily_limit', retryAfterSeconds: Math.ceil(((day + 1) * 86400000 - now) / 1000) };
      if (entry.minute !== minute) { entry.minute = minute; entry.count = 0; }
      if (entry.count >= perMinute) return { error: 'rate_limited', retryAfterSeconds: 60 - Math.floor(now / 1000) % 60 };
      entry.count++; entry.dayCount++; budget.total++; budget.users[user] = entry;
      await storage.put('budget', budget);
      return { allowed: true };
    });
    return json(decision, decision.allowed ? 200 : 429);
  }
}
