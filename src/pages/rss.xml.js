import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { cleanSlug } from '../lib/slug';

// English feed. The FI feed at /fi/rss.xml is the same shape with the other
// language filter and base path — kept as two files rather than one
// parameterised route because there are only two languages and the
// duplication is a handful of lines.
export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => data.lang === 'en' && !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'Esa-Pekka Mattila',
    description: 'T54 wheelchair racer, 100m. Notes on racing, governance, and the systems around both.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      link: `/blog/${cleanSlug(post.slug)}/`,
    })),
    customData: '<language>en-us</language>',
  });
}
