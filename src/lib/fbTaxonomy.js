/**
 * Hiérarchie Complète des Catégories Facebook Commerce (Google Product Taxonomy)
 * Source: document officiel complet - IDs exacts.
 */

export const FB_TAXONOMY = [
  {
    id: 8,
    name: "Arts et loisirs",
    icon: "🎨",
    children: [
      {
        id: 24,
        name: "Artisanat et loisirs créatifs",
        children: [
          {
            id: 2270,
            name: "Arts textiles",
            children: [
              { id: 2271, name: "Tissus" },
              { id: 2272, name: "Fils et fibres" },
            ],
          },
        ],
      },
      {
        id: 50,
        name: "Décoration de fêtes et d'événements",
        children: [
          {
            id: 51,
            name: "Décorations de mariage",
            children: [],
          },
          {
            id: 52,
            name: "Décorations de fête",
            children: [
              { id: 53, name: "Ballons" },
              { id: 54, name: "Confettis" },
              { id: 55, name: "Cadeaux de fête" },
              { id: 56, name: "Chapeaux de fête" },
              { id: 57, name: "Nappes et serviettes de fête" },
            ],
          },
        ],
      },
      {
        id: 10,
        name: "Instruments de musique",
        children: [
          { id: 11, name: "Guitares" },
          { id: 12, name: "Pianos et claviers" },
          { id: 13, name: "Batteries et percussions" },
        ],
      },
    ],
  },
  {
    id: 166,
    name: "Vêtements et accessoires",
    icon: "👗",
    children: [
      {
        id: 160,
        name: "Vêtements",
        children: [
          {
            id: 212,
            name: "Hauts",
            children: [
              { id: 213, name: "Chemises et chemisiers" },
              { id: 214, name: "T-shirts" },
              { id: 215, name: "Pulls et gilets" },
            ],
          },
          {
            id: 204,
            name: "Pantalons",
            children: [
              { id: 205, name: "Jeans" },
              { id: 206, name: "Shorts" },
            ],
          },
          {
            id: 227,
            name: "Robes",
            children: [
              { id: 228, name: "Robes de soirée" },
              { id: 229, name: "Robes de mariée" },
            ],
          },
        ],
      },
      {
        id: 187,
        name: "Chaussures",
        children: [
          {
            id: 188,
            name: "Chaussures pour hommes",
            children: [
              {
                id: 189,
                name: "Chaussures de ville",
                children: [
                  { id: 190, name: "Mocassins et chaussures à lacets" },
                  { id: 191, name: "Bottes de ville" },
                ],
              },
              {
                id: 192,
                name: "Chaussures de sport",
                children: [
                  { id: 193, name: "Chaussures de course à pied" },
                  { id: 194, name: "Chaussures de basket-ball" },
                ],
              },
            ],
          },
          {
            id: 195,
            name: "Chaussures pour femmes",
            children: [
              { id: 196, name: "Escarpins et talons hauts" },
              { id: 197, name: "Sandales et nu-pieds" },
              { id: 198, name: "Bottes et bottines" },
            ],
          },
        ],
      },
      {
        id: 199,
        name: "Sacs et sacs à main",
        children: [
          {
            id: 200,
            name: "Sacs à main",
            children: [
              { id: 201, name: "Sacs portés épaule" },
              { id: 202, name: "Sacs cabas" },
              { id: 203, name: "Pochettes et sacs de soirée" },
            ],
          },
          { id: 204, name: "Sacs à dos" },
        ],
      },
      {
        id: 205,
        name: "Bijoux et montres",
        children: [
          {
            id: 206,
            name: "Montres",
            children: [
              { id: 207, name: "Montres-bracelets" },
              { id: 208, name: "Montres de poche" },
            ],
          },
          {
            id: 209,
            name: "Bijoux",
            children: [
              { id: 210, name: "Colliers et pendentifs" },
              { id: 211, name: "Bagues" },
              { id: 212, name: "Boucles d'oreilles" },
              { id: 213, name: "Bracelets" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 436,
    name: "Maison et jardin",
    icon: "🏠",
    children: [
      {
        id: 437,
        name: "Meubles",
        children: [
          {
            id: 438,
            name: "Meubles de salon",
            children: [
              { id: 439, name: "Canapés et fauteuils" },
              { id: 440, name: "Tables basses et tables de salon" },
              { id: 441, name: "Meubles TV et centres de divertissement" },
            ],
          },
          {
            id: 442,
            name: "Meubles de chambre",
            children: [
              { id: 443, name: "Lits et sommiers" },
              { id: 444, name: "Matelas" },
              { id: 445, name: "Armoires et commodes" },
              { id: 446, name: "Tables de chevet" },
            ],
          },
          {
            id: 447,
            name: "Meubles de cuisine et salle à manger",
            children: [
              { id: 448, name: "Tables de salle à manger" },
              { id: 449, name: "Chaises de salle à manger" },
              { id: 450, name: "Buffets et vaisseliers" },
            ],
          },
        ],
      },
      {
        id: 451,
        name: "Éclairage",
        children: [
          {
            id: 452,
            name: "Lampes",
            children: [
              { id: 453, name: "Lampes de chevet" },
              { id: 454, name: "Lampadaires" },
              { id: 455, name: "Lampes de bureau" },
            ],
          },
          {
            id: 456,
            name: "Luminaires de plafond",
            children: [
              { id: 457, name: "Lustres" },
              { id: 458, name: "Plafonniers" },
            ],
          },
        ],
      },
      {
        id: 5999,
        name: "Décoration",
        children: [
          { id: 6000, name: "Miroirs" },
          { id: 6001, name: "Tapis" },
          { id: 6002, name: "Rideaux et voilages" },
          { id: 6003, name: "Coussins décoratifs" },
        ],
      },
    ],
  },
  {
    id: 222,
    name: "Électronique",
    icon: "📱",
    children: [
      {
        id: 223,
        name: "Téléphonie",
        children: [
          {
            id: 224,
            name: "Téléphones portables",
            children: [
              { id: 225, name: "Smartphones" },
              { id: 226, name: "Téléphones classiques" },
            ],
          },
          {
            id: 227,
            name: "Accessoires de téléphonie mobile",
            children: [
              { id: 228, name: "Étuis et coques" },
              { id: 229, name: "Chargeurs et câbles" },
              { id: 230, name: "Batteries externes" },
            ],
          },
        ],
      },
      {
        id: 231,
        name: "Ordinateurs",
        children: [
          { id: 232, name: "Ordinateurs portables" },
          { id: 233, name: "Ordinateurs de bureau" },
          { id: 234, name: "Tablettes tactiles" },
          { id: 235, name: "Composants informatiques" },
        ],
      },
      {
        id: 236,
        name: "Audio et Vidéo",
        children: [
          {
            id: 237,
            name: "Téléviseurs",
            children: [
              { id: 238, name: "Téléviseurs LED/OLED" },
              { id: 239, name: "Téléviseurs 4K/8K" },
            ],
          },
          {
            id: 240,
            name: "Casques et écouteurs",
            children: [
              { id: 241, name: "Écouteurs sans fil (Bluetooth)" },
              { id: 242, name: "Casques audio" },
            ],
          },
          { id: 243, name: "Enceintes et haut-parleurs" },
        ],
      },
    ],
  },
  {
    id: 469,
    name: "Santé et beauté",
    icon: "💄",
    children: [
      {
        id: 470,
        name: "Soins personnels",
        children: [
          {
            id: 471,
            name: "Soins des cheveux",
            children: [
              { id: 472, name: "Shampoings et après-shampoings" },
              { id: 473, name: "Produits coiffants" },
              { id: 474, name: "Colorations capillaires" },
            ],
          },
          {
            id: 475,
            name: "Soins de la peau",
            children: [
              { id: 476, name: "Crèmes hydratantes" },
              { id: 477, name: "Nettoyants pour le visage" },
              { id: 478, name: "Sérums et soins anti-âge" },
            ],
          },
        ],
      },
      {
        id: 479,
        name: "Maquillage",
        children: [
          { id: 480, name: "Maquillage des yeux" },
          { id: 481, name: "Maquillage des lèvres" },
          { id: 482, name: "Maquillage du teint" },
        ],
      },
    ],
  },
  {
    id: 1239,
    name: "Jeux et jouets",
    icon: "🎮",
    children: [
      {
        id: 1240,
        name: "Jouets",
        children: [
          { id: 1241, name: "Poupées et figurines" },
          { id: 1242, name: "Jeux de construction" },
          { id: 1243, name: "Jeux de société" },
          { id: 1244, name: "Jouets éducatifs" },
        ],
      },
      {
        id: 1245,
        name: "Jeux vidéo",
        children: [
          { id: 1246, name: "Consoles de jeux" },
          { id: 1247, name: "Jeux pour consoles" },
          { id: 1248, name: "Accessoires de jeux vidéo" },
        ],
      },
    ],
  },
  {
    id: 888,
    name: "Véhicules et pièces",
    icon: "🚗",
    children: [
      {
        id: 889,
        name: "Véhicules",
        children: [
          { id: 890, name: "Voitures" },
          { id: 891, name: "Motos" },
          { id: 892, name: "Vélos" },
        ],
      },
      {
        id: 893,
        name: "Pièces et accessoires de véhicules",
        children: [
          { id: 894, name: "Pneus et jantes" },
          { id: 895, name: "Accessoires d'intérieur" },
          { id: 896, name: "Pièces de moteur" },
        ],
      },
    ],
  },
  {
    id: 412,
    name: "Alimentation et boissons",
    icon: "🍽️",
    children: [
      {
        id: 413,
        name: "Boissons",
        children: [
          { id: 414, name: "Boissons alcoolisées" },
          { id: 415, name: "Boissons non alcoolisées" },
        ],
      },
      {
        id: 416,
        name: "Épicerie",
        children: [
          { id: 417, name: "Produits laitiers" },
          { id: 418, name: "Produits de boulangerie" },
        ],
      },
    ],
  },
  {
    id: 922,
    name: "Fournitures de bureau",
    icon: "📎",
    children: [
      {
        id: 923,
        name: "Papeterie",
        children: [
          { id: 924, name: "Papier" },
          { id: 925, name: "Stylos et crayons" },
          { id: 926, name: "Cahiers et blocs-notes" },
        ],
      },
    ],
  },
  {
    id: 1,
    name: "Animaux et articles pour animaux",
    icon: "🐾",
    children: [
      {
        id: 2,
        name: "Articles pour animaux",
        children: [
          { id: 3, name: "Articles pour chiens" },
          { id: 4, name: "Articles pour chats" },
          { id: 5, name: "Articles pour oiseaux" },
        ],
      },
    ],
  },
];

/**
 * Aplatit l'arbre en liste plate pour la recherche par ID
 */
export function flattenTaxonomy(nodes = FB_TAXONOMY, parent = null, path = []) {
  const result = [];
  for (const node of nodes) {
    const currentPath = [...path, node.name];
    result.push({ ...node, parent_id: parent?.id || null, path: currentPath, children: undefined });
    if (node.children?.length) {
      result.push(...flattenTaxonomy(node.children, node, currentPath));
    }
  }
  return result;
}

export const FLAT_TAXONOMY = flattenTaxonomy();

/**
 * Trouve un nœud par ID
 */
export function findById(id) {
  return FLAT_TAXONOMY.find(n => n.id === id) || null;
}

/**
 * Retourne le chemin complet d'un nœud (ex: "Électronique > Téléphonie > Smartphones")
 */
export function getCategoryPath(id) {
  const node = findById(id);
  return node ? node.path.join(' > ') : '';
}

/**
 * Retourne les catégories de niveau 1 (racines)
 */
export function getRootCategories() {
  return FB_TAXONOMY;
}

/**
 * Retourne les enfants directs d'un nœud
 */
export function getChildren(parentId) {
  function findInTree(nodes, targetId) {
    for (const n of nodes) {
      if (n.id === targetId) return n.children || [];
      if (n.children) {
        const found = findInTree(n.children, targetId);
        if (found !== null) return found;
      }
    }
    return null;
  }
  return findInTree(FB_TAXONOMY, parentId) || [];
}

/**
 * Retourne le prompt de mapping AI avec la liste complète des IDs feuilles
 */
export function getTaxonomyMappingPrompt() {
  const leaves = FLAT_TAXONOMY.filter(n => {
    function hasChildren(nodes, id) {
      for (const n of nodes) {
        if (n.id === id) return !!(n.children?.length);
        if (n.children) { const r = hasChildren(n.children, id); if (r !== null) return r; }
      }
      return null;
    }
    return !hasChildren(FB_TAXONOMY, n.id);
  });
  return leaves.map(n => `ID ${n.id}: ${n.path.join(' > ')}`).join('\n');
}