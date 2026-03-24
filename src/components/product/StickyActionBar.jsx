import React, { useState } from 'react';
import { MessageCircle, ShoppingCart, CreditCard, Minus, Plus } from 'lucide-react';

export default function StickyActionBar({ product, shop, price, onAddToCart, onPayNow, onWhatsApp, loading }) {
  const [qty, setQty] = useState(1);

  const handleAdd = () => onAddToCart(qty);
  const handlePay = () => onPayNow(qty);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg"
      style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
    >
      {/* Qty + prix */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-full">
            <button
              onClick={() => setQty(q => Math.max(1, q - 1))}
              className="w-8 h-8 flex items-center justify-center text-slate-700 font-bold text-lg rounded-full active:bg-slate-200"
            >−</button>
            <span className="w-8 text-center text-sm font-bold text-slate-800">{qty}</span>
            <button
              onClick={() => setQty(q => q + 1)}
              className="w-8 h-8 flex items-center justify-center text-slate-700 font-bold text-lg rounded-full active:bg-slate-200"
            >+</button>
          </div>
          <span className="text-lg font-black text-orange-500">{(price * qty).toLocaleString()} HTG</span>
        </div>
        <button
          onClick={onWhatsApp}
          className="flex items-center gap-1.5 bg-[#25D366] text-white font-bold rounded-full px-4 py-2 text-sm active:opacity-80"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-1">
        <button
          onClick={handleAdd}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-800 text-white font-bold rounded-xl py-3 text-sm active:opacity-80 disabled:opacity-60"
        >
          <ShoppingCart className="w-4 h-4" />
          Ajouter
        </button>
        <button
          onClick={handlePay}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white font-bold rounded-xl py-3 text-sm active:opacity-80 disabled:opacity-60"
        >
          <CreditCard className="w-4 h-4" />
          Payer maintenant
        </button>
      </div>
    </div>
  );
}