import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Store, MessageSquare, Loader2 } from 'lucide-react';
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

        <div className="flex justify-between items-center mb-6">
          <span className="text-2xl font-bold text-orange-600">{price} HTG</span>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleContactVendor}
            disabled={isChatLoading}
            className="w-full py-6 bg-slate-900 hover:bg-black text-white rounded-xl flex gap-2"
          >
            {isChatLoading ? <Loader2 className="animate-spin" /> : <MessageSquare size={20} />}
            {isChatLoading ? "Ouverture..." : "Contacter le Vendeur"}
          </Button>

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