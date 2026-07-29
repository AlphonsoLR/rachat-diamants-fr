// Génère les miroirs Markdown (brief §15) : un .md par page, même source de données que le HTML.
// Pattern d'URL : /rachat-diamant/rennes.md (sibling du dossier, pas dedans).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DATA_DIR = join(ROOT, 'data');
const DIST_DIR = join(ROOT, 'dist');
const SITE = 'https://rachat-diamants.fr';

function loadJson(name) {
  return JSON.parse(readFileSync(join(DATA_DIR, name), 'utf-8'));
}

const cities = loadJson('cities.json');
const shapes = loadJson('shapes.json');
const carats = loadJson('carats.json');
const colors = loadJson('colors.json');
const clarity = loadJson('clarity.json');
const pricing = loadJson('pricing-matrix.json');

function caratSlug(value) {
  return value.toString().replace('.', '-');
}

function getCaratBandKey(carat) {
  const keys = Object.keys(pricing.base_ct_by_carat_band).filter((k) => k !== '_comment');
  for (const band of keys) {
    if (band.endsWith('+')) {
      if (carat >= parseFloat(band)) return band;
      continue;
    }
    const [min, max] = band.split('-').map(Number);
    if (carat >= min && carat <= max) return band;
  }
  return keys[0];
}

function estimate({ carat, colorSlug = 'g', claritySlug = 'vs1', shapeSlug = 'rond-brillant', cutSlug = 'excellent' }) {
  const bandKey = getCaratBandKey(carat);
  const baseCt = pricing.base_ct_by_carat_band[bandKey];
  const shape = shapes.find((s) => s.slug === shapeSlug) ?? shapes[0];
  const fc = pricing.facteur_couleur[colorSlug] ?? 1;
  const fp = pricing.facteur_purete[claritySlug] ?? 1;
  const ft = pricing.facteur_taille[cutSlug] ?? 1;
  const retail = baseCt * fc * fp * ft * shape.price_factor * carat;
  return {
    retail: { low: Math.round(retail * 0.95), high: Math.round(retail * 1.05) },
    rachat: {
      low: Math.round(retail * pricing.taux_rachat_bas),
      high: Math.round(retail * pricing.taux_rachat_haut),
    },
  };
}

function eur(v) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
}

function range(r) {
  return `${eur(r.low)} – ${eur(r.high)}`;
}

