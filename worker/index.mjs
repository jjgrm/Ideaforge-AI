import { handleAI, json } from './openai.mjs';
export { AILimits } from './limits.mjs';
const staticPaths = new Set(['/', '/index.html', '/admin.html', '/activate.html', '/ps.css', '/ps.js', '/admin.css', '/admin.js',
  '/ai-client.js', '/review-chunks.js', '/specialties.js', '/specialty-selector.js', '/supabase-config.js',
  '/images/ideaforge-logo.png', '/images/sun.svg', '/images/moon.svg', '/robots.txt', '/sitemap.xml']);
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/ai') return handleAI(request, env);
    if (url.pathname.startsWith('/api/')) return json({ error: 'not_found' }, 404);
    if (!['GET', 'HEAD'].includes(request.method)) return json({ error: 'method_not_allowed' }, 405);
    if (!staticPaths.has(url.pathname)) return new Response('Not found', { status: 404 });
    if (url.pathname === '/') url.pathname = '/index.html';
    const source = await env.ASSETS.fetch(new Request(url, request));
    const headers = new Headers(source.headers);
    headers.set('x-content-type-options', 'nosniff');
    headers.set('referrer-policy', 'strict-origin-when-cross-origin');
    headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    headers.set('content-security-policy', "frame-ancestors 'none'; object-src 'none'; base-uri 'self'");
    headers.set('cache-control', url.pathname.endsWith('.png') || url.pathname.endsWith('.svg') ? 'public, max-age=86400' : 'no-cache');
    if (url.protocol === 'https:') headers.set('strict-transport-security', 'max-age=31536000');
    return new Response(source.body, { status: source.status, headers });
  }
};
