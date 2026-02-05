import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { checkRateLimit, rateLimitResponse } from './rateLimiter.js';

// SÉCURITÉ: Fonction de sanitisation XSS
function sanitizeInput(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .slice(0, 2000); // Max 2000 caractères
}

Deno.serve(async (req) => {
  // SÉCURITÉ: CORS restreint à l'origine de l'app
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

  // SÉCURITÉ: Rate limiting 20 messages/minute
  const rateLimit = checkRateLimit(req, 'chat-messages', 20);
  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.retryAfter);
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

      // SÉCURITÉ: Sanitiser le message initial
      const sanitizedMessage = sanitizeInput(initial_message);

      const conversation = await base44.entities.Conversation.create({
        customer_id: user.id,
        customer_name: user.full_name || 'Client',
        vendor_id: vendor_id,
        shop_id: shop_id,
        shop_name: shop_name || 'Boutique',
        shop_logo: shop_logo || '',
        last_message: sanitizedMessage,
        last_message_date: new Date().toISOString(),
        product_context_id: product_id
      });

      await base44.entities.ChatMessage.create({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_name: user.full_name || 'Client',
        content: sanitizedMessage,
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
      // SÉCURITÉ: Vérifier que l'utilisateur a accès à cette conversation
      const conversation = await base44.entities.Conversation.get(body.convId);
      if (!conversation || (conversation.customer_id !== user.id && conversation.vendor_id !== user.id)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers });
      }

      const msgs = await base44.entities.ChatMessage.filter(
        { conversation_id: body.convId },
        'created_date' // Tri ascendant: plus ancien en haut
      );
      return new Response(JSON.stringify({ data: msgs }), { headers });
    }

    // --- LOGIQUE ENVOI ---
    if (action === 'send') {
      // SÉCURITÉ: Vérifier que l'utilisateur a accès à cette conversation
      const conversation = await base44.entities.Conversation.get(body.conversation_id);
      if (!conversation || (conversation.customer_id !== user.id && conversation.vendor_id !== user.id)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers });
      }

      // SÉCURITÉ: Sanitiser le contenu du message
      const sanitizedContent = sanitizeInput(body.content);

      const message = await base44.entities.ChatMessage.create({
        conversation_id: body.conversation_id,
        sender_id: user.id,
        sender_name: user.full_name || 'Utilisateur',
        content: sanitizedContent,
        type: 'text'
      });
      await base44.asServiceRole.entities.Conversation.update(body.conversation_id, {
        last_message: sanitizedContent,
        last_message_date: new Date().toISOString()
      });

      // Déclencher la réponse IA automatique si c'est le client qui envoie
      if (conversation.customer_id === user.id && body.enable_ai !== false) {
        try {
          // Récupérer le contexte produit si disponible
          let productContext = null;
          if (conversation.product_context_id) {
            productContext = await base44.entities.Product.get(conversation.product_context_id);
          }

          // Appeler l'IA (sans attendre la réponse) avec le contenu sanitisé
          base44.functions.invoke('aiChatAssistant', {
            conversation_id: body.conversation_id,
            customer_message: sanitizedContent,
            product_context: productContext
          }).catch(err => console.error('AI response failed:', err));
        } catch (err) {
          console.error('AI trigger error:', err);
        }
      }

      return new Response(JSON.stringify({ data: message }), { headers });
    }

    // --- LOGIQUE COMPTAGE NON LUS ---
    if (action === 'unread-count') {
      // SÉCURITÉ: L'utilisateur ne peut voir que ses propres conversations
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