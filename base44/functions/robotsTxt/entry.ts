/**
 * ROBOTS.TXT DYNAMIQUE
 * 
 * Autorise tous les crawlers
 * Pointe vers le sitemap.xml
 */
Deno.serve((req) => {
  const APP_URL = 'https://rapidopresto.shop';

  const robotsTxt = `User-agent: *
Allow: /

# Sitemap
Sitemap: ${APP_URL}/api/sitemap.xml

# Crawl-delay pour ne pas surcharger
Crawl-delay: 1

# Pages à ne pas indexer
Disallow: /admin
Disallow: /api/
Disallow: /test
`;

  return new Response(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400' // Cache 24h
    }
  });
});