/**
 * Taxonomie complète Facebook/Google Product Taxonomy
 * Utilisée partout dans l'application pour la cohérence
 */

export const FB_CATEGORIES_TREE = {
  'Habillement et accessoires': {
    icon: '👗',
    subcategories: {
      'Vêtements Femme': ['Robes', 'Hauts & T-shirts', 'Jupes', 'Pantalons & Jeans', 'Manteaux & Vestes', 'Lingerie & Sous-vêtements', 'Vêtements de sport femme', 'Maillots de bain femme'],
      'Vêtements Homme': ['Chemises', 'T-shirts homme', 'Pantalons homme', 'Costumes & Blazers', 'Vêtements de sport homme', 'Sous-vêtements homme'],
      'Chaussures': ['Baskets', 'Sandales & Tongs', 'Bottes & Bottines', 'Chaussures habillées', 'Chaussures de sport', 'Mocassins'],
      'Bijoux & Accessoires': ['Colliers', 'Bracelets', 'Boucles d\'oreilles', 'Montres', 'Lunettes de soleil', 'Foulards & Écharpes', 'Chapeaux & Casquettes', 'Ceintures'],
      'Sacs & Bagages': ['Sacs à main', 'Sacs à dos', 'Valises', 'Pochettes', 'Sacs de sport'],
      'Vêtements Bébé & Enfant': ['Bébé 0-2 ans', 'Enfant 2-12 ans', 'Ado 12-16 ans'],
    }
  },
  'Mariage & Événements': {
    icon: '💍',
    subcategories: {
      'Robes de Mariée': ['Robe Sirène', 'Robe Princesse (Ponpon)', 'Robe Catalina', 'Robe de Cérémonie', 'Robe Demoiselle d\'honneur'],
      'Tenues Invités': ['Tenues Témoins', 'Costumes Hommes', 'Robes de Cocktail'],
      'Bijoux de Mariage': ['Bague de Fiançailles', 'Alliance', 'Parure de Mariage'],
      'Décoration Mariage': ['Matériels Décor', 'Centres de Table', 'Arches Florales', 'Bougies & Lanternes'],
      'Fleurs Mariage': ['Bouquets de Mariée', 'Boutonnières', 'Arrangements Floraux'],
      'Autres Mariage': ['Carte et Programmation', 'Accessoires Mariage', 'Cadeaux Invités'],
    }
  },
  'Électronique': {
    icon: '📱',
    subcategories: {
      'Téléphones & Accessoires': ['Smartphones', 'Coques & Protections', 'Chargeurs & Câbles', 'Écouteurs & Casques', 'Smartwatches'],
      'Ordinateurs & Tablettes': ['Ordinateurs portables', 'Tablettes', 'Accessoires informatiques', 'Claviers & Souris', 'Disques durs & Clés USB'],
      'TV & Audio': ['Téléviseurs', 'Enceintes Bluetooth', 'Home Cinéma', 'Barres de son'],
      'Photo & Caméra': ['Appareils photo', 'Caméras d\'action', 'Drones', 'Accessoires photo'],
      'Jeux Vidéo': ['Consoles', 'Jeux', 'Manettes & Accessoires gaming'],
      'Électroménager': ['Réfrigérateurs', 'Micro-ondes', 'Fers à repasser', 'Ventilateurs & Climatiseurs'],
    }
  },
  'Maison & Décoration': {
    icon: '🏠',
    subcategories: {
      'Meubles': ['Canapés & Sofas', 'Tables & Bureaux', 'Chaises & Tabourets', 'Lits & Cadres de lit', 'Armoires & Rangements'],
      'Décoration Intérieure': ['Tableaux & Art mural', 'Bougies & Diffuseurs', 'Coussins & Plaids', 'Rideaux & Stores', 'Tapis & Moquettes', 'Miroirs'],
      'Cuisine & Salle à manger': ['Vaisselle & Couverts', 'Ustensiles de cuisine', 'Verres & Tasses', 'Casseroles & Poêles'],
      'Literie & Bains': ['Draps & Housses de couette', 'Oreillers & Couvertures', 'Serviettes de bain'],
      'Outils & Bricolage': ['Perceuses & Outils électriques', 'Outils à main', 'Fixation & Quincaillerie', 'Peinture & Revêtements'],
      'Décoration de Fête': ['Ballons & Guirlandes', 'Déco Anniversaire', 'Déco Noël'],
    }
  },
  'Bébé & Enfant': {
    icon: '👶',
    subcategories: {
      'Puériculture': ['Poussettes & Landaus', 'Sièges auto', 'Lits & Berceaux', 'Baby-phones'],
      'Jouets & Jeux': ['Jouets éducatifs', 'Poupées & Figurines', 'Jeux de société', 'Jeux de construction', 'Jeux d\'extérieur'],
      'Alimentation Bébé': ['Biberons & Tétines', 'Chaises hautes', 'Petits pots & Purées'],
      'Vêtements Bébé': ['Bébé Fille', 'Bébé Garçon', 'Pyjamas & Gigoteuses', 'Chaussures bébé'],
      'Sécurité Enfant': ['Barrières de sécurité', 'Protections coins & portes'],
    }
  },
  'Santé & Beauté': {
    icon: '💄',
    subcategories: {
      'Maquillage': ['Fond de teint & BB cream', 'Rouge à lèvres & Gloss', 'Mascara & Eyeliner', 'Fard à paupières', 'Poudres & Blush', 'Contouring'],
      'Soins du Visage': ['Crèmes hydratantes', 'Sérums & Huiles visage', 'Nettoyants & Toniques', 'Masques visage', 'Protection solaire'],
      'Soins du Corps': ['Lotions & Huiles corps', 'Gels douche & Savons', 'Déodorants', 'Épilation'],
      'Soins Capillaires': ['Shampooings & Après-shampooings', 'Huiles capillaires', 'Colorations', 'Perruques & Extensions', 'Accessoires cheveux'],
      'Parfums': ['Eau de Parfum Femme', 'Eau de Parfum Homme', 'Eau de Toilette', 'Déodorants parfumés'],
      'Hygiène Bucco-Dentaire': ['Brosses à dents', 'Dentifrices', 'Fil dentaire'],
    }
  },
  'Alimentation & Épicerie': {
    icon: '🛒',
    subcategories: {
      'Épicerie Sèche': ['Pâtes, riz & céréales', 'Conserves & Bocaux', 'Huiles & Condiments', 'Sucre, farine & sel'],
      'Boissons': ['Eaux & Sodas', 'Jus de fruits', 'Café & Thé', 'Boissons énergisantes', 'Boissons alcoolisées'],
      'Produits Frais': ['Fruits & Légumes', 'Viandes & Poissons', 'Produits laitiers & Œufs'],
      'Snacks & Confiseries': ['Chocolats & Bonbons', 'Biscuits & Gâteaux', 'Chips & Apéritifs'],
      'Café & Restauration': ['Fastfood', 'Restaurant', 'Café & Pâtisserie', 'Épicerie fine', 'Traiteur', 'Paniers-cadeaux'],
    }
  },
  'Sport & Loisirs': {
    icon: '⚽',
    subcategories: {
      'Équipement Sportif': ['Musculation & Fitness', 'Football & Sports collectifs', 'Natation', 'Vélos & Cyclisme', 'Sports de raquette', 'Arts martiaux'],
      'Vêtements de Sport': ['Tenues de running', 'Maillots de sport', 'Chaussures de sport'],
      'Outdoor & Camping': ['Tentes & Camping', 'Sacs de couchage', 'Randonnée'],
      'Loisirs Créatifs': ['Peinture & Dessin', 'Couture & Tricot', 'Instruments de musique'],
      'Livres & Films': ['Livres', 'Films & Séries', 'Musique'],
    }
  },
  'Jardin & Extérieur': {
    icon: '🌿',
    subcategories: {
      'Jardin': ['Plantes d\'intérieur', 'Plantes d\'extérieur', 'Fleurs naturelles', 'Graines & Bulbes', 'Outils de jardinage'],
      'Mobilier Extérieur': ['Tables & Chaises de jardin', 'Barbecues & Plancha', 'Parasols', 'Hamacs'],
      'Fleurs & Bouquets': ['Bouquets coupés', 'Fleurs artificielles', 'Arrangements floraux', 'Boutique Fleurs'],
    }
  },
  'Véhicules': {
    icon: '🚗',
    subcategories: {
      'Voitures & Camions': ['Voitures neuves', 'Voitures d\'occasion', 'Camions & Utilitaires'],
      'Motos & Scooters': ['Motos', 'Scooters', 'Casques moto', 'Équipements de protection'],
      'Accessoires Auto': ['Tapis de sol', 'Housses de siège', 'Autoradios', 'GPS'],
      'Pièces & Entretien': ['Huiles & Lubrifiants', 'Filtres', 'Pneus', 'Batterie'],
    }
  },
  'Fournitures de Bureau': {
    icon: '📋',
    subcategories: {
      'Équipement de Bureau': ['Chaises de bureau', 'Bureaux & Tables de travail', 'Imprimantes', 'Fournitures diverses'],
      'Papeterie': ['Stylos & Crayons', 'Cahiers & Blocs-notes', 'Classeurs & Rangements'],
      'Fournitures Scolaires': ['Cartables & Sacs scolaires', 'Fournitures de classe', 'Manuels scolaires'],
    }
  },
  'Pharmacie & Santé': {
    icon: '💊',
    subcategories: {
      'Médicaments': ['Médicaments sans ordonnance', 'Vitamines & Compléments'],
      'Matériel Médical': ['Tensiomètres', 'Thermomètres', 'Fauteuils roulants', 'Béquilles'],
      'Bien-être': ['Huiles essentielles', 'Aromathérapie', 'Relaxation'],
    }
  },
};

// Liste des catégories parentes (pour les filtres/dropdowns simples)
export const FB_PARENT_CATEGORIES = Object.keys(FB_CATEGORIES_TREE);

// Icônes des catégories parentes
export const FB_CATEGORY_ICONS = Object.fromEntries(
  Object.entries(FB_CATEGORIES_TREE).map(([cat, data]) => [cat, data.icon])
);

// Obtenir les sous-catégories d'une catégorie parente (niveau 2)
export function getSubcategories(parentCategory) {
  return Object.keys(FB_CATEGORIES_TREE[parentCategory]?.subcategories || {});
}

// Obtenir les items du niveau 3 (sous-sous-catégories)
export function getLeafCategories(parentCategory, subcategory) {
  return FB_CATEGORIES_TREE[parentCategory]?.subcategories?.[subcategory] || [];
}

// Toutes les catégories feuilles (niveau le plus profond) pour l'IA
export function getAllLeafCategories() {
  const leaves = [];
  for (const [parent, data] of Object.entries(FB_CATEGORIES_TREE)) {
    for (const [sub, items] of Object.entries(data.subcategories)) {
      items.forEach(item => leaves.push(`${parent} > ${sub} > ${item}`));
    }
  }
  return leaves;
}