import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const { searchParams } = url;

    // Vérifier l'authentification
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // ENVOYER UN MESSAGE
    if (req.method === 'POST') {
      const { conversation_id, content, type, metadata } = await req.json();

      // SÉCURITÉ : Anti-numéros de téléphone
      const phoneRegex = /(\+?\d[\s\-\.]?){8,}/g;
      if (phoneRegex.test(content)) {
        return Response.json({ 
          error: 'Action bloquée : Le partage de numéros de téléphone est interdit pour votre sécurité.' 
        }, { status: 403 });
      }

      // Récupérer la conversation pour déterminer le rôle
      const convs = await base44.entities.Conversation.filter({ id: conversation_id });
      if (!convs || convs.length === 0) {
        return Response.json({ error: 'Conversation introuvable' }, { status: 404 });
      }
      
      const conv = convs[0];
      const isVendor = conv.vendor_id === user.id;
      const isCustomer = conv.customer_id === user.id;

      if (!isVendor && !isCustomer) {
        return Response.json({ error: 'Non autorisé' }, { status: 403 });
      }

      // RESTRICTION : Vendeur ne peut pas envoyer de photos
      if (isVendor && type === 'image') {
        return Response.json({ 
          error: 'Les vendeurs ne peuvent pas envoyer de photos. Partagez un article de votre boutique.' 
        }, { status: 403 });
      }

      // RESTRICTION : Client ne peut pas partager de produits
      if (isCustomer && type === 'product') {
        return Response.json({ error: 'Action non autorisée.' }, { status: 403 });
      }

      // Créer le message
      const message = await base44.entities.ChatMessage.create({
        conversation_id,
        sender_id: user.id,
        sender_name: user.full_name,
        content,
        type: type || 'text',
        metadata: metadata || {},
        is_read: false
      });

      // Mettre à jour la conversation
      await base44.asServiceRole.entities.Conversation.update(conversation_id, {
        last_message: content.substring(0, 50),
        last_message_date: new Date().toISOString()
      });

      return Response.json(message);
    }

    // LISTER LES CONVERSATIONS
    if (req.method === 'GET' && searchParams.get('action') === 'list') {
      const conversations = await base44.entities.Conversation.filter({
        $or: [
          { customer_id: user.id },
          { vendor_id: user.id }
        ]
      });
      
      return Response.json(conversations);
    }

    // RÉCUPÉRER LES MESSAGES
    if (req.method === 'GET' && searchParams.get('action') === 'messages') {
      const convId = searchParams.get('convId');
      const messages = await base44.entities.ChatMessage.filter({ 
        conversation_id: convId 
      });
      
      return Response.json(messages);
    }

    // COMPTER LES NON LUS
    if (req.method === 'GET' && searchParams.get('action') === 'unread-count') {
      const conversations = await base44.entities.Conversation.filter({
        $or: [
          { customer_id: user.id },
          { vendor_id: user.id }
        ]
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

      return Response.json({ unreadCount: totalUnread });
    }

    // MARQUER COMME LU
    if (req.method === 'PUT') {
      const { conversation_id } = await req.json();
      
      const unreadMessages = await base44.entities.ChatMessage.filter({
        conversation_id,
        sender_id: { $ne: user.id },
        is_read: false
      });

      for (const msg of unreadMessages) {
        await base44.asServiceRole.entities.ChatMessage.update(msg.id, { is_read: true });
      }

      return Response.json({ success: true, count: unreadMessages.length });
    }

    return Response.json({ error: 'Action non reconnue' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});