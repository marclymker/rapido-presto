import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-id, x-client-secret",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401, headers });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // --- ACTION : RÉCUPÉRER L'HISTORIQUE (LA PLUS CRITIQUE) ---
    if (action === 'messages') {
      // On récupère l'ID peu importe comment il est nommé (flexibilité totale)
      const convId = body.conversation_id || body.convId;

      if (!convId) {
        return new Response(JSON.stringify({ data: [], error: "ID manquant" }), { headers });
      }

      // On interroge ChatMessage avec un tri forcé du plus vieux au plus récent
      const msgs = await base44.entities.ChatMessage.filter(
        { conversation_id: convId },
        { sort: { created_at: 'asc' } }
      );

      return new Response(JSON.stringify({ data: msgs }), { headers });
    }

    // --- ACTION : LISTER LES CONVERSATIONS (SIDEBAR) ---
    if (action === 'list') {
      const list = await base44.entities.Conversation.filter({
        $or: [{ customer_id: user.id }, { vendor_id: user.id }]
      });
      return new Response(JSON.stringify({ data: list }), { headers });
    }

    // --- ACTION : INITIALISATION ---
    if (action === 'init') {
      const { vendor_id, shop_id, shop_name, shop_logo, initial_message } = body;
      
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
        shop_name: shop_name,
        shop_logo: shop_logo,
        last_message: initial_message,
        last_message_date: new Date().toISOString()
      });

      await base44.entities.ChatMessage.create({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_name: user.full_name || 'Client',
        content: initial_message,
        type: 'text'
      });

      return new Response(JSON.stringify(conversation), { headers });
    }

    // --- ACTION : ENVOI ---
    if (action === 'send') {
      const message = await base44.entities.ChatMessage.create({
        conversation_id: body.conversation_id,
        sender_id: user.id,
        sender_name: user.full_name || 'Moi',
        content: body.content,
        type: 'text'
      });

      await base44.asServiceRole.entities.Conversation.update(body.conversation_id, {
        last_message: body.content,
        last_message_date: new Date().toISOString()
      });

      return new Response(JSON.stringify({ data: message }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Action invalide' }), { status: 400, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
});