import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { product_name, description, category, shop_name, delivery_time } = await req.json();

    const isWedding = shop_name?.toLowerCase().includes('makarios') || category === 'Mariage';

    const prompt = `Tu es un expert e-commerce haïtien. Génère ${isWedding ? '5' : '4'} questions-réponses FAQ en français pour la page produit suivante.

Produit : ${product_name}
Catégorie : ${category || 'Non spécifiée'}
Boutique : ${shop_name || 'RAPIDOPRESTO'}
Description : ${description || 'Produit disponible sur RAPIDOPRESTO'}
Délai de livraison : ${delivery_time || '24 heures'}

RÈGLES IMPORTANTES :
- Les questions doivent être formulées comme un vrai client haïtien les poserait (langage naturel, géolocalisé)
- Inclure des villes haïtiennes : Pétion-Ville, Delmas, Cap-Haïtien, Gonaïves, Port-au-Prince
- Thèmes obligatoires : livraison, paiement (MonCash/Cash), qualité/matériaux
${isWedding ? `- Pour MAKARIOS BRIDAL DREAM, ajouter : retouches sur place à Delmas, délai de réservation Cap-Haïtien, essayage, personnalisation robe` : ''}
- Réponses courtes, rassurantes, max 2 phrases

Réponds en JSON strict :
{
  "faqs": [
    {"question": "...", "answer": "..."}
  ]
}`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          faqs: {
            type: "array",
            items: {
              type: "object",
              properties: {
                question: { type: "string" },
                answer: { type: "string" }
              },
              required: ["question", "answer"]
            }
          }
        },
        required: ["faqs"]
      }
    });

    return Response.json({ faqs: result.faqs || [] });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});