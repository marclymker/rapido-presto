import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Récupérer le message créé
    const newMessage = data;
    
    if (!newMessage || !newMessage.conversation_id) {
      return Response.json({ success: false, reason: 'No message data' });
    }

    // Récupérer la conversation
    const conversation = await base44.asServiceRole.entities.Conversation.get(newMessage.conversation_id);
    
    // ⚠️ PROTECTION BOUCLE INFINIE : Ne pas répondre si c'est un message du vendeur
    if (newMessage.sender_id === conversation.vendor_id) {
      console.log('Message du vendeur - pas de réponse IA');
      return Response.json({ success: false, reason: 'Message from vendor, skipping AI' });
    }

    // Récupérer la boutique
    const shop = await base44.asServiceRole.entities.Shop.get(conversation.shop_id);

    // Récupérer TOUS les produits de la boutique
    const allProducts = await base44.asServiceRole.entities.Product.filter({ 
      shop_id: conversation.shop_id,
      is_available: true 
    });

    // Formater la liste des produits pour l'IA
    const productsList = allProducts.map(p => 
      `- ${p.name}: ${p.price} HTG${p.promo_price ? ` (Promo: ${p.promo_price} HTG)` : ''} - ${p.description || 'Pas de description'}`
    ).join('\n');

    // Récupérer le produit contexte si disponible
    let productContext = null;
    if (conversation.product_context_id) {
      try {
        productContext = await base44.asServiceRole.entities.Product.get(conversation.product_context_id);
      } catch (e) {
        console.log('Produit contexte introuvable');
      }
    }

    // Construire le prompt système
    const systemPrompt = `Tu es l'agent de vente personnel IA pour ${shop.company_name}, une boutique de ${shop.company_category} sur Rapido Presto en Haïti.

RÈGLE ABSOLUE : Tu représentes UNIQUEMENT ${shop.company_name}. Tu ne peux JAMAIS mentionner, recommander ou référer à des produits d'autres boutiques. Seulement les produits de ${shop.company_name}.

Ton rôle :
- Répondre aux questions des clients de manière professionnelle et amicale
- Donner des informations sur les produits, prix, et disponibilité
- Recommander des produits similaires ou complémentaires UNIQUEMENT de ${shop.company_name}
- Aider avec les commandes et la livraison
- Être courtois et utiliser le créole haïtien ou français selon le client
- Rester concis et utile (maximum 3-4 phrases)

Informations boutique :
- Nom : ${shop.company_name}
- Catégorie : ${shop.company_category}
- Région : ${shop.region || 'Non spécifiée'}

${productContext ? `Produit en contexte initial : ${productContext.name} - ${productContext.price} HTG\n` : ''}

CATALOGUE COMPLET DE ${shop.company_name} (${allProducts.length} produits disponibles):
${productsList}

Tu peux recommander n'importe quel produit de CE catalogue selon les besoins du client.
Si un client demande un produit non disponible dans ce catalogue, propose des alternatives similaires de ${shop.company_name} uniquement.
Réponds au client de manière naturelle et professionnelle en français ou créole haïtien.`;

    // Récupérer l'historique récent
    const messages = await base44.asServiceRole.entities.ChatMessage.filter(
      { conversation_id: conversation.id },
      'created_date',
      20
    );

    // Construire l'historique
    const conversationHistory = messages.slice(-10).map(m => ({
      role: m.sender_id === conversation.vendor_id ? 'assistant' : 'user',
      content: m.content
    }));

    // Appel à OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory
      ],
      temperature: 0.7,
      max_tokens: 300
    });

    const aiResponse = completion.choices[0].message.content;

    // Sauvegarder la réponse IA
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

    console.log('✅ IA réponse envoyée avec succès');
    return Response.json({ success: true, response: aiResponse });

  } catch (error) {
    console.error('❌ Erreur Auto Reply:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});