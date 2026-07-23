import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { cleanSlug } from '../../lib/slug';

// Finnish feed — the EN feed at /rss.xml is the same shape.
export async function GET(context) {
  const posts = (await getCollection('blog', ({ data }) => data.lang === 'fi' && !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  return rss({
    title: 'Esa-Pekka Mattila',
    description: 'T54-luokan pyörätuolikelaaja, 100m. Ajatuksia urheilusta, hallinnosta ja niitä ympäröivistä järjestelmistä.',
    site: context.site,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.summary,
      pubDate: post.data.date,
      link: `/fi/blog/${cleanSlug(post.slug)}/`,
    })),
    customData: '<language>fi-fi</language>',
  });
}
