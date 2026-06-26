import type { RequestHandler } from './$types';

// Served at /robots.txt. Built from the request origin so it stays correct
// across local, staging, and production without hardcoding a domain.
export const prerender = false;

export const GET: RequestHandler = ({ url }) => {
  const body = `User-agent: *
Allow: /
Disallow: /problemSets
Disallow: /problem/
Disallow: /edit/
Disallow: /instructor/
Disallow: /dashboard
Disallow: /tos
Disallow: /dev/

Sitemap: ${url.origin}/sitemap.xml
`;

  return new Response(body, {
    headers: {
      'content-type': 'text/plain',
      'cache-control': 'public, max-age=3600'
    }
  });
};
