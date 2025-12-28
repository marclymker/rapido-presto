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
    if (!user) return new Response(JSON.stringify({ error: 'Auth requise' }), { status: 401, headers });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    // --- RÉCUPÉRER L'HISTORIQUE ---
    if (action === 'messages') {
      // On prend l'ID, peu importe comment le frontend l'appelle
      const id = body.conversation_id || body.convId || body.id;
      
      const msgs = await base44.entities.ChatMessage.filter(
        { conversation_id: id },
        { sort: { created_at: 'asc' } }
      );
      
      // On renvoie un format TRÈS simple
      return new Response(JSON.stringify({ data: msgs }), { headers });
    }

    // --- LISTER LES DISCUSSIONS ---
    if (action === 'list') {
      const list = await base44.entities.Conversation.filter({
        $or: [{ customer_id: user.id }, { vendor_id: user.id }]
      });
      return new Response(JSON.stringify({ data: list }), { headers });
    }

    // --- ENVOYER UN MESSAGE ---
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

    return new Response(JSON.stringify({ error: 'Action inconnue' }), { status: 400, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers });
  }
});