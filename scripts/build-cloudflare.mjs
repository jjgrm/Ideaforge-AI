import { mkdir, copyFile, readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..'), out = resolve(root, 'public');
await mkdir(resolve(out, 'images'), { recursive: true });
const files = ['index.html', 'admin.html', 'activate.html', 'ps.css', 'ps.js', 'admin.css', 'admin.js', 'ai-client.js',
  'review-chunks.js', 'specialties.js', 'specialty-selector.js', 'supabase-config.js', 'robots.txt', 'sitemap.xml',
  'images/ideaforge-logo.png', 'images/sun.svg', 'images/moon.svg'];
for (const name of files) await copyFile(resolve(root, name), resolve(out, name));
// Fail the build if any extra file could accidentally publish source or a secret.
const allowed = new Set(files);
async function check(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) await check(resolve(directory, entry.name), name + '/');
    else {
      if (!allowed.has(name)) throw Error('Unexpected public asset: ' + name);
      if (/\.(?:js|html|css|txt|xml)$/.test(name) && /sk-(?:proj-|svcacct-)[A-Za-z0-9_-]{20,}|nvapi-[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{25,}/.test(await readFile(resolve(directory, entry.name), 'utf8'))) throw Error('Credential-like content in public asset');
    }
  }
}
await check(out);
console.log('Cloudflare public assets prepared: ' + files.length);
