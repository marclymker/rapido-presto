import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import CompactProductCard from '@/components/home/CompactProductCard';
import { applyClientMargin } from '@/components/utils/priceCalculation';

export default function RelatedProducts({ product, shops }) {
  const navigate = useNavigate();

  const { data: sameVendor = [] } = useQuery({
    queryKey: ['related-vendor', product.shop_id],
    queryFn: () => base44.entities.Product.filter({ shop_id: product.shop_id, is_available: true }, '-created_date', 12),
    staleTime: 5 * 60 * 1000,
  });

  const { data: sameCategory = [] } = useQuery({
    queryKey: ['related-cat', product.category],
    queryFn: () => base44.entities.Product.filter({ category: product.category, is_available: true }, '-created_date', 20),
    enabled: !!product.category,
    staleTime: 5 * 60 * 1000,
  });

  const vendorItems = sameVendor.filter(p => p.id !== product.id).slice(0, 6);
  const otherItems = sameCategory
    .filter(p => p.id !== product.id && p.shop_id !== product.shop_id)
    .slice(0, 6);

  const handleClick = (p) => navigate(`/product/${p.slug || p.id}`);

  if (vendorItems.length === 0 && otherItems.length === 0) return null;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      {vendorItems.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold text-slate-800 px-4 mb-2">🏪 De la même boutique</h2>
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            {vendorItems.map(p => {
              const s = shops?.find(sh => sh.id === p.shop_id);
              return (
                <div key={p.id} style={{ minWidth: '110px', maxWidth: '110px', flexShrink: 0 }}>
                  <CompactProductCard product={p} shop={s} onClick={() => handleClick(p)} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {otherItems.length > 0 && (
        <div className="mb-5">
          <h2 className="text-sm font-bold text-slate-800 px-4 mb-2">✨ Produits similaires</h2>
          <div className="flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            {otherItems.map(p => {
              const s = shops?.find(sh => sh.id === p.shop_id);
              return (
                <div key={p.id} style={{ minWidth: '110px', maxWidth: '110px', flexShrink: 0 }}>
                  <CompactProductCard product={p} shop={s} onClick={() => handleClick(p)} />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}