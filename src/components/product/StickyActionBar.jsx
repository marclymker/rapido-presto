import React from 'react';
import { ShoppingCart, MessageCircle, CreditCard } from 'lucide-react';

export default function StickyActionBar({ onAddToCart, onWhatsApp, onCheckout, price, loading }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-lg px-4 py-3 pb-safe"
      style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
      <div className="flex gap-2 max-w-lg mx-auto">
        <button
          onClick={onWhatsApp}
          className="flex items-center justify-center gap-1.5 bg-[#25D366] text-white font-bold rounded-xl px-4 py-3 text-sm active:scale-95 transition-transform flex-shrink-0"
        >
          <MessageCircle size={18} />
          <span className="hidden sm:inline">WhatsApp</span>
        </button>
        <button
          onClick={onAddToCart}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 text-white font-bold rounded-xl py-3 text-sm active:scale-95 transition-transform"
        >
          <ShoppingCart size={18} />
          Ajouter au panier
        </button>
        <button
          onClick={onCheckout}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 text-white font-bold rounded-xl py-3 text-sm active:scale-95 transition-transform"
        >
          <CreditCard size={18} />
          Payer
        </button>
      </div>
    </div>
  );
}