import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Force 800px / qualité 80% sur toutes les URLs d'images
function forceCompress(url) {
  if (!url) return url;
  // Supprimer les anciens paramètres w= et q= s'ils existent
  let base = url.split('?')[0];
  const params = new URLSearchParams(url.includes('?') ? url.split('?')[1] : '');
  params.set('w', '800');
  params.set('q', '80');
  return `${base}?${params.toString()}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const products = await base44.asServiceRole.entities.Product.list();

    let compressed = 0;
    let failed = 0;
    const errors = [];

    for (const product of products) {
      try {
        const updates = {};

        if (product.image_url) {
          updates.image_url = forceCompress(product.image_url);
        }

        if (product.additional_images && Array.isArray(product.additional_images) && product.additional_images.length > 0) {
          updates.additional_images = product.additional_images.map(forceCompress);
        }

        if (Object.keys(updates).length > 0) {
          await base44.asServiceRole.entities.Product.update(product.id, updates);
          compressed++;
        }
      } catch (error) {
        failed++;
        errors.push({ product_id: product.id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      total: products.length,
      compressed,
      failed,
      errors: errors.slice(0, 10)
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});