import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const FB_PAGE_ID = Deno.env.get("FACEBOOK_PAGE_ID");
const FB_PAGE_TOKEN = Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN");
const IG_ACCOUNT_ID = Deno.env.get("INSTAGRAM_BUSINESS_ACCOUNT_ID");
const APP_URL = Deno.env.get("APP_URL") || "https://rapidopresto.shop";

async function publishToFacebook(article) {
  const articleUrl = `${APP_URL}/BlogArticle?slug=${article.slug}`;
  const message = `📖 ${article.title}\n\n${article.excerpt || ''}\n\n👉 Lire l'article: ${articleUrl}`;

  const url = `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/feed`;
  const body = {
    message,
    link: articleUrl,
    access_token: FB_PAGE_TOKEN,
  };

  if (article.cover_image_url) {
    // Publier avec photo
    const photoUrl = `https://graph.facebook.com/v19.0/${FB_PAGE_ID}/photos`;
    const photoBody = new FormData();
    photoBody.append('url', article.cover_image_url);
    photoBody.append('caption', message);
    photoBody.append('access_token', FB_PAGE_TOKEN);

    const photoRes = await fetch(photoUrl, { method: 'POST', body: photoBody });
    const photoData = await photoRes.json();
    
    if (!photoRes.ok) {
      console.error('Facebook photo error:', JSON.stringify(photoData));
      throw new Error(photoData.error?.message || 'Erreur publication Facebook');
    }
    return photoData;
  } else {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || 'Erreur publication Facebook');
    }
    return data;
  }
}

async function publishToInstagram(article) {
  if (!IG_ACCOUNT_ID) throw new Error('INSTAGRAM_BUSINESS_ACCOUNT_ID non configuré');
  if (!article.cover_image_url) throw new Error('Image requise pour Instagram');

  const articleUrl = `${APP_URL}/BlogArticle?slug=${article.slug}`;
  const caption = `📖 ${article.title}\n\n${article.excerpt || ''}\n\n👉 Lien en bio | ${articleUrl}`;

  // Étape 1: Créer le container media
  const containerUrl = `https://graph.facebook.com/v19.0/${IG_ACCOUNT_ID}/media`;
  const containerRes = await fetch(containerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: article.cover_image_url,
      caption,
      access_token: FB_PAGE_TOKEN,
    }),
  });
  const containerData = await containerRes.json();
  if (!containerRes.ok) {
    throw new Error(containerData.error?.message || 'Erreur création container Instagram');
  }

  // Étape 2: Publier le media
  const publishUrl = `https://graph.facebook.com/v19.0/${IG_ACCOUNT_ID}/media_publish`;
  const publishRes = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerData.id,
      access_token: FB_PAGE_TOKEN,
    }),
  });
  const publishData = await publishRes.json();
  if (!publishRes.ok) {
    throw new Error(publishData.error?.message || 'Erreur publication Instagram');
  }
  return publishData;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await req.json();
    const { articleId, platforms = ['facebook', 'instagram'] } = body;

    if (!articleId) {
      return Response.json({ error: 'articleId requis' }, { status: 400 });
    }

    // Récupérer l'article
    const articles = await base44.asServiceRole.entities.BlogArticle.filter({ id: articleId });
    const article = articles[0];
    if (!article) {
      return Response.json({ error: 'Article non trouvé' }, { status: 404 });
    }

    const results = {};

    if (platforms.includes('facebook')) {
      try {
        results.facebook = await publishToFacebook(article);
        results.facebook.success = true;
      } catch (err) {
        results.facebook = { success: false, error: err.message };
      }
    }

    if (platforms.includes('instagram')) {
      try {
        results.instagram = await publishToInstagram(article);
        results.instagram.success = true;
      } catch (err) {
        results.instagram = { success: false, error: err.message };
      }
    }

    // Marquer l'article comme publié sur les réseaux
    await base44.asServiceRole.entities.BlogArticle.update(articleId, {
      social_published_at: new Date().toISOString(),
    });

    return Response.json({ success: true, results });

  } catch (error) {
    console.error('publishBlogToSocial error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});