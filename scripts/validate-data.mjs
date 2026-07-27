import { readFileSync } from 'node:fs';
import {
  CitySchema,
  ShapeSchema,
  CaratSchema,
  ColorSchema,
  ClaritySchema,
  PricingMatrixSchema,
} from '../src/lib/schemas.mjs';

const DATA_DIR = new URL('../data/', import.meta.url);

function loadJson(filename) {
  return JSON.parse(readFileSync(new URL(filename, DATA_DIR), 'utf-8'));
}

function validateArray(filename, schema) {
  const items = loadJson(filename);
  let errors = 0;
  items.forEach((item, i) => {
    const result = schema.safeParse(item);
    if (!result.success) {
      errors++;
      console.error(`✗ ${filename}[${i}] (${item?.slug ?? '?'}) :`);
      for (const issue of result.error.issues) {
        console.error(`    - ${issue.path.join('.')}: ${issue.message}`);
      }
    }
  });
  console.log(`${errors === 0 ? '✓' : '✗'} ${filename} — ${items.length} entrées, ${errors} erreur(s)`);
  return { count: items.length, errors };
}

function validateObject(filename, schema) {
  const data = loadJson(filename);
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`✗ ${filename} :`);
    for (const issue of result.error.issues) {
      console.error(`    - ${issue.path.join('.')}: ${issue.message}`);
    }
    return { errors: result.error.issues.length };
  }
  console.log(`✓ ${filename} — valide`);
  return { errors: 0 };
}

console.log('Validation des données /data (schémas Zod)\n');

const results = [
  validateArray('cities.json', CitySchema),
  validateArray('shapes.json', ShapeSchema),
  validateArray('carats.json', CaratSchema),
  validateArray('colors.json', ColorSchema),
  validateArray('clarity.json', ClaritySchema),
  validateObject('pricing-matrix.json', PricingMatrixSchema),
];

// Vérifications croisées
const cities = loadJson('cities.json');
const t1 = cities.filter((c) => c.tier === 1).length;
const t2 = cities.filter((c) => c.tier === 2).length;
console.log(`\nRépartition villes : ${t1} tier 1, ${t2} tier 2, ${cities.length} total (objectif final : 1000).`);

const totalErrors = results.reduce((sum, r) => sum + r.errors, 0);
if (totalErrors > 0) {
  console.error(`\n${totalErrors} erreur(s) de validation. Build annulé.`);
  process.exit(1);
}
console.log('\nToutes les données sont valides.');
