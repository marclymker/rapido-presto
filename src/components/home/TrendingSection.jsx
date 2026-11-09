import React, { useMemo } from 'react';
import CompactProductCard from './CompactProductCard';

// shopsMap doit être passé de préférence, sinon on le calcule localement
export default function TrendingSection({ allProducts, shops, shopsMap: shopsMapProp, onProductClick }) {
  // Utiliser la map pré-calculée ou en créer une localement (fallback)
  const shopsMap = useMemo(() => {
    if (shopsMapProp) return shopsMapProp;
    const m = {};
    (shops || []).forEach(s => { m[s.id] = s; });
    return m;
  }, [shopsMapProp, shops]);

  const { products, label } = useMemo(() => {
    if (!allProducts || allProducts.length === 0) return { products: [], label: '' };

    // Récupérer le dernier produit vu
    let lastViewed = null;
    try {
      const raw = localStorage.getItem('last_viewed_product');
      if (raw) lastViewed = JSON.parse(raw);
    } catch (_) {}

    // Proxy "popularité" : produits les plus récents (fraîcheur = proxy CTR)
    const sorted = [...allProducts].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

    if (!lastViewed) {
      return { products: sorted.slice(0, 10), label: '🔥 Tendances' };
    }

    const tags = lastViewed.seo_tags || [];
    const category = lastViewed.category || '';

    // Score de similarité
    const scored = sorted
      .filter(p => p.id !== lastViewed.id)
      .map(p => {
        let score = 0;
        const pTags = p.seo_tags || [];
        tags.forEach(t => { if (pTags.includes(t)) score += 3; });
        if (p.category === category) score += 2;
        return { ...p, _score: score };
      });

    // 70% similaires (score > 0), 30% populaires
    const similar = scored.filter(p => p._score > 0).sort((a, b) => b._score - a._score).slice(0, 7);
    const similarIds = new Set(similar.map(p => p.id));
    const popular = scored.filter(p => !similarIds.has(p.id)).slice(0, 3);

    return {
      products: [...similar, ...popular].slice(0, 10),
      label: '🔥 Inspiré de vos recherches',
    };
  }, [allProducts]);

  if (products.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between px-4 mb-2">
        <h3 className="text-sm font-bold text-slate-800">{label}</h3>
      </div>
      <div
        className="flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {products.map(product => {
          const shop = shopsMap[product.shop_id];
          return (
            <div key={product.id} style={{ scrollSnapAlign: 'start', minWidth: '120px', maxWidth: '120px' }}>
              <CompactProductCard product={product} shop={shop} onClick={() => onProductClick(product)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
