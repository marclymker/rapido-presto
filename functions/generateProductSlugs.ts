import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Generate URL-friendly slug from product name
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60); // Limit length
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('=== Generating Product Slugs ===');

    // Get all products
    const products = await base44.asServiceRole.entities.Product.list();
    
    let updatedCount = 0;
    const errors = [];

    for (const product of products) {
      try {
        // Skip if already has slug
        if (product.slug) {
          console.log(`Product ${product.name} already has slug: ${product.slug}`);
          continue;
        }

        let slug = generateSlug(product.name);
        
        // Check if slug exists
        let slugExists = true;
        let counter = 1;
        let finalSlug = slug;
        
        while (slugExists) {
          const existing = await base44.asServiceRole.entities.Product.filter({ slug: finalSlug });
          if (existing.length === 0) {
            slugExists = false;
          } else {
            finalSlug = `${slug}-${counter}`;
            counter++;
          }
        }

        // Update product with slug
        await base44.asServiceRole.entities.Product.update(product.id, {
          slug: finalSlug
        });

        console.log(`✓ Generated slug for ${product.name}: ${finalSlug}`);
        updatedCount++;
      } catch (error) {
        console.error(`Error generating slug for ${product.name}:`, error);
        errors.push({ product_id: product.id, product_name: product.name, error: error.message });
      }
    }

    console.log(`=== Completed: ${updatedCount} slugs generated ===`);

    return Response.json({
      success: true,
      updated: updatedCount,
      total: products.length,
      errors: errors
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});