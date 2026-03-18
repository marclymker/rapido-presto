import React, { useMemo } from 'react';
import { applyClientMargin } from '@/components/utils/priceCalculation';

/**
 * Algorithme de Similitude Hybride (Nom + Tags + Catégorie)
 * Compare les mots du titre et les seo_tags pour calculer un score de pertinence
 */
const SimilarProducts = ({ currentProduct, allProducts, onProductClick }) => {

  const recommendations = useMemo(() => {
    if (!currentProduct || !allProducts?.length) return [];

    // Mots du nom du produit actuel (filtre les mots courts inutiles)
    const currentNameWords = (currentProduct.name || '').toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);

    const currentTags = currentProduct.seo_tags || [];
    const currentCategory = currentProduct.category || '';

    return allProducts
      .filter(p => p.id !== currentProduct.id && p.is_available !== false)
      .map(p => {
        let score = 0;
        const productName = (p.name || '').toLowerCase();
        const productTags = p.seo_tags || [];

        // A. Mots communs dans le nom (+2 par mot)
        currentNameWords.forEach(word => {
          if (productName.includes(word)) score += 2;
        });

        // B. Tags communs (+3 par tag)
        currentTags.forEach(tag => {
          if (productTags.includes(tag)) score += 3;
        });

        // C. Même catégorie (+1 bonus)
        if (p.category === currentCategory) score += 1;

        return { ...p, relevanceScore: score };
      })
      .filter(p => p.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 4);

  }, [currentProduct, allProducts]);

  if (recommendations.length === 0) return null;

  return (
    <div className="mt-4 border-t pt-4">
      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest mb-3">
        Articles similaires
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {recommendations.map((item) => {
          const price = applyClientMargin(item.promo_price || item.price);
          return (
            <button
              key={item.id}
              onClick={() => onProductClick?.(item)}
              className="flex flex-col bg-slate-50 hover:bg-slate-100 rounded-xl overflow-hidden border border-slate-100 text-left active:scale-[0.98] transition-all"
            >
              <div className="aspect-square w-full bg-white overflow-hidden">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-contain p-1"
                  loading="lazy"
                />
              </div>
              <div className="p-2">
                <p className="text-orange-500 font-black text-sm">{price.toLocaleString()} HTG</p>
                <p className="text-slate-700 text-xs line-clamp-2 mt-0.5">{item.name}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SimilarProducts;