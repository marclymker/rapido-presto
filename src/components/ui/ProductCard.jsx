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

  // Définition du texte selon le nom de la boutique
  const fastText = shop?.name === "MAKARIOS BRIDAL" ? "Réponse Rapide" : "Livraison Rapide";

  return (
    <div
      id={`product-card-${product.id}`}
      className="group relative bg-white rounded-2xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col h-full border border-slate-100 overflow-hidden"
    >
      {/* --- ZONE IMAGE ET BADGES --- */}
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        {/* Badge Flottant Promo */}
        {hasPromo && shop?.company_category !== "Mariage" && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black z-20 shadow-sm">
            -{Math.round((1 - product.promo_price / product.price) * 100)}%
          </div>
        )}

        {/* Bouton Ajout Panier */}
        {product.is_available !== false && (
          <button
            className="absolute top-2 right-2 z-20 bg-white/90 backdrop-blur-sm text-[#25D366] w-8 h-8 rounded-full shadow-md flex items-center justify-center hover:bg-[#25D366] hover:text-white transition-all active:scale-90"
            onClick={(e) => { e.stopPropagation(); onAdd(product); }}
          >
            <Plus size={20} strokeWidth={3} />
          </button>
        )}

        {/* Logo MonCash en bas à gauche */}
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694b478cc984102a3c47c781/47cfe0ecf_image.png"
          alt="MonCash"
          className="absolute bottom-2 left-2 h-3 opacity-70 group-hover:opacity-100 transition-opacity z-10"
        />

        {/* Image */}
        <div
          className="w-full h-full p-2 cursor-pointer touch-manipulation"
          onClick={() => product.is_available !== false && onClick && onClick(product)}
        >
          {product.image_url ? (
            <img
              src={`${product.image_url}${product.image_url?.includes('?') ? '&' : '?'}w=300&q=75`}
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
              alt={product.name}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 italic text-[10px]">
              <span className="text-2xl mb-1">🍽️</span>
              Photo à venir
            </div>
          )}
        </div>

        {/* Overlay Indisponible */}
        {!product.is_available && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] flex items-center justify-center z-10">
            <span className="bg-slate-800 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Épuisé</span>
          </div>
        )}
      </div>

      {/* --- ZONE CONTENU --- */}
      <div className="p-3 flex flex-col flex-grow gap-1">
        
        {/* Badge Dynamique : Livraison ou Réponse Rapide */}
        <div className="flex items-center gap-1 text-amber-600 bg-amber-50 w-fit px-2 py-0.5 rounded-md mb-1">
          <Zap size={10} fill="currentColor" />
          <span className="text-[9px] font-bold uppercase tracking-wider">{fastText}</span>
        </div>

        {/* Prix principal */}
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {displayPrice.toLocaleString()} <span className="text-[10px] font-bold">HTG</span>
            </span>
            {hasPromo && (
              <span className="text-[10px] text-slate-400 line-through decoration-red-400/50">
                {originalDisplayPrice}
              </span>
            )}
          </div>
          
          {/* Badge Livraison Gratuite si prix >= 3000 */}
          {displayPrice >= 3000 && (
            <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-0.5 rounded-md w-fit">
              <Truck size={10} />
              <span className="text-[9px] font-bold uppercase">Livraison Gratuite</span>
            </div>
          )}
        </div>

        {/* Nom du produit */}
        <h3 className="text-xs text-slate-600 font-medium leading-tight line-clamp-2 h-8 group-hover:text-orange-600 transition-colors">
          {product.name}
        </h3>

        {/* Product ID */}
        {!hideId && (
          <>
            <p className="text-[9px] text-slate-400 font-mono">ID: {product.id}</p>
            {/* Availability */}
            <p className={`text-[9px] font-bold ${product.is_available !== false && product.stock_quantity !== 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.is_available !== false && product.stock_quantity !== 0 ? 'In stock' : 'Out of stock'}
            </p>
          </>
        )}

        {/* Footer info (Livraison & Paiement) */}
        <div className="mt-auto pt-2 flex items-center justify-between border-t border-slate-50">
          <div className="flex items-center gap-1 text-slate-400 font-medium">
            <Clock size={10} />
            <span className="text-[9px]">{product.delivery_time || 'Express'}</span>
          </div>
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694b478cc984102a3c47c781/47cfe0ecf_image.png"
            alt="MonCash"
            className="h-3 opacity-80 grayscale group-hover:grayscale-0 transition-all"
          />
        </div>
      </div>

      {/* Bouton WhatsApp pour MAKARIOS BRIDAL, Chat pour les autres */}
      {shop?.company_name?.toUpperCase().includes('MAKARIOS BRIDAL') ? (
        <button
          className="m-2 bg-[#25D366] text-white py-1.5 rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold hover:bg-green-600 transition-colors"
          onClick={(e) => { e.stopPropagation(); window.open('https://wa.me/c/50948690366', '_blank'); }}
        >
          <MessageCircle size={14} /> WhatsApp
        </button>
      ) : (
        <div className="m-2" onClick={(e) => e.stopPropagation()}>
          <ChatButton product={product} shop={shop} />
        </div>
      )}
    </div>
  );
}