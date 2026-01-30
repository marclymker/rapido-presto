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

  const fastText = shop?.name === "MAKARIOS BRIDAL" ? "Réponse Rapide" : "Livraison Rapide";

  return (
    <div
      id={`product-card-${product.id}`}
      className="group relative bg-white rounded-xl transition-all duration-300 hover:shadow-lg flex flex-col h-full border border-slate-100 overflow-hidden"
    >
      {/* --- ZONE IMAGE --- */}
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        {hasPromo && shop?.company_category !== "Mariage" && (
          <div className="absolute top-1 left-1 bg-red-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-black z-20 shadow-sm">
            -{Math.round((1 - product.promo_price / product.price) * 100)}%
          </div>
        )}

        {product.is_available !== false && (
          <button
            className="absolute top-1 right-1 z-20 bg-white/90 backdrop-blur-sm text-[#25D366] w-7 h-7 rounded-full shadow-md flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all"
            onClick={(e) => { e.stopPropagation(); onAdd(product); }}
          >
            <Plus size={18} strokeWidth={3} />
          </button>
        )}

        <div
          className="w-full h-full p-1 cursor-pointer"
          onClick={() => product.is_available !== false && onClick && onClick(product)}
        >
          {product.image_url ? (
            <img
              src={`${product.image_url}${product.image_url?.includes('?') ? '&' : '?'}w=300&q=75`}
              className="w-full h-full object-contain"
              alt={product.name}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300 text-[9px]">Photo à venir</div>
          )}
        </div>

        {!product.is_available && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
            <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase">Épuisé</span>
          </div>
        )}
      </div>

      {/* --- ZONE CONTENU OPTIMISÉE --- */}
      <div className="p-2 flex flex-col flex-grow">
        
        {/* Badge Compact */}
        <div className="flex items-center gap-1 text-amber-600 mb-1">
          <Zap size={9} fill="currentColor" />
          <span className="text-[8px] font-bold uppercase tracking-tight">{fastText}</span>
        </div>

        {/* Prix (Priorité visuelle) */}
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-black text-slate-900 leading-none">
            {displayPrice.toLocaleString()} <span className="text-[8px]">HTG</span>
          </span>
          {hasPromo && (
            <span className="text-[8px] text-slate-400 line-through">
              {originalDisplayPrice}
            </span>
          )}
        </div>

        {/* Nom du produit (Une seule ligne) */}
        <h3 className="text-[11px] text-slate-600 font-medium truncate mt-0.5 mb-1 group-hover:text-orange-600">
          {product.name}
        </h3>

        {/* Livraison gratuite si éligible */}
        {displayPrice >= 3000 && (
          <div className="flex items-center gap-1 text-green-700 text-[8px] font-bold uppercase mb-1">
            <Truck size={10} /> Livraison Offerte
          </div>
        )}

        {/* Footer info réduit */}
        <div className="mt-auto pt-1 flex items-center justify-between border-t border-slate-50">
          <div className="flex items-center gap-1 text-slate-400">
            <Clock size={9} />
            <span className="text-[8px]">{product.delivery_time || 'Express'}</span>
          </div>
        </div>
      </div>

      {/* Boutons d'Action */}
      <div className="px-2 pb-2 mt-1">
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