import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    lang: z.enum(['en', 'fi']),
    category: z.enum(['competition', 'raceday', 'training', 'commercial', 'personal']),
    photo: z.boolean().default(false),
    summary: z.string().optional(),
    draft: z.boolean().default(false),
    image: z.string().optional(),
  }),
});

export const collections = { blog };
