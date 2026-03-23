import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    let shopsUpdated = 0;
    let productsUpdated = 0;

    // Generate shop slugs
    const shops = await base44.asServiceRole.entities.Shop.list();
    for (const shop of shops) {
      if (!shop.slug && shop.company_name) {
        let slug = generateSlug(shop.company_name);
        let counter = 1;
        let finalSlug = slug;
        
        while (true) {
          const existing = await base44.asServiceRole.entities.Shop.filter({ slug: finalSlug });
          if (existing.length === 0) break;
          finalSlug = `${slug}-${counter}`;
          counter++;
        }
        
        await base44.asServiceRole.entities.Shop.update(shop.id, { slug: finalSlug });
        shopsUpdated++;
      }
    }

    // Generate product slugs
    const products = await base44.asServiceRole.entities.Product.list();
    for (const product of products) {
      if (!product.slug && product.name) {
        let slug = generateSlug(product.name);
        let counter = 1;
        let finalSlug = slug;
        
        while (true) {
          const existing = await base44.asServiceRole.entities.Product.filter({ slug: finalSlug });
          if (existing.length === 0) break;
          finalSlug = `${slug}-${counter}`;
          counter++;
        }
        
        await base44.asServiceRole.entities.Product.update(product.id, { slug: finalSlug });
        productsUpdated++;
      }
    }

    return Response.json({
      success: true,
      shopsUpdated,
      productsUpdated
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});