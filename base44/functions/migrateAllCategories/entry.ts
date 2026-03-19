import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * Nouvelle taxonomie complète (10 catégories racines)
 * Seules les feuilles (IDs les plus précis) sont listées pour le mapping IA
 */
const TAXONOMY_LEAVES = [
  // Arts et loisirs
  { id: 2271, path: 'Arts et loisirs > Artisanat > Arts textiles > Tissus' },
  { id: 2272, path: 'Arts et loisirs > Artisanat > Arts textiles > Fils et fibres' },
  { id: 51,   path: 'Arts et loisirs > Décoration fêtes > Décorations de mariage' },
  { id: 53,   path: 'Arts et loisirs > Décoration fêtes > Ballons' },
  { id: 54,   path: 'Arts et loisirs > Décoration fêtes > Confettis' },
  { id: 55,   path: 'Arts et loisirs > Décoration fêtes > Cadeaux de fête' },
  { id: 56,   path: 'Arts et loisirs > Décoration fêtes > Chapeaux de fête' },
  { id: 57,   path: 'Arts et loisirs > Décoration fêtes > Nappes et serviettes de fête' },
  { id: 11,   path: 'Arts et loisirs > Instruments de musique > Guitares' },
  { id: 12,   path: 'Arts et loisirs > Instruments de musique > Pianos et claviers' },
  { id: 13,   path: 'Arts et loisirs > Instruments de musique > Batteries et percussions' },
  // Vêtements
  { id: 213,  path: 'Vêtements > Hauts > Chemises et chemisiers' },
  { id: 214,  path: 'Vêtements > Hauts > T-shirts' },
  { id: 215,  path: 'Vêtements > Hauts > Pulls et gilets' },
  { id: 205,  path: 'Vêtements > Pantalons > Jeans' },
  { id: 206,  path: 'Vêtements > Pantalons > Shorts' },
  { id: 228,  path: 'Vêtements > Robes > Robes de soirée' },
  { id: 229,  path: 'Vêtements > Robes > Robes de mariée' },
  { id: 190,  path: 'Vêtements > Chaussures > Hommes > Mocassins et chaussures à lacets' },
  { id: 191,  path: 'Vêtements > Chaussures > Hommes > Bottes de ville' },
  { id: 193,  path: 'Vêtements > Chaussures > Hommes > Chaussures de course à pied' },
  { id: 194,  path: 'Vêtements > Chaussures > Hommes > Chaussures de basket-ball' },
  { id: 196,  path: 'Vêtements > Chaussures > Femmes > Escarpins et talons hauts' },
  { id: 197,  path: 'Vêtements > Chaussures > Femmes > Sandales et nu-pieds' },
  { id: 198,  path: 'Vêtements > Chaussures > Femmes > Bottes et bottines' },
  { id: 201,  path: 'Vêtements > Sacs > Sacs portés épaule' },
  { id: 202,  path: 'Vêtements > Sacs > Sacs cabas' },
  { id: 203,  path: 'Vêtements > Sacs > Pochettes et sacs de soirée' },
  { id: 204,  path: 'Vêtements > Sacs > Sacs à dos' },
  { id: 207,  path: 'Vêtements > Bijoux et montres > Montres-bracelets' },
  { id: 208,  path: 'Vêtements > Bijoux et montres > Montres de poche' },
  { id: 210,  path: 'Vêtements > Bijoux > Colliers et pendentifs' },
  { id: 211,  path: 'Vêtements > Bijoux > Bagues' },
  { id: 212,  path: 'Vêtements > Bijoux > Boucles d\'oreilles' },
  { id: 213,  path: 'Vêtements > Bijoux > Bracelets' },
  // Maison
  { id: 439,  path: 'Maison > Meubles salon > Canapés et fauteuils' },
  { id: 440,  path: 'Maison > Meubles salon > Tables basses' },
  { id: 441,  path: 'Maison > Meubles salon > Meubles TV' },
  { id: 443,  path: 'Maison > Meubles chambre > Lits et sommiers' },
  { id: 444,  path: 'Maison > Meubles chambre > Matelas' },
  { id: 445,  path: 'Maison > Meubles chambre > Armoires et commodes' },
  { id: 446,  path: 'Maison > Meubles chambre > Tables de chevet' },
  { id: 448,  path: 'Maison > Cuisine > Tables de salle à manger' },
  { id: 449,  path: 'Maison > Cuisine > Chaises de salle à manger' },
  { id: 450,  path: 'Maison > Cuisine > Buffets et vaisseliers' },
  { id: 453,  path: 'Maison > Éclairage > Lampes de chevet' },
  { id: 454,  path: 'Maison > Éclairage > Lampadaires' },
  { id: 455,  path: 'Maison > Éclairage > Lampes de bureau' },
  { id: 457,  path: 'Maison > Éclairage plafond > Lustres' },
  { id: 458,  path: 'Maison > Éclairage plafond > Plafonniers' },
  { id: 6000, path: 'Maison > Décoration > Miroirs' },
  { id: 6001, path: 'Maison > Décoration > Tapis' },
  { id: 6002, path: 'Maison > Décoration > Rideaux et voilages' },
  { id: 6003, path: 'Maison > Décoration > Coussins décoratifs' },
  // Électronique
  { id: 225,  path: 'Électronique > Téléphonie > Smartphones' },
  { id: 226,  path: 'Électronique > Téléphonie > Téléphones classiques' },
  { id: 228,  path: 'Électronique > Accessoires mobile > Étuis et coques' },
  { id: 229,  path: 'Électronique > Accessoires mobile > Chargeurs et câbles' },
  { id: 230,  path: 'Électronique > Accessoires mobile > Batteries externes' },
  { id: 232,  path: 'Électronique > Ordinateurs > Ordinateurs portables' },
  { id: 233,  path: 'Électronique > Ordinateurs > Ordinateurs de bureau' },
  { id: 234,  path: 'Électronique > Ordinateurs > Tablettes tactiles' },
  { id: 235,  path: 'Électronique > Ordinateurs > Composants informatiques' },
  { id: 238,  path: 'Électronique > TV > Téléviseurs LED/OLED' },
  { id: 239,  path: 'Électronique > TV > Téléviseurs 4K/8K' },
  { id: 241,  path: 'Électronique > Audio > Écouteurs sans fil Bluetooth' },
  { id: 242,  path: 'Électronique > Audio > Casques audio' },
  { id: 243,  path: 'Électronique > Audio > Enceintes et haut-parleurs' },
  // Santé et beauté
  { id: 472,  path: 'Santé et beauté > Cheveux > Shampoings et après-shampoings' },
  { id: 473,  path: 'Santé et beauté > Cheveux > Produits coiffants' },
  { id: 474,  path: 'Santé et beauté > Cheveux > Colorations capillaires' },
  { id: 476,  path: 'Santé et beauté > Peau > Crèmes hydratantes' },
  { id: 477,  path: 'Santé et beauté > Peau > Nettoyants pour le visage' },
  { id: 478,  path: 'Santé et beauté > Peau > Sérums et soins anti-âge' },
  { id: 480,  path: 'Santé et beauté > Maquillage > Maquillage des yeux' },
  { id: 481,  path: 'Santé et beauté > Maquillage > Maquillage des lèvres' },
  { id: 482,  path: 'Santé et beauté > Maquillage > Maquillage du teint' },
  // Jeux et jouets
  { id: 1241, path: 'Jeux et jouets > Jouets > Poupées et figurines' },
  { id: 1242, path: 'Jeux et jouets > Jouets > Jeux de construction' },
  { id: 1243, path: 'Jeux et jouets > Jouets > Jeux de société' },
  { id: 1244, path: 'Jeux et jouets > Jouets > Jouets éducatifs' },
  { id: 1246, path: 'Jeux et jouets > Jeux vidéo > Consoles de jeux' },
  { id: 1247, path: 'Jeux et jouets > Jeux vidéo > Jeux pour consoles' },
  { id: 1248, path: 'Jeux et jouets > Jeux vidéo > Accessoires de jeux vidéo' },
  // Véhicules
  { id: 890,  path: 'Véhicules > Voitures' },
  { id: 891,  path: 'Véhicules > Motos' },
  { id: 892,  path: 'Véhicules > Vélos' },
  { id: 894,  path: 'Véhicules > Pièces > Pneus et jantes' },
  { id: 895,  path: 'Véhicules > Pièces > Accessoires d\'intérieur' },
  { id: 896,  path: 'Véhicules > Pièces > Pièces de moteur' },
  // Alimentation
  { id: 414,  path: 'Alimentation > Boissons alcoolisées' },
  { id: 415,  path: 'Alimentation > Boissons non alcoolisées' },
  { id: 417,  path: 'Alimentation > Épicerie > Produits laitiers' },
  { id: 418,  path: 'Alimentation > Épicerie > Produits de boulangerie' },
  // Fournitures bureau
  { id: 924,  path: 'Fournitures de bureau > Papeterie > Papier' },
  { id: 925,  path: 'Fournitures de bureau > Papeterie > Stylos et crayons' },
  { id: 926,  path: 'Fournitures de bureau > Papeterie > Cahiers et blocs-notes' },
  // Animaux
  { id: 3,    path: 'Animaux > Articles pour chiens' },
  { id: 4,    path: 'Animaux > Articles pour chats' },
  { id: 5,    path: 'Animaux > Articles pour oiseaux' },
];

