import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // Gestion du CORS pour autoriser les appels depuis le navigateur
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, x-client-id, x-client-secret",
    "Content-Type": "application/json",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Unauthorized' 
      }), { 
        status: 401, 
        headers 
      });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    console.log(`Action: ${action}, User: ${user.id}, Body:`, body);

    // --- LOGIQUE INITIALISATION ---
    if (action === 'init') {
      const { vendor_id, shop_id, shop_name, shop_logo, product_id, initial_message } = body;

      // Vérifier si une conversation existe déjà
      const existing = await base44.entities.Conversation.filter({
        customer_id: user.id,
        vendor_id: vendor_id,
        shop_id: shop_id
      });

      if (existing && existing.length > 0) {
        console.log('Conversation existante trouvée:', existing[0].id);
        return new Response(JSON.stringify({ 
          success: true, 
          conversation: existing[0] 
        }), { headers });
      }

      // Créer une nouvelle conversation
      const conversation = await base44.entities.Conversation.create({
        customer_id: user.id,
        customer_name: user.full_name || 'Client',
        vendor_id: vendor_id,
        shop_id: shop_id,
        shop_name: shop_name || 'Boutique',
        shop_logo: shop_logo || '',
        last_message: initial_message || 'Conversation démarrée',
        last_message_date: new Date().toISOString(),
        product_context_id: product_id || null
      });

      console.log('Nouvelle conversation créée:', conversation.id);

      // Créer le message initial
      await base44.entities.ChatMessage.create({
        conversation_id: conversation.id,
        sender_id: user.id,
        sender_name: user.full_name || 'Client',
        content: initial_message || 'Bonjour, je souhaite en savoir plus sur ce produit.',
        type: 'text',
        is_read: false,
        timestamp: new Date().toISOString()
      });

      return new Response(JSON.stringify({ 
        success: true, 
        conversation: conversation 
      }), { headers });
    }

    // --- LOGIQUE LISTE ---
    if (action === 'list') {
      try {
        // Récupérer les conversations où l'utilisateur est client OU vendeur
        const conversationsAsCustomer = await base44.entities.Conversation.filter({
          customer_id: user.id
        });

        const conversationsAsVendor = await base44.entities.Conversation.filter({
          vendor_id: user.id
        });

        // Fusionner et dédupliquer les conversations
        const allConversations = [...conversationsAsCustomer, ...conversationsAsVendor];
        const uniqueConversations = allConversations.filter((conv, index, self) =>
          index === self.findIndex(c => c.id === conv.id)
        );

        // Trier par date du dernier message (plus récent en premier)
        const sortedConversations = uniqueConversations.sort((a, b) => {
          const dateA = new Date(a.last_message_date || a.created_at || 0);
          const dateB = new Date(b.last_message_date || b.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });

        console.log(`Retourne ${sortedConversations.length} conversations pour l'utilisateur ${user.id}`);

        return new Response(JSON.stringify({ 
          success: true, 
          data: sortedConversations 
        }), { headers });
      } catch (error) {
        console.error('Erreur lors de la récupération des conversations:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message,
          data: []
        }), { headers });
      }
    }

    // --- LOGIQUE MESSAGES ---
    if (action === 'messages') {
      const { convId } = body;
      
      if (!convId) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'convId requis' 
        }), { status: 400, headers });
      }

      try {
        const msgs = await base44.entities.ChatMessage.filter({ 
          conversation_id: convId 
        });
        
        // Trier les messages par date de création ascendante (plus ancien -> plus récent)
        const sortedMessages = msgs.sort((a, b) => {
          const timeA = a.timestamp || a.created_at || a.id;
          const timeB = b.timestamp || b.created_at || b.id;
          
          const dateA = new Date(timeA).getTime();
          const dateB = new Date(timeB).getTime();
          
          return dateA - dateB; // Ordre ascendant
        });
        
        console.log(`Retourne ${sortedMessages.length} messages pour la conversation ${convId}`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          data: sortedMessages 
        }), { headers });
      } catch (error) {
        console.error('Erreur lors de la récupération des messages:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message,
          data: []
        }), { headers });
      }
    }

    // --- LOGIQUE ENVOI ---
    if (action === 'send') {
      const { conversation_id, content } = body;
      
      console.log('Envoi de message:', { conversation_id, content, user: user.id });
      
      if (!conversation_id || !content) {
        console.error('Paramètres manquants:', { conversation_id, content });
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'conversation_id et content requis' 
        }), { status: 400, headers });
      }

      try {
        const now = new Date().toISOString();
        
        // Créer le message
        const message = await base44.entities.ChatMessage.create({
          conversation_id: conversation_id,
          sender_id: user.id,
          sender_name: user.full_name || 'Utilisateur',
          content: content,
          type: 'text',
          timestamp: now
        });
        
        console.log('Message créé avec succès:', message.id);
        
        // Mettre à jour la conversation avec le dernier message
        await base44.asServiceRole.entities.Conversation.update(conversation_id, {
          last_message: content,
          last_message_date: now
        });
        
        console.log(`Message envoyé: ${message.id} dans la conversation ${conversation_id}`);
        
        return new Response(JSON.stringify({ 
          success: true, 
          data: message 
        }), { headers });
      } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message 
        }), { status: 500, headers });
      }
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Action invalide' 
    }), { status: 400, headers });
    
  } catch (error) {
    console.error('Erreur dans chatService:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { status: 500, headers });
  }
});