function write(path, content) {
  const full = join(DIST_DIR, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

let count = 0;

// --- Villes ---
for (const city of cities) {
  const est1 = estimate({ carat: 1.0 });
  const priceTable = [0.5, 1.0, 1.5, 2.0]
    .map((c) => {
      const e = estimate({ carat: c });
      return `| ${c.toFixed(2)} ct | ${range(e.retail)} | ${range(e.rachat)} |`;
    })
    .join('\n');

  const md = `# Rachat, achat et vente de diamants à ${city.name}

Source : ${SITE}/rachat-diamant/${city.slug}/

À ${city.name} (${city.department.name}, ${city.region.name}), la valeur de rachat d'un diamant dépend d'abord de son certificat, puis de ses 4C (carat, couleur, pureté, taille).

## En bref
- Un diamant 1 carat G/VS1 se rachète indicativement entre ${range(est1.rachat)} à ${city.name}.
- ${city.population.toLocaleString('fr-FR')} habitants à ${city.name} (${city.department.name}, ${city.region.name}).
- Aucun comptoir partenaire n'est encore recensé individuellement pour ${city.name}.
- Délai indicatif de rachat : 48 h après réception et vérification.

## Barème indicatif (qualité G/VS1, taille Excellent)
| Carat | Retail estimé | Rachat estimé |
|---|---|---|
${priceTable}

Barème d'exemple non validé par un expert métier, révisé le ${pricing.last_review}.

## Département & région
Département : ${city.department.name} (${city.department.code}) — ${SITE}/rachat-diamant/departement/${city.department.slug}/
Région : ${city.region.name} — ${SITE}/rachat-diamant/region/${city.region.slug}/

## Villes proches
${city.nearby_cities.map((n) => `- ${n.name} (${n.km} km)`).join('\n')}

---
Fourchettes indicatives, ni offre ferme ni conseil en investissement. Prix ferme uniquement après examen physique.
`;
  write(`rachat-diamant/${city.slug}.md`, md);
  count++;
}

// --- Départements ---
const departments = new Map();
for (const c of cities) {
  if (!departments.has(c.department.slug)) departments.set(c.department.slug, { department: c.department, cities: [] });
  departments.get(c.department.slug).cities.push(c);
}
for (const { department, cities: depCities } of departments.values()) {
  const md = `# Rachat de diamant — ${department.name} (${department.code})

Source : ${SITE}/rachat-diamant/departement/${department.slug}/

${depCities.length} ville(s) couverte(s) dans le département ${department.name}.

## Villes
${depCities.map((c) => `- ${c.name} — ${SITE}/rachat-diamant/${c.slug}/`).join('\n')}
`;
  write(`rachat-diamant/departement/${department.slug}.md`, md);
  count++;
}

// --- Régions ---
const regions = new Map();
for (const c of cities) {
  if (!regions.has(c.region.slug)) regions.set(c.region.slug, { region: c.region, cities: [] });
  regions.get(c.region.slug).cities.push(c);
}
for (const { region, cities: regionCities } of regions.values()) {
  const md = `# Rachat de diamant — ${region.name}

Source : ${SITE}/rachat-diamant/region/${region.slug}/

${regionCities.length} ville(s) couverte(s) en région ${region.name}.

## Villes
${regionCities.map((c) => `- ${c.name} — ${SITE}/rachat-diamant/${c.slug}/`).join('\n')}
`;
  write(`rachat-diamant/region/${region.slug}.md`, md);
  count++;
}

// --- Formes ---
for (const shape of shapes) {
  const md = `# Diamant taille ${shape.name} : prix, rachat et estimation

Source : ${SITE}/diamant/forme/${shape.slug}/

${shape.description_long}

Ratio idéal : ${shape.ratio_ideal} — Facettes : ${shape.facets} — Popularité : #${shape.popularity_rank}

## Prix par carat (G/VS1, Excellent)
${[0.5, 1.0, 1.5, 2.0]
  .map((c) => `- ${c.toFixed(2)} ct : rachat ${range(estimate({ carat: c, shapeSlug: shape.slug }).rachat)}`)
  .join('\n')}
`;
  write(`diamant/forme/${shape.slug}.md`, md);
  count++;
}

// --- Carats ---
for (const carat of carats) {
  const est = estimate({ carat: carat.value });
  const md = `# Prix et rachat d'un diamant de ${carat.label}

Source : ${SITE}/diamant/carat/${caratSlug(carat.value)}/

Estimation en qualité G/VS1, taille Excellent : retail ${range(est.retail)}, rachat ${range(est.rachat)}.
${carat.threshold_effect ? `\n${carat.note}\n` : ''}
## Tableau croisé couleur × pureté
${clarity
  .map(
    (cl) =>
      `- ${cl.grade} : ` +
      colors
        .filter((co) => co.category !== 'fancy')
        .map((co) => `${co.grade} ${eur(estimate({ carat: carat.value, colorSlug: co.slug, claritySlug: cl.slug }).retail.low)}`)
        .join(', ')
  )
  .join('\n')}
`;
  write(`diamant/carat/${caratSlug(carat.value)}.md`, md);
  count++;
}

// --- Couleurs ---
for (const color of colors) {
  const md = `# Diamant couleur ${color.label}

Source : ${SITE}/diamant/couleur/${color.slug}/

Sur l'échelle GIA (D à Z), ${color.label.toLowerCase()} appartient à la catégorie "${color.category.replace('-', ' ')}".

## Prix indicatif par carat (pureté VS1, Excellent)
${[0.5, 1.0, 1.5, 2.0]
  .map((c) => `- ${c.toFixed(2)} ct : rachat ${range(estimate({ carat: c, colorSlug: color.slug }).rachat)}`)
  .join('\n')}
`;
  write(`diamant/couleur/${color.slug}.md`, md);
  count++;
}

// --- Puretés ---
for (const cl of clarity) {
  const md = `# Diamant pureté ${cl.grade}

Source : ${SITE}/diamant/purete/${cl.slug}/

${cl.description}

## Prix indicatif par carat (couleur G, Excellent)
${[0.5, 1.0, 1.5, 2.0]
  .map((c) => `- ${c.toFixed(2)} ct : rachat ${range(estimate({ carat: c, claritySlug: cl.slug }).rachat)}`)
  .join('\n')}
`;
  write(`diamant/purete/${cl.slug}.md`, md);
  count++;
}

// --- Barème pilier ---
write(
  'bareme-rachat-diamant.md',
  `# Le barème de rachat rachat-diamants.fr

Source : ${SITE}/bareme-rachat-diamant/

${pricing._disclaimer}

Formule : prix_retail = base_ct(palier_carat) × facteur_couleur × facteur_purete × facteur_taille × facteur_forme × facteur_fluorescence × facteur_certificat × facteur_origine × carat.
Rachat = prix_retail × [${pricing.taux_rachat_bas}, ${pricing.taux_rachat_haut}].

Dernière révision : ${pricing.last_review}.
`
);
count++;

console.log(`${count} miroirs .md générés dans dist/.`);
