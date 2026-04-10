import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Sanitisation XSS
function sanitizeInput(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, 2000);
}

// Masquage numéros de téléphone (5+ chiffres consécutifs ou formatés)
function maskPhoneNumbers(text) {
  if (!text) return text;
  // Masque les séquences de 5+ chiffres, avec ou sans espaces/tirets entre groupes
  return text.replace(/\b(\d[\s\-.]?){5,}\b/g, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 5) return '***** (numéro masqué)';
    return match;
  });
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const allowedOrigin = Deno.env.get('APP_URL') || origin;

  const headers = {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-id, x-client-secret",
    "Access-Control-Allow-Credentials": "true"
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

    // --- INITIALISATION CONVERSATION ---
    if (action === 'init') {
      const { vendor_id, shop_id, shop_name, shop_logo, product_id, product_name, initial_message } = body;

      const existing = await base44.entities.Conversation.filter({
        customer_id: user.id,
        vendor_id: vendor_id,
        shop_id: shop_id
      });

      if (existing && existing.length > 0) {
        // Si nouvelle conversation sur un produit différent, mettre à jour le contexte
        if (product_id && existing[0].product_context_id !== product_id) {
          await base44.entities.Conversation.update(existing[0].id, {
            product_context_id: product_id,
            last_message: sanitizeInput(initial_message),
            last_message_date: new Date().toISOString()
          });
          // Créer le message initial dans la conv existante
          if (initial_message) {
            await base44.entities.ChatMessage.create({
              conversation_id: existing[0].id,
              sender_id: user.id,
              sender_name: user.full_name || 'Client',
              content: maskPhoneNumbers(sanitizeInput(initial_message)),
              type: 'product',
              is_read: false,
              metadata: { productId: product_id, productName: product_name }
            });
          }
        }
        return new Response(JSON.stringify(existing[0]), { headers });
      }

      const sanitizedMessage = maskPhoneNumbers(sanitizeInput(initial_message));

      const conversation = await base44.entities.Conversation.create({
        customer_id: user.id,
        customer_name: user.full_name || 'Client',
        vendor_id: vendor_id,
        shop_id: shop_id,
        shop_name: shop_name || 'Boutique',
        shop_logo: shop_logo || '',
        last_message: sanitizedMessage,
        last_message_date: new Date().toISOString(),
        product_context_id: product_id || null
      });

      if (sanitizedMessage) {
        await base44.entities.ChatMessage.create({
          conversation_id: conversation.id,
          sender_id: user.id,
          sender_name: user.full_name || 'Client',
          content: sanitizedMessage,
          type: 'text',
          is_read: false
        });
      }

      return new Response(JSON.stringify(conversation), { headers });
    }

    // --- LISTE DES CONVERSATIONS (avec unread_count) ---
    if (action === 'list') {
      // Deux requêtes séparées car $or n'est pas supporté
      const [asCustomer, asVendor] = await Promise.all([
        base44.entities.Conversation.filter({ customer_id: user.id }, '-last_message_date', 50),
        base44.entities.Conversation.filter({ vendor_id: user.id }, '-last_message_date', 50)
      ]);

      // Fusionner et dédupliquer
      const seen = new Set();
      const allConvs = [...asCustomer, ...asVendor].filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      }).sort((a, b) => new Date(b.last_message_date || 0) - new Date(a.last_message_date || 0));

      // Calculer unread_count séquentiellement pour éviter le rate limit
      // On limite aux 10 premières conversations pour éviter trop d'appels
      const withUnread = [];
      for (const conv of allConvs.slice(0, 10)) {
        let unreadCount = 0;
        try {
          const unreadMsgs = await base44.asServiceRole.entities.ChatMessage.filter({
            conversation_id: conv.id,
            sender_id: { $ne: user.id },
            is_read: false
          });
          unreadCount = unreadMsgs.length;
        } catch (_) {}
        withUnread.push({ ...conv, unread_count: unreadCount });
      }
      // Les convs au-delà de 10 sans calcul unread
      for (const conv of allConvs.slice(10)) {
        withUnread.push({ ...conv, unread_count: 0 });
      }

      return new Response(JSON.stringify({ data: withUnread }), { headers });
    }

    // --- MESSAGES D'UNE CONVERSATION ---
    if (action === 'messages') {
      const conversation = await base44.entities.Conversation.get(body.convId);
      if (!conversation || (conversation.customer_id !== user.id && conversation.vendor_id !== user.id)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers });
      }

      const msgs = await base44.entities.ChatMessage.filter(
        { conversation_id: body.convId },
        'created_date',
        100
      );

      // Marquer les messages non lus comme lus
      const unreadFromOther = msgs.filter(m => m.sender_id !== user.id && !m.is_read);
      if (unreadFromOther.length > 0) {
        await Promise.all(unreadFromOther.map(m =>
          base44.asServiceRole.entities.ChatMessage.update(m.id, { is_read: true }).catch(() => {})
        ));
      }

      return new Response(JSON.stringify({ data: msgs }), { headers });
    }

    // --- ENVOI D'UN MESSAGE ---
    if (action === 'send') {
      const conversation = await base44.entities.Conversation.get(body.conversation_id);
      if (!conversation || (conversation.customer_id !== user.id && conversation.vendor_id !== user.id)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers });
      }

      const msgType = body.type || 'text';
      const rawContent = body.content || '';
      const sanitizedContent = maskPhoneNumbers(sanitizeInput(rawContent));
      const metadata = body.metadata || null;

      const messageData = {
        conversation_id: body.conversation_id,
        sender_id: user.id,
        sender_name: user.full_name || 'Utilisateur',
        content: sanitizedContent,
        type: msgType,
        is_read: false
      };
      if (metadata) messageData.metadata = metadata;

      const message = await base44.entities.ChatMessage.create(messageData);

      // Mettre à jour le dernier message de la conversation
      const lastMsgPreview = msgType === 'image' ? '📷 Photo' : msgType === 'product' ? '🛍️ Produit partagé' : sanitizedContent;
      await base44.asServiceRole.entities.Conversation.update(body.conversation_id, {
        last_message: lastMsgPreview,
        last_message_date: new Date().toISOString()
      });

      return new Response(JSON.stringify({ data: message }), { headers });
    }

    // --- PRODUITS DU VENDEUR (pour carte produit) ---
    if (action === 'vendor_products') {
      const conversation = await base44.entities.Conversation.get(body.convId);
      if (!conversation || conversation.vendor_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers });
      }
      const products = await base44.entities.Product.filter({
        shop_id: conversation.shop_id,
        is_available: true
      }, '-created_date', 50);
      return new Response(JSON.stringify({ data: products }), { headers });
    }

    // --- COMPTAGE NON LUS ---
    if (action === 'unread-count') {
      const [asCustomer, asVendor] = await Promise.all([
        base44.entities.Conversation.filter({ customer_id: user.id }),
        base44.entities.Conversation.filter({ vendor_id: user.id })
      ]);
      const seen = new Set();
      const allConvs = [...asCustomer, ...asVendor].filter(c => {
        if (seen.has(c.id)) return false;
        seen.add(c.id);
        return true;
      });

      let totalUnread = 0;
      for (const conv of allConvs) {
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
    console.error('chatService error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
});