import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

const FB_CATEGORIES = [
  "Apparel & Accessories > Women's Clothing",
  "Apparel & Accessories > Men's Clothing",
  "Apparel & Accessories > Shoes",
  "Apparel & Accessories > Jewelry",
  "Apparel & Accessories > Handbags",
  "Apparel & Accessories > Wedding",
  "Apparel & Accessories > Kids' Clothing",
  "Electronics > Mobile Phones",
  "Electronics > Computers",
  "Electronics > Audio",
  "Electronics > Cameras",
  "Electronics > Accessories",
  "Health & Beauty > Skin Care",
  "Health & Beauty > Makeup",
  "Health & Beauty > Hair Care",
  "Health & Beauty > Fragrances",
  "Health & Beauty > Personal Care",
  "Home & Garden > Furniture",
  "Home & Garden > Decor",
  "Home & Garden > Kitchen",
  "Home & Garden > Plants & Flowers",
  "Home & Garden > Tools",
  "Food & Beverages > Groceries",
  "Food & Beverages > Beverages",
  "Food & Beverages > Restaurant",
  "Food & Beverages > Bakery",
  "Toys & Games > Baby",
  "Toys & Games > Kids",
  "Sporting Goods",
  "Hardware > Tools",
  "Jewelry & Watches",
  "Books & Magazines",
  "Health > Pharmacy",
  "Baby & Kids > Baby Care",
  "Baby & Kids > Clothing",
];

const APP_TO_FB_HINTS = {
  "Fastfood": "Food & Beverages > Restaurant",
  "Restaurants": "Food & Beverages > Restaurant",
  "Boutique Fleurs": "Home & Garden > Plants & Flowers",
  "Pharmacie": "Health > Pharmacy",
  "Mariage": "Apparel & Accessories > Wedding",
  "Epicerie": "Food & Beverages > Groceries",
  "Café": "Food & Beverages > Beverages",
  "Pour Femme": "Apparel & Accessories > Women's Clothing",
  "Electronics": "Electronics",
  "Pour homme": "Apparel & Accessories > Men's Clothing",
  "Maison": "Home & Garden > Decor",
  "Bébé": "Baby & Kids > Baby Care",
  "Outils": "Hardware > Tools",
  "Bijoux": "Jewelry & Watches",
  "Matériels Décor": "Home & Garden > Decor",
};

async function classifyBatch(products) {
  const items = products.map((p, i) => ({
    index: i,
    name: p.name,
    description: (p.description || '').substring(0, 200),
    current_category: p.category || '',
    subcategory: p.subcategory || '',
  }));

  const prompt = `Vous êtes un expert en catalogage Facebook Shopping.
Pour chaque produit ci-dessous, choisissez la catégorie Facebook la plus précise parmi cette liste:
${FB_CATEGORIES.join('\n')}

Produits à classifier:
${JSON.stringify(items, null, 2)}

Répondez UNIQUEMENT avec un JSON strict: {"results": [{"index": 0, "fb_category": "..."}, ...]}
Choisissez la catégorie la plus précise possible en vous basant sur le nom, la description et la catégorie actuelle.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.1,
  });

  const result = JSON.parse(response.choices[0].message.content);
  return result.results || [];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Accès refusé' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;
    const batchSize = 10;

    // Récupérer tous les produits
    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 1000);
    
    // Filtrer ceux qui n'ont pas encore de fb_category dans product_attributes
    const toProcess = allProducts.filter(p => {
      const existing = p.product_attributes?.fb_category;
      return !existing || body.force_all === true;
    });

    console.log(`Total produits: ${allProducts.length}, à traiter: ${toProcess.length}`);

    if (toProcess.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'Tous les produits ont déjà une catégorie Facebook.',
        total: allProducts.length,
        processed: 0,
        updated: 0
      });
    }

    let updated = 0;
    let processed = 0;
    const errors = [];
    const preview = [];

    // Limiter à 30 produits par appel pour éviter le timeout (passer offset pour paginer)
    const offset = body.offset || 0;
    const pageSize = body.page_size || 30;
    const page = toProcess.slice(offset, offset + pageSize);

    console.log(`Traitement offset=${offset}, page=${page.length} produits`);

    // Traiter par batches de 10 (AI classification)
    for (let i = 0; i < page.length; i += batchSize) {
      const batch = page.slice(i, i + batchSize);
      
      try {
        const classifications = dryRun ? [] : await classifyBatch(batch);
        
        // En dry_run, utiliser le mapping manuel rapide
        const results = dryRun
          ? batch.map((p, idx) => ({ index: idx, fb_category: APP_TO_FB_HINTS[p.category] || 'Apparel & Accessories' }))
          : classifications;

        for (const cls of results) {
          const product = batch[cls.index];
          if (!product) continue;
          
          const fbCategory = cls.fb_category || APP_TO_FB_HINTS[product.category] || 'Apparel & Accessories';
          
          preview.push({
            id: product.id,
            name: product.name,
            old_category: product.category,
            new_fb_category: fbCategory
          });

          if (!dryRun) {
            await base44.asServiceRole.entities.Product.update(product.id, {
              product_attributes: {
                ...(product.product_attributes || {}),
                fb_category: fbCategory,
              }
            });
            updated++;
          }
          processed++;
        }
      } catch (batchError) {
        console.error(`Erreur batch ${i}:`, batchError.message);
        errors.push(`Batch ${offset + i}: ${batchError.message}`);
        // Fallback mapping manuel
        for (const product of batch) {
          const fbCategory = APP_TO_FB_HINTS[product.category] || 'Apparel & Accessories';
          preview.push({ id: product.id, name: product.name, old_category: product.category, new_fb_category: fbCategory, fallback: true });
          if (!dryRun) {
            await base44.asServiceRole.entities.Product.update(product.id, {
              product_attributes: { ...(product.product_attributes || {}), fb_category: fbCategory }
            });
            updated++;
          }
          processed++;
        }
      }
    }

    const hasMore = (offset + pageSize) < toProcess.length;
    return Response.json({
      success: true,
      dry_run: dryRun,
      total: allProducts.length,
      to_process: toProcess.length,
      offset,
      next_offset: hasMore ? offset + pageSize : null,
      has_more: hasMore,
      processed,
      updated,
      errors,
      preview: preview.slice(0, 20),
    });

  } catch (error) {
    console.error('migrateToFbCategories error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});