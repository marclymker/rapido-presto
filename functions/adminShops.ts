import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { checkRateLimit, rateLimitResponse } from './rateLimiter.js';

Deno.serve(async (req) => {
  try {
    // SÉCURITÉ: Rate limiting
    const rateLimit = checkRateLimit(req, 'admin-shops', 60);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // SÉCURITÉ: Vérification stricte admin
    if (!user || user.role !== 'admin') {
      console.error(`Unauthorized admin access attempt by user ${user?.id || 'unknown'}`);
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { action, data, shopId } = await req.json();

    switch (action) {
      case 'list':
        const shops = await base44.asServiceRole.entities.Shop.list('-created_date');
        return Response.json({ shops });

      case 'create':
        const newShop = await base44.asServiceRole.entities.Shop.create(data);
        return Response.json({ shop: newShop });

      case 'update':
        const updatedShop = await base44.asServiceRole.entities.Shop.update(shopId, data);
        return Response.json({ shop: updatedShop });

      case 'delete':
        await base44.asServiceRole.entities.Shop.delete(shopId);
        return Response.json({ success: true });

      case 'listEnterpriseUsers':
        const allUsers = await base44.asServiceRole.entities.User.list();
        const enterpriseUsers = allUsers.filter(u => u.profiles?.entreprise?.is_active);
        return Response.json({ users: enterpriseUsers });

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});