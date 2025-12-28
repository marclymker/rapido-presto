import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // Configuration des accès (CORS)
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-id, x-client-secret",
  };

  if (req.method === "OPTIONS") return new Response("ok", { headers });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Session expirée' }), { status: 401, headers });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // --- 1. INITIALISER UNE CONVERSATION ---
    if (action === 'init') {
      const { vendor_id, shop_id, shop_name, initial_message } = body;
      
      // On cherche si une discussion existe déjà
      const existing = await base44.entities.Conversation.filter({ 
        customer_id: user.id, 
        vendor_id: vendor_id 
      });

      if (existing && existing.length > 0) {
        return new Response(JSON.stringify(existing[0]), { headers });
      }

      // Sinon on la crée
      const conversation = await base44.entities.Conversation.create({
        customer_id: user.id,
        customer_name: user.full_name || 'Client',
        vendor_id: vendor_id,
        shop_id: shop_id,
        shop_name: shop_name || 'Boutique',
        last_message: initial_message,
        last_message_date: new Date().toISOString()
      });

      // On crée le tout premier message
      await base44.entities.ChatMessage.create({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_name: user.full_name || 'Client',
        content: initial_message,
        type: 'text'
      });

      return new Response(JSON.stringify(conversation), { headers });
    }

    // --- 2. LISTER LES DISCUSSIONS (Sidebar) ---
    if (action === 'list') {
      const list = await base44.entities.Conversation.filter({
        $or: [{ customer_id: user.id }, { vendor_id: user.id }]
      });
      return new Response(JSON.stringify({ data: list }), { headers });
    }

    // --- 3. RÉCUPÉRER LES ANCIENS MESSAGES (CORRIGÉ) ---
    if (action === 'messages') {
      // Sécurité : on vérifie les deux noms possibles de variable
      const targetId = body.conversation_id || body.convId;

      if (!targetId) {
        return new Response(JSON.stringify({ data: [], message: "ID manquant" }), { headers });
      }

      const msgs = await base44.entities.ChatMessage.filter(
        { conversation_id: targetId },
        { sort: { created_at: 'asc' } } // 'asc' = du plus ancien au plus récent
      );
      
      return new Response(JSON.stringify({ data: msgs }), { headers });
    }

    // --- 4. ENVOYER UN NOUVEAU MESSAGE ---
    if (action === 'send') {
      const message = await base44.entities.ChatMessage.create({
        conversation_id: body.conversation_id,
        sender_id: user.id,
        sender_name: user.full_name || 'Moi',
        content: body.content,
        type: 'text'
      });

      // On met à jour l'aperçu dans la liste des conversations
      await base44.asServiceRole.entities.Conversation.update(body.conversation_id, {
        last_message: body.content,
        last_message_date: new Date().toISOString()
      });

      return new Response(JSON.stringify({ data: message }), { headers });
    }

    return new Response(JSON.stringify({ error: 'Action inconnue' }), { status: 400, headers });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
});