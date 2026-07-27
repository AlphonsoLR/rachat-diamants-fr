// Moteur de barème — cf. brief §03. Toutes les sorties sont des fourchettes, jamais un chiffre unique.
import pricingMatrix from '../../data/pricing-matrix.json';
import shapes from '../../data/shapes.json';

export interface PriceRange {
  low: number;
  high: number;
}

export interface EstimateInput {
  carat: number;
  colorSlug?: string;
  claritySlug?: string;
  shapeSlug?: string;
  cutSlug?: keyof typeof pricingMatrix.facteur_taille;
  fluorescenceSlug?: keyof typeof pricingMatrix.facteur_fluorescence;
  certificatSlug?: keyof typeof pricingMatrix.facteur_certificat;
  origineSlug?: 'naturel' | 'synthese';
}

function getCaratBandKey(carat: number): string {
  const bands = Object.keys(pricingMatrix.base_ct_by_carat_band).filter((k) => k !== '_comment');
  for (const band of bands) {
    if (band.endsWith('+')) {
      const min = parseFloat(band);
      if (carat >= min) return band;
      continue;
    }
    const [min, max] = band.split('-').map(Number);
    if (carat >= min && carat <= max) return band;
  }
  return bands[0];
}

export function estimate(input: EstimateInput): { retail: PriceRange; rachat: PriceRange } {
  const {
    carat,
    colorSlug = 'g',
    claritySlug = 'vs1',
    shapeSlug = 'rond-brillant',
    cutSlug = 'excellent',
    fluorescenceSlug = 'none',
    certificatSlug = 'gia',
    origineSlug = 'naturel',
  } = input;

  const bandKey = getCaratBandKey(carat);
  const baseCt = (pricingMatrix.base_ct_by_carat_band as Record<string, number>)[bandKey];

  const shape = shapes.find((s) => s.slug === shapeSlug) ?? shapes[0];

  const facteurCouleur = (pricingMatrix.facteur_couleur as Record<string, number>)[colorSlug] ?? 1;
  const facteurPurete = (pricingMatrix.facteur_purete as Record<string, number>)[claritySlug] ?? 1;
  const facteurTaille = (pricingMatrix.facteur_taille as Record<string, number>)[cutSlug] ?? 1;
  const facteurFluo =
    (pricingMatrix.facteur_fluorescence as Record<string, number>)[fluorescenceSlug] ?? 1;
  const facteurCertif =
    (pricingMatrix.facteur_certificat as Record<string, number>)[certificatSlug] ?? 1;
  const facteurOrigine =
    (pricingMatrix.facteur_origine as Record<string, number>)[origineSlug] ?? 1;

  const prixRetailEstime =
    baseCt *
    facteurCouleur *
    facteurPurete *
    facteurTaille *
    shape.price_factor *
    facteurFluo *
    facteurCertif *
    facteurOrigine *
    carat;

  return {
    retail: { low: Math.round(prixRetailEstime * 0.95), high: Math.round(prixRetailEstime * 1.05) },
    rachat: {
      low: Math.round(prixRetailEstime * pricingMatrix.taux_rachat_bas),
      high: Math.round(prixRetailEstime * pricingMatrix.taux_rachat_haut),
    },
  };
}

export function formatEUR(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    value
  );
}

export function formatRange(range: PriceRange): string {
  return `${formatEUR(range.low)} – ${formatEUR(range.high)}`;
}
