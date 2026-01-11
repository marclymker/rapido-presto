import React, { useState } from 'react';
import { 
  Plus, 
  MessageCircle, 
  Clock, 
  Star, 
  ShoppingCart, 
  Heart
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MOCK UTILS & DATA ---
const applyClientMargin = (price) => {
  if (!price) return 0;
  return Math.round(price * 1.0);
};

// Mock du bouton Chat
const ChatButton = ({ product, shop }) => (
  <button className="w-full bg-slate-800 text-white text-[10px] py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition-all">
    <MessageCircle size={12} />
    Discuter
  </button>
);

// --- COMPOSANT PRODUCT CARD ---
// Note: J'ai retiré 'export default' ici pour le mettre sur la DemoGrid à la fin
function ProductCard({ product, onAdd, onClick, shop }) {
  const [showChatButton, setShowChatButton] = useState(false);
  
  // Sécurité : si pas de produit, rendu vide ou squelette
  if (!product) {
    return (
      <div className="bg-slate-50 rounded-xl h-full w-full animate-pulse border border-slate-100 flex items-center justify-center">
        <span className="text-slate-300 text-xs">Chargement...</span>
      </div>
    );
  }

  const price = product.price || 0;
  const promoPrice = product.promo_price;
  const hasPromo = promoPrice && promoPrice < price;
  
  const displayPrice = hasPromo 
    ? applyClientMargin(promoPrice) 
    : applyClientMargin(price);
    
  const originalDisplayPrice = applyClientMargin(price);
  
  const discountPercent = (hasPromo && price > 0)
    ? Math.round((1 - promoPrice / price) * 100) 
    : 0;

  const rating = product.rating || 4.5;
  const reviews = product.reviews_count || Math.floor(Math.random() * 200) + 10;

  return (
    <div 
      id={`product-card-${product.id}`}
      className="group relative bg-white rounded-xl transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:-translate-y-1 flex flex-col h-full border border-slate-200 overflow-hidden"
      onMouseEnter={() => setShowChatButton(true)}
      onMouseLeave={() => setShowChatButton(false)}
      onClick={() => product.is_available !== false && onClick && onClick(product)}
    >
      {/* ZONE IMAGE */}
      <div className="relative aspect-square overflow-hidden bg-white p-4">
        
        {/* Badge Promo */}
        {hasPromo && (
          <div className="absolute top-0 left-0 bg-[#CC0C39] text-white text-xs font-bold px-2 py-1 rounded-br-lg z-20 shadow-sm">
            -{discountPercent}%
          </div>
        )}

        {/* Badge Best Seller */}
        {reviews > 100 && (
          <div className="absolute top-0 right-0 bg-[#e67a00] text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg z-20 shadow-sm uppercase tracking-wider">
            Best Seller
          </div>
        )}

        {/* Image */}
        <div className="w-full h-full flex items-center justify-center relative z-10">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              className="max-w-full max-h-full object-contain transition-transform duration-500 group-hover:scale-110 mix-blend-multiply"
              alt={product.name}
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-300 italic text-xs">
              <span className="text-2xl mb-1">📷</span>
              Photo à venir
            </div>
          )}
        </div>

        {/* Overlay Rupture */}
        {!product.is_available && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-30">
            <span className="bg-slate-800 text-white px-3 py-1 rounded bg-opacity-90 text-xs font-bold uppercase">
              Rupture
            </span>
          </div>
        )}

        {/* Actions Rapides */}
        <div className="absolute bottom-2 right-2 flex flex-col gap-2 translate-y-10 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-20">
          <button 
            className="bg-white text-slate-400 hover:text-red-500 w-8 h-8 rounded-full shadow-md border border-slate-100 flex items-center justify-center transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Heart size={16} />
          </button>
          {product.is_available !== false && (
            <button 
              className="bg-orange-500 text-white w-8 h-8 rounded-full shadow-md flex items-center justify-center hover:bg-orange-600 transition-all active:scale-90"
              onClick={(e) => { e.stopPropagation(); onAdd && onAdd(product); }}
            >
              <ShoppingCart size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ZONE CONTENU */}
      <div className="p-3 flex flex-col flex-grow relative bg-white">
        
        <h3 className="text-sm text-slate-700 font-medium leading-tight line-clamp-2 mb-1 group-hover:text-orange-600 group-hover:underline transition-colors cursor-pointer min-h-[2.5em]">
          {product.name}
        </h3>

        <div className="flex items-center gap-1 mb-2">
          <div className="flex text-yellow-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                size={12} 
                className={star <= Math.round(rating) ? "fill-current" : "text-slate-200 fill-slate-200"} 
              />
            ))}
          </div>
          <span className="text-[10px] text-slate-400">({reviews})</span>
        </div>

        <div className="mt-auto">
          <div className="flex items-baseline gap-1.5">
            <span className="text-lg font-black text-orange-600 tracking-tight">
              {displayPrice.toLocaleString()} <span className="text-xs font-bold text-orange-600">HTG</span>
            </span>
            {hasPromo && (
              <span className="text-[10px] text-slate-400 line-through">
                {originalDisplayPrice.toLocaleString()} HTG
              </span>
            )}
          </div>
          
          <div className="mt-2 pt-2 border-t border-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
              <Clock size={10} />
              <span>{product.delivery_time || '24h-48h'}</span>
            </div>
             <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694b478cc984102a3c47c781/47cfe0ecf_image.png" 
              alt="MonCash" 
              className="h-3 opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all"
            />
          </div>
        </div>

        <AnimatePresence>
          {shop && showChatButton && shop.company_category !== "Mariage" && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-2 bottom-2 z-30 hidden sm:block"
              onClick={(e) => e.stopPropagation()}
            >
              <ChatButton product={product} shop={shop} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {shop?.company_category === "Mariage" && (
        <div className="px-2 pb-2 bg-white">
          <button 
            className="w-full bg-[#25D366] text-white py-2 rounded-lg flex items-center justify-center gap-2 text-xs font-bold hover:bg-[#20bd5a] transition-colors shadow-sm"
            onClick={(e) => { e.stopPropagation(); window.open('https://wa.me/c/50948690366', '_blank'); }}
          >
            <MessageCircle size={16} fill="white" /> 
            WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}

// --- DEMO GRID (Export par défaut pour l'aperçu) ---
export default function DemoGrid() {
  const MOCK_SHOP_NORMAL = { company_category: "Electronics", id: 1 };
  const MOCK_SHOP_MARIAGE = { company_category: "Mariage", id: 2 };

  const products = [
    {
      id: 1,
      name: "Robe de Mariée Dentelle Bohème Chic",
      price: 45000,
      promo_price: 38500,
      image_url: "https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=400&q=80",
      rating: 4.8,
      is_available: true,
      shop: MOCK_SHOP_MARIAGE
    },
    {
      id: 2,
      name: "Casque Audio Bluetooth Sans Fil Pro",
      price: 3500,
      image_url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80",
      rating: 4.2,
      is_available: true,
      shop: MOCK_SHOP_NORMAL
    },
    {
      id: 3,
      name: "Montre Connectée Sport GPS",
      price: 8900,
      promo_price: 4450,
      image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80",
      rating: 5.0,
      is_available: false,
      shop: MOCK_SHOP_NORMAL
    }
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <h2 className="text-xl font-bold mb-6 text-slate-800">Aperçu du composant ProductCard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {products.map(p => (
          <div key={p.id} className="h-[380px]">
            <ProductCard 
              product={p} 
              shop={p.shop}
              onAdd={() => alert("Ajouté!")}
              onClick={() => alert("Clic produit")}
            />
          </div>
        ))}
      </div>
    </div>
  );
}