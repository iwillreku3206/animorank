import { Feed } from 'feed';
import type { RequestHandler } from './$types';
import { entries } from '$lib/changelog';

// Built from the request origin so the feed stays correct across local,
// staging, and production without hardcoding a domain.
export const prerender = false;

// Entry dates are YYYY-MM-DD; pin to UTC midnight so toUTCString() is stable
// regardless of the server's local timezone.
const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

export const GET: RequestHandler = ({ url }) => {
  const origin = url.origin;

  const feed = new Feed({
    title: 'AnimoRank changelog',
    description: 'New features, improvements, and fixes in AnimoRank.',
    id: `${origin}/changelog`,
    link: `${origin}/changelog`,
    language: 'en',
    feedLinks: { rss: `${origin}/changelog/rss.xml` },
    // Drives <lastBuildDate>; entries are newest-first.
    updated: entries[0] ? toDate(entries[0].date) : new Date()
  });

  for (const e of entries) {
    feed.addItem({
      title: e.title,
      // Rendered as <guid isPermaLink="false">slug</guid>.
      id: e.slug,
      link: `${origin}/changelog#${e.slug}`,
      date: toDate(e.date),
      description: e.summary
    });
  }

  return new Response(feed.rss2(), {
    headers: {
      'content-type': 'application/xml',
      'cache-control': 'public, max-age=3600'
    }
  });
};
