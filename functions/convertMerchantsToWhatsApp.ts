import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all shops
    const shops = await base44.asServiceRole.entities.Shop.list();
    
    let convertedCount = 0;
    const errors = [];

    for (const shop of shops) {
      try {
        let phone = shop.phone;
        
        // Skip if no phone
        if (!phone) continue;
        
        // Remove all spaces, dashes, and parentheses
        phone = phone.replace(/[\s\-()]/g, '');
        
        // Check if already in international format
        if (phone.startsWith('+509')) {
          continue; // Already converted
        }
        
        // Remove leading 509 if present
        if (phone.startsWith('509')) {
          phone = phone.substring(3);
        }
        
        // Remove leading zero if present
        if (phone.startsWith('0')) {
          phone = phone.substring(1);
        }
        
        // Add +509 prefix
        const whatsappNumber = `+509${phone}`;
        
        // Validate format (should be +509 followed by 8 digits)
        if (!/^\+509\d{8}$/.test(whatsappNumber)) {
          errors.push({ shop_id: shop.id, phone: shop.phone, reason: 'Invalid format' });
          continue;
        }
        
        // Update shop
        await base44.asServiceRole.entities.Shop.update(shop.id, {
          phone: whatsappNumber
        });
        
        convertedCount++;
      } catch (error) {
        errors.push({ shop_id: shop.id, phone: shop.phone, error: error.message });
      }
    }

    return Response.json({
      success: true,
      converted: convertedCount,
      total: shops.length,
      errors: errors
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});