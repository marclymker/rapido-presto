import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Generate URL-friendly slug from company name
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('=== Generating Shop Slugs ===');

    // Get all shops
    const shops = await base44.asServiceRole.entities.Shop.list();
    
    let updatedCount = 0;
    const errors = [];

    for (const shop of shops) {
      try {
        // Skip if already has slug
        if (shop.slug) {
          console.log(`Shop ${shop.company_name} already has slug: ${shop.slug}`);
          continue;
        }

        let slug = generateSlug(shop.company_name);
        
        // Check if slug exists
        let slugExists = true;
        let counter = 1;
        let finalSlug = slug;
        
        while (slugExists) {
          const existing = await base44.asServiceRole.entities.Shop.filter({ slug: finalSlug });
          if (existing.length === 0) {
            slugExists = false;
          } else {
            finalSlug = `${slug}-${counter}`;
            counter++;
          }
        }

        // Update shop with slug
        await base44.asServiceRole.entities.Shop.update(shop.id, {
          slug: finalSlug
        });

        console.log(`✓ Generated slug for ${shop.company_name}: ${finalSlug}`);
        updatedCount++;
      } catch (error) {
        console.error(`Error generating slug for ${shop.company_name}:`, error);
        errors.push({ shop_id: shop.id, shop_name: shop.company_name, error: error.message });
      }
    }

    console.log(`=== Completed: ${updatedCount} slugs generated ===`);

    return Response.json({
      success: true,
      updated: updatedCount,
      total: shops.length,
      errors: errors
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});