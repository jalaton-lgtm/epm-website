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
    // Where to anchor `image` when it is cropped into the 16/10 teaser box on
    // the home and blog index pages. A CSS object-position value; omit it and
    // PhotoSlot centres the photo.
    //
    // This lives with the post rather than at the four call sites because it
    // is a fact about the photograph, not about the layout. DSC_5475verkko.jpg
    // is a 1280x1600 portrait: cropped to 16/10 it shows only the middle 800px
    // of its height, which starts below the chin — so the teaser was all torso
    // and racing chair with EP's face cut off entirely. Hardcoding the fix in
    // the templates would then misframe whatever photo the next post uses.
    imagePosition: z.string().optional(),
  }),
});

export const collections = { blog };
