/**
 * compressImages - Backend function to compress all product/shop images in bulk.
 * Uses Supabase image transformation (w=800, q=75) by rewriting image_url fields.
 * Admin-only.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

// Replace full-res Supabase URLs with compressed transform params
function compressUrl(url) {
  if (!url || typeof url !== 'string') return url;
  // Already has transform params? skip
  if (url.includes('?width=') || url.includes('transform')) return url;
  // Supabase storage URL
  if (url.includes('supabase.co/storage/v1/object/public/')) {
    // Add render/image/authenticated path for transformation
    return url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    ) + '?width=800&quality=75&resize=contain';
  }
  return url;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run !== false; // default dry_run = true for safety

    // ---- Products ----
    const products = await base44.asServiceRole.entities.Product.list('-created_date', 5000);
    let productUpdated = 0;
    let productSkipped = 0;

    for (const product of products) {
      const newImageUrl = compressUrl(product.image_url);
      const changed = newImageUrl !== product.image_url;

      if (changed && !dryRun) {
        await base44.asServiceRole.entities.Product.update(product.id, {
          image_url: newImageUrl
        });
        productUpdated++;
      } else if (changed) {
        productUpdated++; // counting dry-run changes
      } else {
        productSkipped++;
      }
    }

    // ---- Shops (logos) ----
    const shops = await base44.asServiceRole.entities.Shop.list('-created_date', 2000);
    let shopUpdated = 0;
    let shopSkipped = 0;

    for (const shop of shops) {
      const newLogoUrl = compressUrl(shop.company_logo_url);
      const changed = newLogoUrl !== shop.company_logo_url;

      if (changed && !dryRun) {
        await base44.asServiceRole.entities.Shop.update(shop.id, {
          company_logo_url: newLogoUrl
        });
        shopUpdated++;
      } else if (changed) {
        shopUpdated++;
      } else {
        shopSkipped++;
      }
    }

    return Response.json({
      success: true,
      dry_run: dryRun,
      products: { updated: productUpdated, skipped: productSkipped, total: products.length },
      shops: { updated: shopUpdated, skipped: shopSkipped, total: shops.length },
      message: dryRun
        ? `DRY RUN: ${productUpdated} produits + ${shopUpdated} boutiques seraient compressés. Relancez avec dry_run: false pour appliquer.`
        : `✅ ${productUpdated} produits + ${shopUpdated} logos compressés avec succès.`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});