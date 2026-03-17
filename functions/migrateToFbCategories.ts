import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

// Taxonomie Google Product Category complète jusqu'au dernier niveau (utilisée par Facebook)
const FB_CATEGORIES = [
  // Apparel
  "Apparel & Accessories > Clothing > Dresses",
  "Apparel & Accessories > Clothing > Dresses > Wedding Dresses",
  "Apparel & Accessories > Clothing > Dresses > Evening Dresses",
  "Apparel & Accessories > Clothing > Dresses > Casual Dresses",
  "Apparel & Accessories > Clothing > Women's Tops & Blouses",
  "Apparel & Accessories > Clothing > Women's Skirts",
  "Apparel & Accessories > Clothing > Women's Pants",
  "Apparel & Accessories > Clothing > Men's Shirts",
  "Apparel & Accessories > Clothing > Men's Trousers",
  "Apparel & Accessories > Clothing > Men's Suits & Blazers",
  "Apparel & Accessories > Clothing > Children's Clothing",
  "Apparel & Accessories > Clothing > Activewear",
  "Apparel & Accessories > Clothing > Underwear & Socks",
  "Apparel & Accessories > Shoes > Women's Shoes",
  "Apparel & Accessories > Shoes > Men's Shoes",
  "Apparel & Accessories > Shoes > Children's Shoes",
  "Apparel & Accessories > Shoes > Heels",
  "Apparel & Accessories > Shoes > Sneakers",
  "Apparel & Accessories > Shoes > Sandals",
  "Apparel & Accessories > Jewelry > Necklaces",
  "Apparel & Accessories > Jewelry > Rings",
  "Apparel & Accessories > Jewelry > Wedding Rings",
  "Apparel & Accessories > Jewelry > Earrings",
  "Apparel & Accessories > Jewelry > Bracelets",
  "Apparel & Accessories > Jewelry > Brooches & Pins",
  "Apparel & Accessories > Handbags & Wallets > Handbags",
  "Apparel & Accessories > Handbags & Wallets > Clutches",
  "Apparel & Accessories > Handbags & Wallets > Wallets",
  "Apparel & Accessories > Hair Accessories > Wigs",
  "Apparel & Accessories > Hair Accessories > Hair Extensions",
  "Apparel & Accessories > Hair Accessories > Hair Clips & Barrettes",
  "Apparel & Accessories > Costumes & Accessories > Wedding Veils",
  "Apparel & Accessories > Costumes & Accessories > Fascinators & Mini Hats",
  // Electronics
  "Electronics > Communications > Phones > Mobile Phones",
  "Electronics > Communications > Phones > Phone Accessories",
  "Electronics > Computers > Laptops",
  "Electronics > Computers > Desktops",
  "Electronics > Computers > Tablets",
  "Electronics > Computers > Computer Accessories",
  "Electronics > Audio > Headphones",
  "Electronics > Audio > Speakers",
  "Electronics > Audio > Microphones",
  "Electronics > TV & Video > Televisions",
  "Electronics > TV & Video > Projectors",
  "Electronics > Cameras > Digital Cameras",
  "Electronics > Cameras > Camera Accessories",
  "Electronics > Video Game Consoles & Games",
  // Home & Garden
  "Home & Garden > Furniture > Bedroom Furniture > Beds",
  "Home & Garden > Furniture > Living Room Furniture > Sofas",
  "Home & Garden > Furniture > Dining Room Furniture > Dining Tables",
  "Home & Garden > Furniture > Dining Room Furniture > Chairs",
  "Home & Garden > Furniture > Office Furniture > Desks",
  "Home & Garden > Decor > Candles & Holders",
  "Home & Garden > Decor > Curtains & Drapes",
  "Home & Garden > Decor > Picture Frames",
  "Home & Garden > Decor > Vases",
  "Home & Garden > Decor > Artificial Flowers",
  "Home & Garden > Decor > Event & Party Supplies",
  "Home & Garden > Decor > Wedding Decorations",
  "Home & Garden > Kitchen & Dining > Cookware",
  "Home & Garden > Kitchen & Dining > Dinnerware",
  "Home & Garden > Kitchen & Dining > Small Appliances",
  "Home & Garden > Lawn & Garden > Plants",
  "Home & Garden > Lawn & Garden > Fresh Flowers",
  "Home & Garden > Tools > Hand Tools",
  "Home & Garden > Tools > Power Tools",
  "Home & Garden > Bedding > Bed Sheets",
  "Home & Garden > Bedding > Pillows",
  // Health & Beauty
  "Health & Beauty > Personal Care > Skin Care > Moisturizers",
  "Health & Beauty > Personal Care > Skin Care > Face Wash",
  "Health & Beauty > Personal Care > Hair Care > Shampoo",
  "Health & Beauty > Personal Care > Hair Care > Conditioner",
  "Health & Beauty > Personal Care > Hair Care > Hair Color",
  "Health & Beauty > Personal Care > Nail Care",
  "Health & Beauty > Personal Care > Oral Care",
  "Health & Beauty > Cosmetics > Foundation & Concealer",
  "Health & Beauty > Cosmetics > Lipstick & Lip Gloss",
  "Health & Beauty > Cosmetics > Eyeshadow",
  "Health & Beauty > Cosmetics > Mascara",
  "Health & Beauty > Fragrances > Women's Perfume",
  "Health & Beauty > Fragrances > Men's Cologne",
  "Health & Beauty > Medical Supplies",
  "Health & Beauty > Vitamins & Supplements",
  "Health & Beauty > Pharmacy > Over-the-Counter Medicine",
  // Food & Beverages
  "Food, Beverages & Tobacco > Food Items > Bakery",
  "Food, Beverages & Tobacco > Food Items > Fresh Produce",
  "Food, Beverages & Tobacco > Food Items > Meat & Seafood",
  "Food, Beverages & Tobacco > Food Items > Canned & Packaged Foods",
  "Food, Beverages & Tobacco > Food Items > Snacks",
  "Food, Beverages & Tobacco > Beverages > Water",
  "Food, Beverages & Tobacco > Beverages > Juice",
  "Food, Beverages & Tobacco > Beverages > Soft Drinks",
  "Food, Beverages & Tobacco > Beverages > Coffee & Tea",
  // Baby
  "Baby & Toddler > Diapering > Diapers",
  "Baby & Toddler > Baby Clothing",
  "Baby & Toddler > Baby Toys",
  "Baby & Toddler > Nursing & Feeding",
  "Baby & Toddler > Strollers & Accessories",
  // Sporting Goods
  "Sporting Goods > Exercise & Fitness > Cardio Equipment",
  "Sporting Goods > Exercise & Fitness > Strength Training",
  "Sporting Goods > Team Sports > Football",
  "Sporting Goods > Outdoor Recreation",
  // Toys
  "Toys & Games > Toys > Dolls",
  "Toys & Games > Toys > Action Figures",
  "Toys & Games > Games > Board Games",
  "Toys & Games > Party Supplies",
  // Office
  "Office Supplies > Stationery > Notebooks & Journals",
  "Office Supplies > Stationery > Pens & Pencils",
  "Office Supplies > Office Furniture > Office Chairs",
];

