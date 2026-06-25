<script
  lang="ts"
  module
>
  export const SITE_NAME = 'AnimoRank';
  export const DEFAULT_TITLE = 'AnimoRank: practice for your DLSU CS courses';
  export const DEFAULT_DESCRIPTION =
    'Free, student-built practice for DLSU Computer Science courses.';
  // Interim: the brand logo on the light variant survives the white background
  // most platforms composite transparent PNGs onto. TODO: swap for a
  // purpose-built, flat 1200x630 image for proper summary_large_image framing.
  export const DEFAULT_OG_IMAGE = '/brand/stacked/animorank_stacked_primary_light.png';
  // Logo for Organization structured data — the light variant reads on Google's
  // white knowledge surfaces.
  const ORG_LOGO = '/brand/icon/animorank_icon_primary_light.png';
  const GITHUB_URL = 'https://github.com/iwillreku3206/animorank';
</script>

<script lang="ts">
  import { page } from '$app/state';

  interface Props {
    /** Page title without the brand suffix. Omit on the landing page to use the
     *  full default title verbatim. */
    title?: string;
    description?: string;
    /** Absolute URL or root-relative path (e.g. "/og/faqs.png"). */
    image?: string;
    /** Keep this page out of search indexes (auth-gated or placeholder pages). */
    noindex?: boolean;
    /** Override the auto-derived canonical URL. */
    canonical?: string;
  }

  let {
    title,
    description = DEFAULT_DESCRIPTION,
    image = DEFAULT_OG_IMAGE,
    noindex = false,
    canonical
  }: Props = $props();

  let fullTitle = $derived(title ? `${title} — ${SITE_NAME}` : DEFAULT_TITLE);

  let origin = $derived(page.url.origin);
  // Canonical drops query strings and the trailing slash so variants collapse to
  // one URL.
  let canonicalUrl = $derived(
    canonical ?? `${origin}${page.url.pathname.replace(/\/$/, '') || '/'}`
  );
  let absoluteImage = $derived(/^https?:\/\//.test(image) ? image : `${origin}${image}`);

  // Sitewide Organization + WebSite graph. Emitted on every page; search engines
  // de-duplicate by @id.
  let structuredData = $derived(
    JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${origin}/#organization`,
          name: SITE_NAME,
          url: origin,
          logo: `${origin}${ORG_LOGO}`,
          sameAs: [GITHUB_URL]
        },
        {
          '@type': 'WebSite',
          '@id': `${origin}/#website`,
          name: SITE_NAME,
          url: origin,
          description: DEFAULT_DESCRIPTION,
          publisher: { '@id': `${origin}/#organization` }
        }
      ]
    })
  );
</script>

<svelte:head>
  <title>{fullTitle}</title>
  <meta
    name="description"
    content={description}
  />
  <link
    rel="canonical"
    href={canonicalUrl}
  />
  {#if noindex}
    <meta
      name="robots"
      content="noindex, follow"
    />
  {/if}

  <!-- Open Graph -->
  <meta
    property="og:type"
    content="website"
  />
  <meta
    property="og:site_name"
    content={SITE_NAME}
  />
  <meta
    property="og:title"
    content={fullTitle}
  />
  <meta
    property="og:description"
    content={description}
  />
  <meta
    property="og:url"
    content={canonicalUrl}
  />
  <meta
    property="og:image"
    content={absoluteImage}
  />

  <!-- Twitter / X -->
  <meta
    name="twitter:card"
    content="summary_large_image"
  />
  <meta
    name="twitter:title"
    content={fullTitle}
  />
  <meta
    name="twitter:description"
    content={description}
  />
  <meta
    name="twitter:image"
    content={absoluteImage}
  />

  <!-- Organization + WebSite structured data -->
  {@html `<script type="application/ld+json">${structuredData}</script>`}
</svelte:head>
