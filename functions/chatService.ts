import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // Gestion du CORS pour autoriser les appels depuis le navigateur
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-id, x-client-secret",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // --- LOGIQUE INITIALISATION ---
    if (action === 'init') {
      const { vendor_id, shop_id, shop_name, shop_logo, product_id, product_name, initial_message } = body;

      const existing = await base44.entities.Conversation.filter({
        customer_id: user.id,
        vendor_id: vendor_id,
        shop_id: shop_id
      });

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify(existing[0]), { headers });
      }

      const conversation = await base44.entities.Conversation.create({
        customer_id: user.id,
        customer_name: user.full_name || 'Client',
        vendor_id: vendor_id,
        shop_id: shop_id,
        shop_name: shop_name || 'Boutique',
        shop_logo: shop_logo || '',
        last_message: initial_message,
        last_message_date: new Date().toISOString(),
        product_context_id: product_id
      });

      await base44.entities.ChatMessage.create({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_name: user.full_name || 'Client',
        content: initial_message,
        type: 'text',
        is_read: false
      });

      return new Response(JSON.stringify(conversation), { headers });
    }

    // --- LOGIQUE LISTE ---
    if (action === 'list') {
      const list = await base44.entities.Conversation.filter({
        $or: [{ customer_id: user.id }, { vendor_id: user.id }]
      });
      return new Response(JSON.stringify({ data: list }), { headers });
    }

    // --- LOGIQUE MESSAGES ---
    if (action === 'messages') {
      const msgs = await base44.entities.ChatMessage.filter(
        { conversation_id: body.convId },
        'created_date' // Tri ascendant: plus ancien en haut
      );
      return new Response(JSON.stringify({ data: msgs }), { headers });
    }

    // --- LOGIQUE ENVOI ---
    if (action === 'send') {
      const message = await base44.entities.ChatMessage.create({
        conversation_id: body.conversation_id,
        sender_id: user.id,
        sender_name: user.full_name || 'Utilisateur',
        content: body.content,
        type: 'text'
      });
      await base44.asServiceRole.entities.Conversation.update(body.conversation_id, {
        last_message: body.content,
        last_message_date: new Date().toISOString()
      });
      return new Response(JSON.stringify({ data: message }), { headers });
    }

    // --- LOGIQUE COMPTAGE NON LUS ---
    if (action === 'unread-count') {
      const conversations = await base44.entities.Conversation.filter({
        $or: [{ customer_id: user.id }, { vendor_id: user.id }]
      });

      let totalUnread = 0;
      for (const conv of conversations) {
        const unread = await base44.entities.ChatMessage.filter({
          conversation_id: conv.id,
          sender_id: { $ne: user.id },
          is_read: false
        });
        totalUnread += unread.length;
      }

      return new Response(JSON.stringify({ unreadCount: totalUnread }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
});