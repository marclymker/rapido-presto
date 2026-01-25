import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const { conversation_id, customer_message, product_context } = await req.json();

    // Récupérer l'historique de la conversation
    const messages = await base44.entities.ChatMessage.filter(
      { conversation_id },
      'created_date'
    );

    // Récupérer les infos de la conversation
    const conversation = await base44.entities.Conversation.get(conversation_id);
    const shop = await base44.entities.Shop.get(conversation.shop_id);

    // Récupérer TOUS les produits de la boutique
    const allProducts = await base44.entities.Product.filter({ 
      shop_id: conversation.shop_id,
      is_available: true 
    });

    // Formater la liste des produits pour l'IA
    const productsList = allProducts.map(p => 
      `- ${p.name}: ${p.price} HTG${p.promo_price ? ` (Promo: ${p.promo_price} HTG)` : ''} - ${p.description || 'Pas de description'}`
    ).join('\n');

    // Construire le contexte pour l'IA
    const systemPrompt = `Tu es l'agent de vente personnel IA pour ${shop.company_name}, une boutique de ${shop.company_category} sur Rapido Presto en Haïti.

RÈGLE ABSOLUE : Tu représentes UNIQUEMENT ${shop.company_name}. Tu ne peux JAMAIS mentionner, recommander ou référer à des produits d'autres boutiques. Seulement les produits de ${shop.company_name}.

Ton rôle :
- Répondre aux questions des clients de manière professionnelle et amicale
- Donner des informations sur les produits, prix, et disponibilité
- Recommander des produits similaires ou complémentaires UNIQUEMENT de ${shop.company_name}
- Aider avec les commandes et la livraison
- Être courtois et utiliser le créole haïtien ou français selon le client
- Rester concis et utile

Informations boutique :
- Nom : ${shop.company_name}
- Catégorie : ${shop.company_category}
- Région : ${shop.region || 'Non spécifiée'}
- Horaires : ${shop.opening_hours ? 'Disponibles' : 'À confirmer'}

${product_context ? `Produit en contexte initial : ${product_context.name} - ${product_context.price} HTG\n` : ''}

CATALOGUE COMPLET DE ${shop.company_name} (${allProducts.length} produits disponibles):
${productsList}

Tu peux recommander n'importe quel produit de CE catalogue selon les besoins du client.
Si un client demande un produit non disponible dans ce catalogue, propose des alternatives similaires de ${shop.company_name} uniquement.
Réponds au client de manière naturelle et professionnelle.`;

    // Construire l'historique des messages
    const conversationHistory = messages.slice(-10).map(m => ({
      role: m.sender_id === user.id ? 'user' : 'assistant',
      content: m.content
    }));

    // Appel à OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        ...conversationHistory,
        { role: "user", content: customer_message }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const aiResponse = completion.choices[0].message.content;

    // Enregistrer la réponse de l'IA dans le chat
    await base44.entities.ChatMessage.create({
      conversation_id,
      sender_id: conversation.vendor_id,
      sender_name: `${shop.company_name} (IA)`,
      content: aiResponse,
      type: 'text',
      is_read: false
    });

    // Mettre à jour la conversation
    await base44.asServiceRole.entities.Conversation.update(conversation_id, {
      last_message: aiResponse,
      last_message_date: new Date().toISOString()
    });

    return Response.json({ 
      success: true, 
      response: aiResponse 
    }, { headers });

  } catch (error) {
    console.error('AI Chat Error:', error);
    return Response.json({ 
      error: error.message,
      details: 'Erreur lors de la génération de la réponse IA' 
    }, { status: 500, headers });
  }
});