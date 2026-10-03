// Conversion des catégories en slugs URL
export const categoryToSlug = (category) => {
  const mapping = {
    'Tout': '',
    'Mariage': 'mariage',
    'Pour Femme': 'mode-femme',
    'Boutique Fleurs': 'fleurs',
    'Pour homme': 'mode-homme',
    'Electronics': 'electronique',
    'Bijoux': 'bijoux',
    'Maison': 'maison',
    'Hotels/Piscine': 'hotels-piscine',
    'Bébé': 'bebe',
    'Outils': 'outils',
    'Fastfood': 'fastfood',
    'Mode': 'mode',
    'Pharmacie': 'pharmacie',
    'Epicerie': 'epicerie',
    'Café': 'cafe'
  };
  return mapping[category] || category.toLowerCase().replace(/\s+/g, '-');
};

// Conversion des slugs URL en catégories
export const slugToCategory = (slug) => {
  const mapping = {
    '': 'Tout',
    'mariage': 'Mariage',
    'mode-femme': 'Pour Femme',
    'fleurs': 'Boutique Fleurs',
    'mode-homme': 'Pour homme',
    'electronique': 'Electronics',
    'bijoux': 'Bijoux',
    'maison': 'Maison',
    'hotels-piscine': 'Hotels/Piscine',
    'bebe': 'Bébé',
    'outils': 'Outils',
    'fastfood': 'Fastfood',
    'mode': 'Mode',
    'pharmacie': 'Pharmacie',
    'epicerie': 'Epicerie',
    'cafe': 'Café'
  };
  return mapping[slug] || slug;
};

// Conversion des sous-catégories en slugs
export const subcategoryToSlug = (subcategory) => {
  if (!subcategory) return '';
  return subcategory
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
    .replace(/['']/g, '') // Supprimer apostrophes sans les remplacer
    .replace(/\s+/g, '-')
    .replace(/[()]/g, '')
    .replace(/--+/g, '-'); // Éviter doubles tirets
};

// Conversion des slugs en sous-catégories
export const slugToSubcategory = (slug, weddingStructure) => {
  if (!slug) return null;
  
  for (const group of weddingStructure) {
    if (group.subtypes) {
      for (const subtype of group.subtypes) {
        if (subcategoryToSlug(subtype) === slug) return subtype;
      }
    }
    if (subcategoryToSlug(group.title) === slug) return group.title;
  }
  return null;
};

// Métadonnées SEO par catégorie
export const getCategoryMeta = (category, subcategory = null) => {
  const meta = {
    'Mariage': {
      title: 'Articles de Mariage en Haïti | Robes, Décoration, Bijoux',
      description: 'Trouvez tout pour votre mariage en Haïti : robes de mariée, bagues, accessoires, décoration. Livraison rapide.',
      keywords: 'mariage haiti, robe mariée, bague mariage, decoration mariage'
    },
    'Pour Femme': {
      title: 'Mode Femme en Haïti | Vêtements et Accessoires',
      description: 'Découvrez notre collection de vêtements pour femme en Haïti. Livraison rapide partout.',
      keywords: 'vetement femme haiti, mode femme, robe femme'
    },
    'Boutique Fleurs': {
      title: 'Livraison de Fleurs en Haïti | Bouquets Frais',
      description: 'Commandez des fleurs fraîches en Haïti. Livraison en 45 minutes.',
      keywords: 'fleurs haiti, bouquet, livraison fleurs'
    },
    'Pour homme': {
      title: 'Mode Homme en Haïti | Vêtements et Accessoires',
      description: 'Vêtements et accessoires pour homme en Haïti. Qualité et style.',
      keywords: 'vetement homme haiti, mode homme'
    },
    'Electronics': {
      title: 'Électronique en Haïti | Smartphones, Ordinateurs',
      description: 'Achetez vos appareils électroniques en Haïti. Prix compétitifs.',
      keywords: 'electronique haiti, smartphone, ordinateur'
    },
    'Bijoux': {
      title: 'Bijoux en Haïti | Bagues, Colliers, Bracelets',
      description: 'Collection de bijoux de qualité en Haïti. Livraison rapide.',
      keywords: 'bijoux haiti, bague, collier'
    },
    'Maison': {
      title: 'Articles pour la Maison en Haïti | Décoration & Plus',
      description: 'Équipez votre maison avec nos produits de qualité en Haïti.',
      keywords: 'maison haiti, decoration, meubles'
    },
    'Bébé': {
      title: 'Articles pour Bébé en Haïti | Vêtements & Accessoires',
      description: 'Tout pour votre bébé en Haïti. Produits de qualité.',
      keywords: 'bebe haiti, vetement bebe, accessoires bebe'
    },
    'Outils': {
      title: 'Outils en Haïti | Équipement Professionnel',
      description: 'Outils de qualité pour professionnels et particuliers en Haïti.',
      keywords: 'outils haiti, equipement'
    }
  };

  const baseMeta = meta[category] || {
    title: `${category} en Haïti | Rapido Presto`,
    description: `Achetez ${category} en Haïti avec livraison rapide.`,
    keywords: `${category.toLowerCase()} haiti`
  };

  if (subcategory) {
    return {
      title: `${subcategory} - ${baseMeta.title}`,
      description: `Découvrez notre sélection de ${subcategory} en Haïti. ${baseMeta.description}`,
      keywords: `${subcategory.toLowerCase()}, ${baseMeta.keywords}`
    };
  }

  return baseMeta;
};