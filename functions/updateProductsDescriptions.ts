import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (user?.role !== 'admin') {
            return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
        }

        // Récupérer tous les produits
        const products = await base44.asServiceRole.entities.Product.list('-created_date', 500);
        
        let updated = 0;
        const errors = [];

        for (const product of products) {
            try {
                const needsDescription = !product.description || product.description.trim() === '';
                const needsTags = !product.seo_tags || product.seo_tags.length === 0;
                
                if (!needsDescription && !needsTags) continue;

                const updateData = {};

                // Générer description si manquante
                if (needsDescription) {
                    const descPrompt = `Génère une description marketing attrayante en français pour ce produit:
Nom: ${product.name}
Catégorie: ${product.category}
Prix: ${product.price} HTG
${product.image_url ? 'Une image du produit est disponible.' : ''}

La description doit être:
- Entre 50-100 mots
- Persuasive et élégante
- Adaptée à un site e-commerce en Haïti
- Sans mentions de prix ou promotions`;

                    const descResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
                        prompt: descPrompt,
                        file_urls: product.image_url ? [product.image_url] : undefined
                    });
                    
                    updateData.description = descResult.trim();
                }

                // Générer tags si manquants
                if (needsTags) {
                    const tagsPrompt = `Génère 5-8 tags SEO pertinents en français pour ce produit:
Nom: ${product.name}
Catégorie: ${product.category}
${product.description ? 'Description: ' + product.description : ''}

Tags doivent être:
- Pertinents pour la recherche
- En minuscules
- Sans hashtags
- Adaptés au marché haïtien
${product.category === 'Boutique Fleurs' ? '- INCLURE OBLIGATOIREMENT "saint valentin"' : ''}

Retourne uniquement la liste des tags séparés par des virgules.`;

                    const tagsResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
                        prompt: tagsPrompt
                    });
                    
                    let tags = tagsResult
                        .toLowerCase()
                        .split(',')
                        .map(t => t.trim())
                        .filter(t => t.length > 0);

                    // S'assurer que "saint valentin" est dans les tags pour les fleurs
                    if (product.category === 'Boutique Fleurs') {
                        if (!tags.some(t => t.includes('valentin'))) {
                            tags.push('saint valentin');
                        }
                    }

                    updateData.seo_tags = tags.slice(0, 10);
                }

                // Mettre à jour le produit
                if (Object.keys(updateData).length > 0) {
                    await base44.asServiceRole.entities.Product.update(product.id, updateData);
                    updated++;
                }

            } catch (error) {
                errors.push({ product_id: product.id, name: product.name, error: error.message });
                console.error(`Erreur pour ${product.name}:`, error);
            }
        }

        return Response.json({
            success: true,
            products_updated: updated,
            total_products: products.length,
            errors: errors.length > 0 ? errors : undefined
        });

    } catch (error) {
        console.error('Erreur globale:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});