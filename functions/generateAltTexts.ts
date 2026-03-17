import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { shopId, force_all = false, offset = 0, page_size = 20 } = body;

    // Récupérer les produits (filtrés par boutique ou tous)
    let allProducts;
    if (shopId) {
      allProducts = await base44.asServiceRole.entities.Product.filter({ shop_id: shopId });
    } else {
      allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 2000);
    }

    // Filtrer ceux sans alt text (ou tous si force_all)
    const toProcess = allProducts.filter(p => 
      p.image_url && (!p.image_alt || p.image_alt.trim() === '' || force_all)
    );

    const page = toProcess.slice(offset, offset + page_size);
    let updated = 0;
    const errors = [];

    for (const product of page) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: [
              {
                type: "text",
                text: `Génère un texte ALT pour cette image de produit nommé "${product.name}".
Le texte ALT doit:
- Décrire précisément ce que l'on voit dans l'image
- Être entre 10 et 20 mots
- Être en français
- Être optimisé pour Google Images et l'accessibilité
- Ne pas commencer par "Image de" ou "Photo de"
Réponds UNIQUEMENT avec le texte ALT, rien d'autre.`
              },
              {
                type: "image_url",
                image_url: { url: product.image_url, detail: "low" }
              }
            ]
          }],
          max_tokens: 100,
        });

        const altText = response.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
        
        await base44.asServiceRole.entities.Product.update(product.id, {
          image_alt: altText
        });
        updated++;
      } catch (err) {
        console.error(`Erreur produit ${product.id}:`, err.message);
        errors.push({ id: product.id, name: product.name, error: err.message });
      }
    }

    const hasMore = (offset + page_size) < toProcess.length;

    return Response.json({
      success: true,
      total_without_alt: toProcess.length,
      processed: page.length,
      updated,
      errors,
      offset,
      next_offset: hasMore ? offset + page_size : null,
      has_more: hasMore,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});