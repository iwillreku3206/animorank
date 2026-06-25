import type { RequestHandler } from './$types';
import { entries } from '$lib/changelog';

// Built from the request origin so the feed stays correct across local,
// staging, and production without hardcoding a domain.
export const prerender = false;

const escapeXml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const rfc822 = (iso: string) => new Date(`${iso}T00:00:00Z`).toUTCString();

export const GET: RequestHandler = ({ url }) => {
  const origin = url.origin;

  const items = entries
    .map(
      (e) => `    <item>
      <title>${escapeXml(e.title)}</title>
      <link>${origin}/changelog#${e.slug}</link>
      <guid isPermaLink="false">${e.slug}</guid>
      <pubDate>${rfc822(e.date)}</pubDate>
      <description>${escapeXml(e.summary)}</description>
    </item>`
    )
    .join('\n');

  const lastBuild = entries[0] ? rfc822(entries[0].date) : new Date().toUTCString();

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss
  version="2.0"
  xmlns:atom="http://www.w3.org/2005/Atom"
>
  <channel>
    <title>AnimoRank changelog</title>
    <link>${origin}/changelog</link>
    <atom:link
      href="${origin}/changelog/rss.xml"
      rel="self"
      type="application/rss+xml"
    />
    <description>New features, improvements, and fixes in AnimoRank.</description>
    <language>en</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      'content-type': 'application/xml',
      'cache-control': 'public, max-age=3600'
    }
  });
};