const TAXONOMY_PROMPT = TAXONOMY_LEAVES.map(n => `ID ${n.id}: ${n.path}`).join('\n');

async function classifyProduct(product) {
  const OpenAI = (await import('npm:openai')).default;
  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

  const messages = [
    {
      role: 'system',
      content: `Tu es un expert en classification e-commerce. Tu dois attribuer l'ID de catégorie Facebook/Google Taxonomy le plus précis possible à chaque produit.
      
TAXONOMIE OFFICIELLE (liste complète des catégories feuilles) :
${TAXONOMY_PROMPT}

Réponds UNIQUEMENT avec un JSON: {"fb_category_id": <nombre entier>, "fb_category_path": "<chemin>"}
Choisis toujours la catégorie la plus précise (feuille) et non un nœud parent.`
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Titre: "${product.name}"
Description: "${(product.description || '').substring(0, 200)}"
Catégorie boutique: "${product.category || ''}"

Analyse ce produit et attribue-lui la catégorie FB la plus précise.`
        },
        ...(product.image_url ? [{
          type: 'image_url',
          image_url: { url: product.image_url, detail: 'low' }
        }] : [])
      ]
    }
  ];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    max_tokens: 100,
    response_format: { type: 'json_object' }
  });

  const result = JSON.parse(response.choices[0].message.content);
  const leaf = TAXONOMY_LEAVES.find(n => n.id === result.fb_category_id);
  return {
    fb_category_id: leaf ? leaf.id : result.fb_category_id,
    fb_category_path: leaf ? leaf.path : result.fb_category_path || ''
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const forceAll = body.force_all === true;
    const dryRun = body.dry_run === true;

    let page = 0;
    const pageSize = 30;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let totalProcessed = 0;
    const preview = [];
    let hasMore = true;

    while (hasMore) {
      const products = await base44.asServiceRole.entities.Product.list('-created_date', pageSize, page * pageSize);

      if (!products || products.length === 0) {
        hasMore = false;
        break;
      }

      for (const product of products) {
        // Skip si déjà catégorisé (sauf si force_all)
        if (!forceAll && product.fb_category_id) {
          totalSkipped++;
          continue;
        }

        totalProcessed++;

        try {
          const result = await classifyProduct(product);

          if (dryRun) {
            preview.push({
              name: product.name,
              old_category: product.fb_category_id ? `ID ${product.fb_category_id}` : (product.category || '—'),
              new_fb_category: `ID ${result.fb_category_id}: ${result.fb_category_path}`,
            });
          } else {
            await base44.asServiceRole.entities.Product.update(product.id, {
              fb_category_id: result.fb_category_id,
              fb_category_path: result.fb_category_path,
            });
            totalUpdated++;
          }

          await new Promise(r => setTimeout(r, 100)); // rate limit
        } catch (err) {
          console.error(`Error on product ${product.id}:`, err.message);
          totalErrors++;
        }
      }

      if (products.length < pageSize) {
        hasMore = false;
      } else {
        page++;
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return Response.json({
      success: true,
      total: (page * pageSize) + (products?.length || 0),
      to_process: totalProcessed,
      updated: totalUpdated,
      processed: totalProcessed,
      skipped: totalSkipped,
      errors: totalErrors,
      preview: preview.slice(0, 20),
      message: dryRun
        ? `Aperçu: ${totalProcessed} produits à reclassifier`
        : `Migration IA terminée: ${totalUpdated} mis à jour, ${totalSkipped} ignorés, ${totalErrors} erreurs`
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});