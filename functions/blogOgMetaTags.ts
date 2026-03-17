import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Génère les meta tags Open Graph pour les articles de blog
 * Détecte les crawlers et sert du HTML statique
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    
    const articleSlug = url.searchParams.get('slug');
    
    if (!articleSlug) {
      return new Response('Article slug required', { status: 400 });
    }

    // Détecter les crawlers
    const userAgent = req.headers.get('user-agent') || '';
    const isCrawler = /facebookexternalhit|whatsapp|twitterbot|telegrambot|linkedinbot|slackbot|pinterest|vkshare|iframely/i.test(userAgent);

    // Charger l'article
    const articles = await base44.asServiceRole.entities.BlogArticle.filter({ 
      slug: articleSlug, 
      is_published: true 
    });
    
    const article = articles[0];
    
    if (!article) {
      return new Response('Article not found', { status: 404 });
    }

    const pageTitle = article.title;
    const pageDescription = article.seo_description || article.excerpt || article.content.substring(0, 160);
    const pageImage = article.cover_image;
    const pageUrl = `${url.origin}/BlogArticle?slug=${articleSlug}`;

    if (isCrawler) {
      const escapeHtml = (str) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
      
      const safeTitle = escapeHtml(pageTitle);
      const safeDescription = escapeHtml(pageDescription);

      const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeTitle}</title>
  
  <meta property="og:title" content="${safeTitle}">
  <meta property="og:description" content="${safeDescription}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:type" content="article">
  ${pageImage ? `<meta property="og:image" content="${pageImage}?w=1200&h=630&fit=crop&q=75">` : ''}
  
  <meta name="description" content="${safeDescription}">
  <meta property="og:site_name" content="Rapido Presto Blog">
  <meta property="og:locale" content="fr_HT">
  ${pageImage ? `
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${safeTitle}">
  ` : ''}
  
  <meta property="article:published_time" content="${article.published_date}">
  <meta property="article:author" content="${article.author || 'Rapido Presto'}">
  
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:site" content="@RapidoPrestoHT">
  <meta name="twitter:title" content="${safeTitle}">
  <meta name="twitter:description" content="${safeDescription}">
  ${pageImage ? `<meta name="twitter:image" content="${pageImage}?w=1200&h=630&fit=crop&q=75">` : ''}
  
  <script>
    if (typeof navigator !== 'undefined' && !/facebookexternalhit|whatsapp|twitterbot|telegrambot|linkedinbot|slackbot|pinterest|vkshare|iframely/i.test(navigator.userAgent)) {
      setTimeout(function() {
        window.location.href = '${pageUrl}';
      }, 1000);
    }
  </script>
</head>
<body style="margin: 0; padding: 0; font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">
    <h1 style="margin-top: 20px; color: #333;">${safeTitle}</h1>
    <p style="color: #666; line-height: 1.6;">${safeDescription}</p>
    ${pageImage ? `<img src="${pageImage}" alt="${safeTitle}" style="max-width: 100%; height: auto; margin: 20px 0; border-radius: 8px;">` : ''}
    <p style="margin-top: 30px;"><a href="${pageUrl}" style="background: #FF9900; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Lire l'article complet</a></p>
  </div>
</body>
</html>`;

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    }

    // Pour les utilisateurs normaux, rediriger
    return Response.redirect(pageUrl, 302);

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});