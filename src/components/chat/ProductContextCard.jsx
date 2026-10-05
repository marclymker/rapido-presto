import React from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, Loader2 } from 'lucide-react';

export default function ProductContextCard({ productId }) {
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => firebaseApi.entities.Product.get(productId),
    enabled: !!productId
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="mb-4">
      {/* Message initial automatique */}
      <div className="flex justify-end mb-2">
        <div className="bg-orange-500 text-white p-3 rounded-2xl rounded-br-none max-w-[85%] shadow-sm text-sm">
          Cet article est-il toujours disponible?
        </div>
      </div>

      {/* Card du produit */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm max-w-sm mx-auto">
        <div className="flex gap-3 p-3">
          {product.image_url && (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-slate-800 truncate">
              {product.name}
            </h3>
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
              {product.description || 'Aucune description'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-bold text-orange-600">
                {product.promo_price || product.price} HTG
              </span>
              {product.promo_price && (
                <span className="text-xs text-slate-400 line-through">
                  {product.price} HTG
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="bg-slate-50 px-3 py-2 border-t text-xs text-slate-500 flex items-center gap-1">
          <ShoppingBag className="w-3 h-3" />
          Article concerné par la discussion
        </div>
      </div>
    </div>
  );
}
