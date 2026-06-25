import type { RequestHandler } from './$types';

// Only public, indexable pages belong here. Auth-gated routes (problem sets,
// editor, instructor, dashboard) and thin placeholders (about) are marked
// noindex via <Seo noindex>, so they're intentionally excluded.
const ROUTES: { path: string; changefreq: string; priority: string }[] = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/changelog', changefreq: 'weekly', priority: '0.6' },
  { path: '/faqs', changefreq: 'monthly', priority: '0.7' },
  { path: '/legal/privacy-policy', changefreq: 'yearly', priority: '0.3' },
  { path: '/legal/terms-of-service', changefreq: 'yearly', priority: '0.3' }
];

export const prerender = false;

export const GET: RequestHandler = ({ url }) => {
  const urls = ROUTES.map(
    ({ path, changefreq, priority }) => `  <url>
    <loc>${url.origin}${path}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`
  ).join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  return new Response(body, {
    headers: {
      'content-type': 'application/xml',
      'cache-control': 'public, max-age=3600'
    }
  });
};
