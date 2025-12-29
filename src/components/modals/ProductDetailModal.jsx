import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Store, MessageSquare, Loader2, MapPin } from 'lucide-react';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { base44 } from '@/api/base44Client';

export default function ProductDetailModal({ product, shop, open, onClose, onAddToCart, user }) {
  const [quantity, setQuantity] = useState(1);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  if (!product) return null;
  const price = applyClientMargin(product.promo_price || product.price);

  const handleContactVendor = async () => {
    if (!user) return base44.auth.redirectToLogin(window.location.pathname);
    
    // Validation des champs REQUIRED de votre schéma
    const vendorId = shop?.user_id || product?.vendor_id;
    const shopId = shop?.id;

    if (!vendorId || !shopId) {
      alert("Données de la boutique incomplètes pour lancer le chat.");
      return;
    }

    setIsChatLoading(true);
    try {
      const response = await base44.functions.invoke('chatService', {
        action: 'init',
        vendor_id: vendorId,
        shop_id: shopId,
        shop_name: shop.company_name,
        shop_logo: shop.company_logo_url,
        product_id: product.id,
        product_name: product.name,
        initial_message: `Bonjour, je suis intéressé par : ${product.name}`
      });

      const conversation = response.data || response;
      if (conversation?.id) {
        window.location.href = `/chat?id=${conversation.id}`;
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'initialisation du chat.");
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-6 bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{product.name}</DialogTitle>
        </DialogHeader>
        
        <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 my-4">
          <img src={product.image_url} alt="" className="w-full h-full object-cover" />
        </div>

        {/* Description */}
        {product.description && (
          <div className="mb-4">
            <p className="text-slate-600 text-sm leading-relaxed">{product.description}</p>
          </div>
        )}

        {/* Prix */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-2xl font-bold text-orange-600">{price} HTG</span>
          {product.promo_price && (
            <span className="text-slate-400 line-through text-sm">{applyClientMargin(product.price)} HTG</span>
          )}
        </div>

        {/* Boutique */}
        {shop && (
          <div className="bg-slate-50 rounded-xl p-3 mb-4 flex items-center gap-3">
            {shop.company_logo_url ? (
              <img src={shop.company_logo_url} className="w-10 h-10 rounded-full object-cover" alt="" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Store className="w-5 h-5 text-orange-600" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-semibold text-slate-800">{shop.company_name}</p>
              {shop.region && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {shop.region}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* Contacter le Vendeur */}
          <Button
            onClick={handleContactVendor}
            disabled={isChatLoading}
            className="w-full py-6 bg-slate-900 hover:bg-black text-white rounded-xl flex gap-2"
          >
            {isChatLoading ? <Loader2 className="animate-spin" /> : <MessageSquare size={20} />}
            {isChatLoading ? "Ouverture..." : "Contacter le Vendeur"}
          </Button>

          {/* WhatsApp pour Mariage */}
          {shop?.company_category === "Mariage" && (
            <Button
              onClick={async () => {
                const isAuth = await base44.auth.isAuthenticated();
                if (!isAuth) {
                  base44.auth.redirectToLogin(window.location.pathname);
                } else {
                  window.open('https://wa.me/c/50948690366', '_blank');
                }
              }}
              className="w-full py-6 bg-[#25D366] hover:bg-green-600 text-white rounded-xl flex gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Catalogue Mariage WhatsApp
            </Button>
          )}

          {/* Ajouter au panier */}
          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={16} /></Button>
              <span className="font-bold w-4 text-center">{quantity}</span>
              <Button size="icon" variant="ghost" onClick={() => setQuantity(quantity + 1)}><Plus size={16} /></Button>
            </div>
            <Button className="bg-orange-500 text-white" onClick={() => { onAddToCart(product, quantity); onClose(); }}>
              Ajouter au panier
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}