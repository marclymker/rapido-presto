import React from 'react';
import { Plus, MessageCircle, Clock, Zap, Truck } from 'lucide-react';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import ChatButton from '@/components/chat/ChatButton';

export default function ProductCard({ product, onAdd, onClick, shop, hideId = false }) {
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const displayPrice = hasPromo
    ? applyClientMargin(product.promo_price)
    : applyClientMargin(product.price);
  const originalDisplayPrice = applyClientMargin(product.price);

  const fastText = shop?.name === "MAKARIOS BRIDAL" ? "Réponse" : "Livraison";

  return (
    <div
      id={`product-card-${product.id}`}
      className="group relative bg-white rounded-xl transition-all duration-300 flex flex-col h-full border border-slate-100 overflow-hidden"
    >
      {/* 1. ZONE IMAGE (Plus compacte) */}
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        {hasPromo && (
          <div className="absolute top-1 left-1 bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black z-20">
            -{Math.round((1 - product.promo_price / product.price) * 100)}%
          </div>
        )}

        {product.is_available !== false && (
          <button
            className="absolute top-1 right-1 z-20 bg-white/90 text-[#25D366] w-7 h-7 rounded-full shadow-sm flex items-center justify-center active:scale-90"
            onClick={(e) => { e.stopPropagation(); onAdd(product); }}
          >
            <Plus size={18} strokeWidth={3} />
          </button>
        )}

        <div
          className="w-full h-full p-1 cursor-pointer"
          onClick={() => product.is_available !== false && onClick && onClick(product)}
        >
          <img
            src={`${product.image_url}${product.image_url?.includes('?') ? '&' : '?'}w=300&q=75`}
            className="w-full h-full object-contain"
            alt={product.name}
            loading="lazy"
          />
        </div>
      </div>

      {/* 2. ZONE CONTENU (Ordre inversé : Prix puis Titre) */}
      <div className="p-2 flex flex-col gap-0.5">
        
        {/* Badge ultra-compact */}
        <div className="flex items-center gap-0.5 text-amber-600 mb-0.5">
          <Zap size={8} fill="currentColor" />
          <span className="text-[8px] font-bold uppercase">{fastText} Rapide</span>
        </div>

        {/* LE PRIX (Maintenant en premier) */}
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-black text-slate-900 leading-none">
            {displayPrice.toLocaleString()} <span className="text-[8px] font-medium">HTG</span>
          </span>
          {hasPromo && (
            <span className="text-[8px] text-slate-400 line-through font-normal">
              {originalDisplayPrice}
            </span>
          )}
        </div>

        {/* LE TITRE (Strictement 1 ligne avec truncate) */}
        <h3 className="text-[10px] text-slate-500 font-medium truncate w-full" title={product.name}>
          {product.name}
        </h3>

        {/* Livraison Gratuite (Si applicable) */}
        {displayPrice >= 3000 && (
          <div className="flex items-center gap-1 text-green-600 text-[8px] font-bold">
            <Truck size={10} /> Livraison Offerte
          </div>
        )}
      </div>

      {/* 3. BOUTON D'ACTION (Plus fin) */}
      <div className="px-2 pb-2 mt-auto">
        {shop?.company_name?.toUpperCase().includes('MAKARIOS BRIDAL') ? (
          <button
            className="w-full bg-[#25D366] text-white py-1 rounded-md flex items-center justify-center gap-1 text-[9px] font-bold"
            onClick={(e) => { e.stopPropagation(); window.open('https://wa.me/c/50948690366', '_blank'); }}
          >
            <MessageCircle size={12} /> WhatsApp
          </button>
        ) : (
          <div onClick={(e) => e.stopPropagation()}>
            <ChatButton product={product} shop={shop} />
          </div>
        )}
      </div>
    </div>
  );
}