const APP_TO_FB_HINTS = {
  "Fastfood": "Food, Beverages & Tobacco > Food Items > Snacks",
  "Restaurants": "Food, Beverages & Tobacco > Food Items > Canned & Packaged Foods",
  "Boutique Fleurs": "Home & Garden > Lawn & Garden > Fresh Flowers",
  "Pharmacie": "Health & Beauty > Pharmacy > Over-the-Counter Medicine",
  "Mariage": "Apparel & Accessories > Clothing > Dresses > Wedding Dresses",
  "Epicerie": "Food, Beverages & Tobacco > Food Items > Canned & Packaged Foods",
  "Café": "Food, Beverages & Tobacco > Beverages > Coffee & Tea",
  "Pour Femme": "Apparel & Accessories > Clothing > Women's Tops & Blouses",
  "Electronics": "Electronics > Communications > Phones > Mobile Phones",
  "Pour homme": "Apparel & Accessories > Clothing > Men's Shirts",
  "Maison": "Home & Garden > Decor > Event & Party Supplies",
  "Bébé": "Baby & Toddler > Baby Clothing",
  "Outils": "Home & Garden > Tools > Hand Tools",
  "Bijoux": "Apparel & Accessories > Jewelry > Necklaces",
  "Matériels Décor": "Home & Garden > Decor > Wedding Decorations",
};

async function classifyBatch(products) {
  const items = products.map((p, i) => ({
    index: i,
    name: p.name,
    description: (p.description || '').substring(0, 200),
    current_category: p.category || '',
    subcategory: p.subcategory || '',
    seo_tags: (p.seo_tags || []).slice(0, 5).join(', '),
  }));

  const prompt = `Tu es un expert en catalogage Facebook/Google Shopping.
Pour chaque produit, choisis la catégorie Google Product Category la plus précise parmi cette liste EXACTE (tu dois aller jusqu'au dernier niveau de sous-catégorie):
${FB_CATEGORIES.join('\n')}

Produits à classifier:
${JSON.stringify(items, null, 2)}

RÈGLES STRICTES:
- Utilise UNIQUEMENT les catégories de la liste ci-dessus, mot pour mot
- Choisis TOUJOURS le niveau le plus profond possible (ex: préfère "Apparel & Accessories > Clothing > Dresses > Wedding Dresses" plutôt que "Apparel & Accessories > Clothing > Dresses")
- Base-toi sur le nom, la description, la catégorie actuelle et les tags SEO

Réponds UNIQUEMENT avec un JSON strict: {"results": [{"index": 0, "fb_category": "..."}, ...]}`;

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

    const allProducts = await base44.asServiceRole.entities.Product.list('-created_date', 1000);
    
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

    const offset = body.offset || 0;
    const pageSize = body.page_size || 30;
    const page = toProcess.slice(offset, offset + pageSize);

    for (let i = 0; i < page.length; i += batchSize) {
      const batch = page.slice(i, i + batchSize);
      
      try {
        const classifications = dryRun ? [] : await classifyBatch(batch);
        
        const results = dryRun
          ? batch.map((p, idx) => ({ index: idx, fb_category: APP_TO_FB_HINTS[p.category] || 'Apparel & Accessories > Clothing > Dresses' }))
          : classifications;

        for (const cls of results) {
          const product = batch[cls.index];
          if (!product) continue;
          
          const fbCategory = cls.fb_category || APP_TO_FB_HINTS[product.category] || 'Apparel & Accessories > Clothing > Dresses';
          
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
        for (const product of batch) {
          const fbCategory = APP_TO_FB_HINTS[product.category] || 'Apparel & Accessories > Clothing > Dresses';
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