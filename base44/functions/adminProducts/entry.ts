import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, data, productId, shopId } = await req.json();

    // Vérifie si l'utilisateur est admin OU propriétaire de la boutique concernée
    const isAdmin = user.role === 'admin';
    let isShopOwner = false;

    if (productId && !isAdmin) {
      // Pour delete/update d'un produit spécifique, vérifier la propriété
      const product = await base44.asServiceRole.entities.Product.get(productId);
      if (product?.shop_id) {
        const shop = await base44.asServiceRole.entities.Shop.get(product.shop_id);
        isShopOwner = shop?.user_id === user.id;
      }
    } else if (shopId && !isAdmin) {
      // Pour list d'une boutique, vérifier la propriété
      const shop = await base44.asServiceRole.entities.Shop.get(shopId);
      isShopOwner = shop?.user_id === user.id;
    }

    if (!isAdmin && !isShopOwner) {
      return Response.json({ error: 'Unauthorized - vous devez être admin ou propriétaire de la boutique' }, { status: 403 });
    }

    switch (action) {
      case 'list':
        const products = await base44.asServiceRole.entities.Product.filter({ shop_id: shopId });
        return Response.json({ products });

      case 'create':
        const newProduct = await base44.asServiceRole.entities.Product.create(data);
        return Response.json({ product: newProduct });

      case 'update':
        const updatedProduct = await base44.asServiceRole.entities.Product.update(productId, data);
        return Response.json({ product: updatedProduct });

      case 'delete':
        await base44.asServiceRole.entities.Product.delete(productId);
        return Response.json({ success: true });

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});