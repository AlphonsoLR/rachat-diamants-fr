// Construit /data/cities.json à partir de la donnée officielle geo.api.gouv.fr
// (déjà téléchargée dans /tmp/communes_full.json par le script d'appel).
// Source réelle uniquement — aucune ville/coordonnée inventée.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const RAW_PATH = process.argv[2] ?? '/tmp/communes_full.json';
const OUT_PATH = new URL('../data/cities.json', import.meta.url);
const TOP_N = 1000; // objectif final du brief §5 (30 T1 + 170 T2 + 800 T3)

function slugify(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

function contentSeed(slug) {
  const hash = createHash('sha1').update(slug).digest('hex');
  return parseInt(hash.slice(0, 8), 16) % 10000;
}

const raw = JSON.parse(readFileSync(RAW_PATH, 'utf-8'));

const sorted = raw
  .filter((c) => c.population && c.centre?.coordinates)
  .sort((a, b) => b.population - a.population)
  .slice(0, TOP_N);

// Gestion des homonymes : suffixer par le département si le nom (slugifié) apparaît plusieurs fois
const slugCounts = new Map();
for (const c of sorted) {
  const base = slugify(c.nom);
  slugCounts.set(base, (slugCounts.get(base) ?? 0) + 1);
}

const cities = sorted.map((c) => {
  const base = slugify(c.nom);
  const slug = slugCounts.get(base) > 1 ? `${base}-${c.departement.code}` : base;
  return {
    slug,
    name: c.nom,
    insee: c.code,
    postal_codes: c.codesPostaux,
    population: c.population,
    department: { code: c.departement.code, name: c.departement.nom, slug: slugify(c.departement.nom) },
    region: { name: c.region.nom, slug: slugify(c.region.nom) },
    lat: c.centre.coordinates[1],
    lng: c.centre.coordinates[0],
    tier: 0, // assigné plus bas
    nearest_partner: null, // partenaire opérateur non défini — cf. brief §22
    local_merchants: [], // à recenser manuellement — jamais de nom inventé
    nearby_cities: [],
    content_seed: contentSeed(slug),
  };
});

// tier selon brief §5 : 30 T1 (métropoles), 170 T2 (>40k hab.), 800 T3 (le reste)
cities.forEach((c, i) => {
  c.tier = i < 30 ? 1 : i < 200 ? 2 : 3;
});

// nearby_cities : 8 plus proches (haversine) parmi le même jeu de données
for (const city of cities) {
  const distances = cities
    .filter((other) => other.slug !== city.slug)
    .map((other) => ({
      slug: other.slug,
      name: other.name,
      km: Math.round(haversineKm(city, other) * 10) / 10,
    }))
    .sort((a, b) => a.km - b.km)
    .slice(0, 8);
  city.nearby_cities = distances;
}

mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
writeFileSync(OUT_PATH, JSON.stringify(cities, null, 2));
const t1 = cities.filter((c) => c.tier === 1).length;
const t2 = cities.filter((c) => c.tier === 2).length;
const t3 = cities.filter((c) => c.tier === 3).length;
console.log(`cities.json généré : ${cities.length} villes réelles (${t1} tier 1, ${t2} tier 2, ${t3} tier 3).`);
