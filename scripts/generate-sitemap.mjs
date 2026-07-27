// Génère public/sitemap.xml après le build. DOMAINE EN DUR : vérifier à chaque clone.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const SITE = 'https://rachat-diamants.fr';
const DIST_DIR = new URL('../dist', import.meta.url).pathname;

function collectHtmlPaths(dir, base = '') {
  const entries = readdirSync(dir);
  let paths = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const relPath = join(base, entry);

    if (statSync(fullPath).isDirectory()) {
      paths = paths.concat(collectHtmlPaths(fullPath, relPath));
    } else if (entry === 'index.html') {
      const urlPath = base === '' ? '/' : `/${base}/`;
      paths.push(urlPath.replace(/\\/g, '/'));
    }
  }

  return paths;
}

const urls = collectHtmlPaths(DIST_DIR).sort();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${SITE}${url}</loc></url>`).join('\n')}
</urlset>
`;

writeFileSync(join(DIST_DIR, 'sitemap.xml'), xml);
console.log(`sitemap.xml généré avec ${urls.length} URLs.`);
