import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get all products with images
    const products = await base44.asServiceRole.entities.Product.list();
    
    let compressed = 0;
    let failed = 0;
    const errors = [];

    for (const product of products) {
      if (!product.image_url) continue;
      
      try {
        // Ajouter les paramètres de compression si pas déjà présents
        if (!product.image_url.includes('w=') && !product.image_url.includes('q=')) {
          const separator = product.image_url.includes('?') ? '&' : '?';
          const compressedUrl = `${product.image_url}${separator}w=800&q=80`;
          
          await base44.asServiceRole.entities.Product.update(product.id, {
            image_url: compressedUrl
          });
          
          compressed++;
        }

        // Compress additional images if present
        if (product.additional_images && Array.isArray(product.additional_images)) {
          const compressedAdditional = product.additional_images.map(url => {
            if (!url.includes('w=') && !url.includes('q=')) {
              const separator = url.includes('?') ? '&' : '?';
              return `${url}${separator}w=800&q=80`;
            }
            return url;
          });

          await base44.asServiceRole.entities.Product.update(product.id, {
            additional_images: compressedAdditional
          });
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
      errors: errors.slice(0, 10) // Limit errors to first 10
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});