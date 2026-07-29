import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const guides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/guides' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      pubDate: z.coerce.date(),
      cluster: z.string(),
      heroImage: image().optional(),
      heroImageAlt: z.string().optional(),
    }),
});

export const collections = { guides };
