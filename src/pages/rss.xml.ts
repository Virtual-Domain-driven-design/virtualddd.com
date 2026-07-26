/** The feed.
 *
 * The old /feed/ was last built in March 2024 and contained only six
 * ddd-crew posts, because the custom post types were excluded from it — so
 * subscribers have had nothing for two years. This one carries what the site
 * is actually about: sessions and stories, newest first. `/feed/` redirects
 * here in .htaccess so existing subscribers are not dropped.
 */
import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { excerpt } from '../lib/excerpt';
import { SITE_NAME, SITE_TAGLINE } from '../lib/seo';

export async function GET(context: APIContext) {
  const sessions = (await getCollection('sessions')).map((s) => ({
    title: s.data.title,
    pubDate: new Date(s.data.datetime),
    link: `/sessions/${s.id}/`,
    description:
      s.data.seoMetadescription ?? excerpt(s.body ?? '', `${s.data.title} — a Virtual DDD online session.`, 300),
    categories: ['Online session', ...s.data.tags],
  }));

  const stories = (await getCollection('stories')).map((s) => ({
    title: s.data.title,
    pubDate: s.data.publishedDate ? new Date(s.data.publishedDate) : new Date(0),
    link: `/facilitating-archdes/${s.id}/`,
    description: s.data.seoMetadescription ?? excerpt(s.body ?? '', s.data.title, 300),
    categories: ['Facilitating Stories', ...s.data.tags],
  }));

  const items = [...sessions, ...stories]
    .filter((i) => +i.pubDate > 0)
    .sort((a, b) => +b.pubDate - +a.pubDate)
    .slice(0, 50);

  return rss({
    title: `${SITE_NAME} — sessions and stories`,
    description: SITE_TAGLINE,
    site: context.site ?? 'https://virtualddd.com',
    items,
    customData: '<language>en-gb</language>',
  });
}
