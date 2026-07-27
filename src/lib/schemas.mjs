import { z } from 'zod';

export const CitySchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  insee: z.string().length(5),
  postal_codes: z.array(z.string()).min(1),
  population: z.number().int().positive(),
  department: z.object({ code: z.string(), name: z.string(), slug: z.string() }),
  region: z.object({ name: z.string(), slug: z.string() }),
  lat: z.number(),
  lng: z.number(),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  nearest_partner: z
    .object({ name: z.string(), city: z.string(), postal: z.string(), distance_km: z.number() })
    .nullable(),
  local_merchants: z.array(
    z.object({ name: z.string(), address: z.string(), source: z.string() })
  ),
  nearby_cities: z.array(z.object({ slug: z.string(), name: z.string(), km: z.number() })),
  content_seed: z.number().int(),
});

export const ShapeSchema = z.object({
  slug: z.string(),
  name: z.string(),
  ratio_ideal: z.string(),
  facets: z.number().int().positive(),
  price_factor: z.number().positive(),
  popularity_rank: z.number().int().positive(),
  description_long: z.string().min(20),
});

export const CaratSchema = z.object({
  value: z.number().positive(),
  label: z.string(),
  threshold_effect: z.boolean(),
  note: z.string().optional(),
});

export const ColorSchema = z.object({
  slug: z.string(),
  grade: z.string(),
  label: z.string(),
  category: z.enum(['incolore', 'quasi-incolore', 'teinte-legere', 'fancy']),
});

export const ClaritySchema = z.object({
  slug: z.string(),
  grade: z.string(),
  label: z.string(),
  description: z.string().min(10),
});

const FactorMap = z.object({ _comment: z.string().optional() }).catchall(z.number().positive());

export const PricingMatrixSchema = z.object({
  _disclaimer: z.string().min(10),
  last_review: z.string(),
  currency: z.literal('EUR'),
  base_ct_by_carat_band: FactorMap,
  facteur_couleur: FactorMap,
  facteur_purete: FactorMap,
  facteur_taille: FactorMap,
  facteur_forme: z.object({ _comment: z.string().optional() }),
  facteur_fluorescence: FactorMap,
  facteur_certificat: FactorMap,
  facteur_origine: FactorMap,
  taux_rachat_bas: z.number().min(0).max(1),
  taux_rachat_haut: z.number().min(0).max(1),
  marge_vente: z.number().positive(),
});
