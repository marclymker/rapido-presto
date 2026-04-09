import { memo } from 'react';
import { Button } from "@/components/ui/button";
import { X, Loader2 } from 'lucide-react';
import { applyClientMargin } from '@/components/utils/priceCalculation';

const ProductPicker = memo(({ products, onSelect, onClose, isSending }) => {
  return (
    <div className="absolute bottom-[72px] left-0 right-0 bg-white border-t border-gray-200 shadow-2xl max-h-[50vh] overflow-y-auto z-20 rounded-t-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white">
        <h3 className="font-semibold text-[15px]">Choisir un produit</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
      </div>
      {products.length === 0 ? (
        <div className="p-8 text-center text-gray-400 flex flex-col items-center gap-2">
          <Loader2 className="animate-spin" />Chargement...
        </div>
      ) : (
        <div className="p-2 space-y-1">
          {products.map(p => (
            <button key={p.id} onClick={() => onSelect(p)} disabled={isSending}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[#F0F2F5] text-left transition-colors">
              {p.image_url && (
                <img src={`${p.image_url}?width=100&quality=60`} alt={p.name}
                  className="w-12 h-12 object-cover rounded-lg flex-shrink-0" loading="lazy" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                <p className="text-sm font-bold text-[#0084FF]">{applyClientMargin(p.promo_price || p.price).toLocaleString()} HTG</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

ProductPicker.displayName = 'ProductPicker';
export default ProductPicker;