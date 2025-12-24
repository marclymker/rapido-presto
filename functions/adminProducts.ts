import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 401 });
    }

    const { action, data, productId, shopId } = await req.json();

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