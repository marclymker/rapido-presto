import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Non authentifié' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const url = new URL(req.url);
    // On supporte l'action dans le body (POST) ou dans l'URL (GET)
    const action = body.action || url.searchParams.get('action');

    // --- INITIALISER ---
    if (action === 'init') {
      const { vendor_id, shop_id, shop_name, shop_logo, product_id, product_name, initial_message } = body;

      // On filtre par les deux participants pour être sûr
      const existing = await base44.entities.Conversation.filter({
        customer_id: user.id,
        vendor_id: vendor_id
      });

      if (existing && existing.length > 0) {
        return Response.json(existing[0]); // Retour direct de l'objet
      }

      const conversation = await base44.entities.Conversation.create({
        customer_id: user.id,
        customer_name: user.full_name,
        vendor_id: vendor_id,
        shop_id: shop_id,
        shop_name: shop_name || "Boutique",
        shop_logo: shop_logo,
        last_message: initial_message,
        last_message_date: new Date().toISOString()
      });

      await base44.entities.ChatMessage.create({
        conversation_id: conversation.id,
        sender_id: user.id,
        content: initial_message,
        type: 'text',
        metadata: { product_id, product_name }
      });

      return Response.json(conversation);
    }

    // --- LISTER ---
    if (action === 'list') {
      const list = await base44.entities.Conversation.filter({
        $or: [{ customer_id: user.id }, { vendor_id: user.id }]
      });
      return Response.json({ data: list });
    }

    // --- MESSAGES ---
    if (action === 'messages') {
      const convId = body.convId || url.searchParams.get('convId');
      const msgs = await base44.entities.ChatMessage.filter({ conversation_id: convId });
      return Response.json({ data: msgs });
    }

    // --- ENVOYER ---
    if (action === 'send') {
      const { conversation_id, content, type, metadata } = body;
      
      // Sécurité anti-numéro
      if (/(\+?\d[\s\-\.]?){8,}/g.test(content)) {
        return Response.json({ error: 'Partage de numéro interdit' }, { status: 403 });
      }

      const message = await base44.entities.ChatMessage.create({
        conversation_id,
        sender_id: user.id,
        content,
        type: type || 'text',
        metadata: metadata || {}
      });

      await base44.asServiceRole.entities.Conversation.update(conversation_id, {
        last_message: content,
        last_message_date: new Date().toISOString()
      });

      return Response.json({ data: message });
    }

    return Response.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});