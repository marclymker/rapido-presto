import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    const newMessage = data;
    if (!newMessage || !newMessage.conversation_id) {
      return Response.json({ success: false, reason: 'No message data' });
    }

    // Récupérer la conversation
    const conversation = await base44.asServiceRole.entities.Conversation.get(newMessage.conversation_id);

    // ⚠️ PROTECTION BOUCLE INFINIE : Ne pas répondre aux messages du vendeur ou de l'IA
    if (newMessage.sender_id === conversation.vendor_id) {
      return Response.json({ success: false, reason: 'Message from vendor, skipping AI' });
    }
    if (newMessage.sender_name && newMessage.sender_name.includes('(IA)')) {
      return Response.json({ success: false, reason: 'Message from AI, skipping' });
    }

    // Récupérer la boutique et le produit contexte
    const shop = await base44.asServiceRole.entities.Shop.get(conversation.shop_id);

    let productContext = null;
    if (conversation.product_context_id) {
      try {
        productContext = await base44.asServiceRole.entities.Product.get(conversation.product_context_id);
      } catch (e) {}
    }

    // Récupérer l'historique récent des messages
    const recentMessages = await base44.asServiceRole.entities.ChatMessage.filter(
      { conversation_id: conversation.id },
      'created_date',
      20
    );

    const sortedMessages = recentMessages
      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
      .slice(-10);

    // Récupérer les produits de la boutique
    const allProducts = await base44.asServiceRole.entities.Product.filter({
      shop_id: conversation.shop_id,
      is_available: true
    });

    const productsList = allProducts.slice(0, 30).map(p =>
      `- ${p.name}: ${p.promo_price || p.price} HTG${p.description ? ' — ' + p.description.slice(0, 80) : ''}`
    ).join('\n');

    // Construire le contexte complet pour le support client
    const systemPrompt = `Tu es l'agent de support client IA pour ${shop.company_name}, boutique ${shop.company_category} sur Rapido Presto (marketplace haïtien).

Ton rôle : assister les acheteurs rapidement et professionnellement, même si le vendeur est absent.

${productContext ? `🛍️ Produit concerné par cette discussion : ${productContext.name} — ${productContext.promo_price || productContext.price} HTG\nDescription : ${productContext.description || 'Non disponible'}` : ''}

📦 CATALOGUE ${shop.company_name} (${allProducts.length} produits) :
${productsList}

Instructions :
- Réponds en français ou créole haïtien selon le client
- Sois concis (2-3 phrases max)
- Si le client veut commander, dis-lui d'utiliser le bouton "Ajouter au panier" ou "Payer maintenant"
- Pour la livraison, mentionne que Rapido Presto gère la livraison
- Ne jamais mentionner d'autres boutiques
- Si tu ne sais pas, invite le client à revenir plus tard quand le vendeur sera disponible`;

    const conversationHistory = sortedMessages.map(m => ({
      role: m.sender_id === conversation.vendor_id ? 'assistant' : 'user',
      content: m.content
    }));

    // Utiliser l'intégration InvokeLLM de Base44 (support_client agent)
    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: conversationHistory.length > 0
        ? `Contexte: ${systemPrompt}\n\nHistorique:\n${conversationHistory.map(m => `${m.role === 'user' ? 'Client' : 'Vendeur'}: ${m.content}`).join('\n')}\n\nRéponds au dernier message du client.`
        : `Contexte: ${systemPrompt}\n\nLe client vient d'envoyer: "${newMessage.content}"\n\nRéponds de façon utile et professionnelle.`,
      model: 'gpt_5_mini',
    });

    const aiResponse = typeof aiResult === 'string' ? aiResult : (aiResult?.text || aiResult?.response || 'Je suis là pour vous aider ! Posez-moi vos questions sur nos produits.');

    // Sauvegarder la réponse IA comme message du vendeur
    await base44.asServiceRole.entities.ChatMessage.create({
      conversation_id: conversation.id,
      sender_id: conversation.vendor_id,
      sender_name: `${shop.company_name} (IA)`,
      content: aiResponse,
      type: 'text',
      is_read: false
    });

    // Mettre à jour la conversation
    await base44.asServiceRole.entities.Conversation.update(conversation.id, {
      last_message: aiResponse,
      last_message_date: new Date().toISOString()
    });

    console.log('✅ Support IA répondu:', aiResponse.slice(0, 100));
    return Response.json({ success: true, response: aiResponse });

  } catch (error) {
    console.error('❌ Erreur Auto Reply:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});