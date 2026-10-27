// Local preview only. Bind to loopback and serve only browser assets.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const assets = new Set(['/index.html', '/ai-client.js', '/specialties.js', '/specialty-selector.js', '/review-chunks.js', '/ps.css', '/ps.js', '/supabase-config.js', '/admin.html', '/admin.css', '/admin.js', '/activate.html']);
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
export async function handleRequest(request, response) {
    try {
        if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
        const url = new URL(request.url, 'http://127.0.0.1:3000');
        const path = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
        const image = path.startsWith('/images/') && ['.png','.jpg','.jpeg','.svg','.webp'].includes(extname(path));
        if (!assets.has(path) && !image) { response.writeHead(404).end(); return; }
        const file = resolve(root, '.' + path);
        if (!file.startsWith(resolve(root) + sep)) { response.writeHead(403).end(); return; }
        if (image && !file.startsWith(resolve(root, 'images') + sep)) { response.writeHead(403).end(); return; }
        const body = await readFile(file);
        response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream',
            'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
            'Referrer-Policy': 'no-referrer' });
        response.end(request.method === 'HEAD' ? undefined : body);
    } catch { response.writeHead(404).end(); }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const server = createServer(handleRequest);
    server.on('error', error => { console.error(error.message); process.exitCode = 1; });
    server.listen(3000, '127.0.0.1', () => console.log('IdeaForge: http://localhost:3000/ (loopback only)'));
}
