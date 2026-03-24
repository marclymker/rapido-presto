import React, { useState, useEffect } from 'react';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { useNavigate } from 'react-router-dom';

export default function RelatedProducts({ currentProduct, allProducts }) {
  const [show, setShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return <div className="h-32" />;

  const related = allProducts
    .filter(p => p.id !== currentProduct?.id && (
      p.category === currentProduct?.category ||
      (p.seo_tags || []).some(t => (currentProduct?.seo_tags || []).includes(t))
    ))
    .slice(0, 12);

  if (related.length === 0) return null;

  return (
    <div className="mt-4 pb-28">
      <h3 className="text-sm font-bold text-slate-800 px-4 mb-2">Produits similaires</h3>
      <div
        className="flex gap-2 px-4 overflow-x-auto no-scrollbar"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {related.map(p => {
          const price = applyClientMargin(p.promo_price || p.price);
          return (
            <div
              key={p.id}
              className="flex-shrink-0 w-28 bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 active:scale-95 transition-transform cursor-pointer"
              style={{ scrollSnapAlign: 'start' }}
              onClick={() => navigate(`/product/${p.slug || p.id}`)}
            >
              <div className="w-28 h-28 bg-slate-50">
                {p.image_url ? (
                  <img
                    src={`${p.image_url}${p.image_url?.includes('?') ? '&' : '?'}w=200&q=60`}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200 text-2xl">📦</div>
                )}
              </div>
              <div className="p-1.5">
                <p className="text-[10px] font-black text-orange-500">{price.toLocaleString()} HTG</p>
                <p className="text-[9px] text-slate-500 truncate">{p.name}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}