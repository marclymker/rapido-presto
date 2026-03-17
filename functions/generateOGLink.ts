import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Génère un lien OG Meta Tags pour un produit
 * Utilisé par les composants pour créer des liens shareable avec preview social
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    
    const productId = url.searchParams.get('product_id');
    const shopId = url.searchParams.get('shop_id');
    
    if (!productId || !shopId) {
      return Response.json({ 
        error: 'product_id et shop_id requis' 
      }, { status: 400 });
    }

    // Récupérer le produit et la boutique
    const products = await base44.asServiceRole.entities.Product.filter({ 
      id: productId,
      shop_id: shopId 
    });
    
    if (!products.length) {
      return Response.json({ 
        error: 'Produit non trouvé' 
      }, { status: 404 });
    }

    const product = products[0];
    
    const shops = await base44.asServiceRole.entities.Shop.filter({ 
      id: shopId 
    });
    
    if (!shops.length) {
      return Response.json({ 
        error: 'Boutique non trouvée' 
      }, { status: 404 });
    }

    const shop = shops[0];

    // Générer le lien OG
    const appUrl = Deno.env.get('APP_URL') || 'https://rapido-presto.base44.app';
    
    const ogLink = product.slug && shop.slug
      ? `${appUrl}/og?slug=${shop.slug}&product=${product.slug}`
      : `${appUrl}/og?slug=${shop.slug}&product=${product.id}`;

    return Response.json({
      success: true,
      ogLink,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.promo_price || product.price,
        image: product.image_url
      },
      shop: {
        id: shop.id,
        name: shop.company_name,
        slug: shop.slug
      }
    });
  } catch (error) {
    console.error('Error generating OG link:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});