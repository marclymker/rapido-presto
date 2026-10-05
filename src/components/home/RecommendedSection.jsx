import React, { useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, Zap } from 'lucide-react';
import { firebaseApi } from '@/api/firebaseClient';
import { createPageUrl } from '@/utils';
import { getClientPrice } from '@/components/utils/priceCalculation';
import { toast } from 'sonner';

const ROW_TITLES = ["Inspiré de votre historique", "Les clients ont aussi acheté", "Recommandé pour vous"];

export default function RecommendedSection({ allProducts, shops, user, setSelectedShop, setSelectedProduct }) {
  const rowContainers = [useRef(null), useRef(null), useRef(null)];

  const getSafeProducts = useCallback(() => Array.isArray(allProducts) ? allProducts : [], [allProducts]);

  const productRows = useMemo(() => {
    const safeProducts = getSafeProducts();
    if (!shops.length || !safeProducts.length) return [[], [], []];

    const shopsMap = new Map(shops.map(s => [s.id, s]));
    const makariosProducts = [];
    const otherProducts = [];

    for (const p of safeProducts) {
      if (!p.image_url || p.is_available === false) continue;
      const shop = shopsMap.get(p.shop_id);
      if (!shop) continue;
      if (shop.company_name?.toLowerCase().includes('makarios')) {
        makariosProducts.push(p);
      } else {
        otherProducts.push(p);
      }
    }

    const ITEMS_PER_ROW = 8;
    const MAKARIOS_COUNT = Math.floor(ITEMS_PER_ROW * 0.3);
    const OTHERS_COUNT = ITEMS_PER_ROW - MAKARIOS_COUNT;

    const shuffleAndSlice = (arr, count) => {
      const shuffled = [...arr];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled.slice(0, count);
    };

    return [0, 1, 2].map(() => [
      ...shuffleAndSlice(makariosProducts, MAKARIOS_COUNT),
      ...shuffleAndSlice(otherProducts, OTHERS_COUNT)
    ]);
  }, [getSafeProducts, shops]);

  const handleScroll = (index, direction) => {
    rowContainers[index].current?.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  if (!productRows[0]?.length) return null;

  return (
    <div className="mt-8 space-y-6">
      {productRows.map((rowProducts, rowIndex) => (
        <div key={rowIndex} className="bg-white p-3 md:p-4 rounded-sm border border-gray-200 relative group/carousel shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-3">{ROW_TITLES[rowIndex]}</h3>

          <button onClick={() => handleScroll(rowIndex, 'left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 h-24 w-10 shadow-md border rounded-r-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:bg-white">
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <button onClick={() => handleScroll(rowIndex, 'right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 h-24 w-10 shadow-md border rounded-l-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:bg-white">
            <ArrowLeft className="w-6 h-6 text-gray-600 rotate-180" />
          </button>

          <div ref={rowContainers[rowIndex]} className="flex overflow-x-auto gap-2 pb-2 scroll-smooth no-scrollbar">
            {rowProducts.map((product, idx) => {
              const shop = shops.find(s => s.id === product.shop_id);
              if (!shop) return null;
              const price = getClientPrice(product);
              const isMakarios = shop?.company_name?.toLowerCase().includes('makarios bridal');

              return (
                <div
                  key={`${product.id}-${idx}`}
                  className="flex-shrink-0 w-[130px] md:w-[150px] bg-white p-1 cursor-pointer transition-all hover:bg-gray-50 relative group"
                  onClick={() => {
                    if (!user) { firebaseApi.auth.redirectToLogin(window.location.pathname); return; }
                    const targetProduct = getSafeProducts().find(p => p.id === product.id);
                    if (!targetProduct || !shop) { toast.error('Boutique non disponible'); return; }
                    if (shop.slug && targetProduct.id) {
                      window.location.href = createPageUrl('ShopView') + `?slug=${shop.slug}&product=${targetProduct.id}`;
                    } else {
                      setSelectedShop(shop);
                      setSelectedProduct(targetProduct);
                    }
                  }}
                >
                  <div className="aspect-square bg-gray-50 mb-1.5 rounded overflow-hidden p-1 relative">
                    <img
                      src={`${product.image_url}${product.image_url?.includes('?') ? '&' : '?'}w=200&q=75`}
                      alt={product.name}
                      className="w-full h-full object-contain mix-blend-multiply"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className={`absolute bottom-1 right-1 flex items-center gap-0.5 px-1 rounded-sm text-[7px] font-black uppercase shadow-sm ${isMakarios ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'}`}>
                      <Zap size={7} fill="currentColor" />
                      {isMakarios ? 'Réponse' : 'Livraison'}
                    </div>
                  </div>
                  <div className="font-black text-sm text-slate-900 leading-none px-1">
                    {Math.floor(price).toLocaleString()} <span className="text-[8px]">HTG</span>
                  </div>
                  <div className="text-[10px] text-slate-500 truncate mt-1 w-full px-1 leading-tight">{product.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
