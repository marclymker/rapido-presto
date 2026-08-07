import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * publishProductToInstagram
 * Déclenché à la création d'un nouveau produit. Publie une photo du produit
 * sur le feed Instagram Business de Rapido Presto (image + caption avec
 * prix, description, hashtags et lien produit).
 */
const IG_API = 'https://graph.instagram.com/v21.0';

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // L'automation d'entité envoie { event, data, old_data, changed_fields }
    // Accepter aussi { productId } pour appels manuels
    const productId = payload?.event?.entity_id || payload?.productId || payload?.data?.id;
    if (!productId) {
      return Response.json({ error: 'productId required' }, { status: 400, headers });
    }

    // Charger le produit
    let product = payload?.data;
    if (!product || payload?.payload_too_large) {
      const products = await base44.asServiceRole.entities.Product.filter({ id: productId });
      product = products?.[0];
    }
    if (!product) {
      return Response.json({ error: 'Product not found', productId }, { status: 404, headers });
    }

    // Ne publier que les produits disponibles avec une image
    if (product.is_available === false) {
      return Response.json({ skipped: true, reason: 'product not available', productId }, { headers });
    }
    const imageUrl = product.image_url || (product.additional_images && product.additional_images[0]);
    if (!imageUrl) {
      return Response.json({ skipped: true, reason: 'no image', productId }, { headers });
    }

    // Récupérer le token Instagram via le connecteur
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('instagram');
    if (!accessToken) {
      return Response.json({ error: 'Instagram not connected' }, { status: 500, headers });
    }

    // 1) Obtenir l'Instagram user id
    const meRes = await fetch(`${IG_API}/me?fields=id,username&access_token=${encodeURIComponent(accessToken)}`);
    const meData = await meRes.json();
    if (!meData?.id) {
      return Response.json({ error: 'Cannot resolve Instagram user id', meData }, { status: 500, headers });
    }
    const igUserId = meData.id;

    // 2) Construire la caption
    const appUrl = (Deno.env.get('APP_URL') || 'https://rapido-presto.base44.app').replace(/\/$/, '');
    const slug = product.slug || product.id;
    const productUrl = `${appUrl}/product/${slug}`;
    const price = product.promo_price && product.promo_price < product.price
      ? `${product.promo_price} HTG (promo! au lieu de ${product.price} HTG)`
      : `${product.price} HTG`;
    const shopPart = product.shop_name ? `\n📍 ${product.shop_name}` : '';
    const catPart = product.category ? ` #${String(product.category).replace(/[^a-zA-Z0-9]/g, '')}` : '';
    const desc = (product.description || '').replace(/<[^>]+>/g, '').substring(0, 800);

    const caption = [
      `🛍️ ${product.name}`,
      `💰 ${price}`,
      shopPart,
      desc ? `\n${desc}` : '',
      `\n\n🛒 Commande ici: ${productUrl}`,
      `\n#RapidoPresto #Haiti #Marketplace${catPart} #AchatEnLigne`
    ].join('').substring(0, 2200);

    // 3) Créer le conteneur média (image_url doit être public)
    const createRes = await fetch(`${IG_API}/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken
      })
    });
    const createData = await createRes.json();
    if (!createData?.id) {
      return Response.json({
        error: 'Failed to create media container',
        instagram: createData
      }, { status: 502, headers });
    }
    const creationId = createData.id;

    // 4) Publier le conteneur
    const publishRes = await fetch(`${IG_API}/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: creationId,
        access_token: accessToken
      })
    });
    const publishData = await publishRes.json();

    return Response.json({
      success: !!publishData?.id,
      productId,
      mediaId: publishData?.id,
      instagram: publishData
    }, { status: publishRes.ok ? 200 : 502, headers });
  } catch (error) {
    console.error('publishProductToInstagram error:', error);
    return Response.json({ error: error.message }, { status: 500, headers });
  }
});