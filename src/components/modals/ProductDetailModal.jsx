import React, { useState } from 'react';

import { Dialog, DialogContent } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import { Minus, Plus, Store, MessageSquare, Loader2, MapPin, X } from 'lucide-react';

import { applyClientMargin } from '@/components/utils/priceCalculation';

import { base44 } from '@/api/base44Client';



export default function ProductDetailModal({ product, shop, open, onClose, onAddToCart, user }) {

const [quantity, setQuantity] = useState(1);

const [isChatLoading, setIsChatLoading] = useState(false);


if (!product) return null;

const price = applyClientMargin(product.promo_price || product.price);



const handleContactVendor = async () => {

if (!user) return base44.auth.redirectToLogin(window.location.pathname);

const vendorId = shop?.user_id || product?.vendor_id;

const shopId = shop?.id;



if (!vendorId || !shopId) {

alert("Données incomplètes.");

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

if (response?.id || response.data?.id) {

window.location.href = `/chat?id=${response?.id || response.data.id}`;

}

} catch (error) {

alert("Erreur chat.");

} finally {

setIsChatLoading(false);

}

};



return (

<Dialog open={open} onOpenChange={onClose}>

{/* max-h-[90vh] pour forcer le modal à rester dans l'écran et overflow-hidden pour gérer le scroll interne */}

<DialogContent className="max-w-md p-0 overflow-hidden bg-white flex flex-col max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl border-none">


{/* HEADER AVEC IMAGE (Scrollable) */}

<div className="overflow-y-auto flex-1 custom-scrollbar">

{/* Image avec bouton fermer intégré */}

<div className="relative aspect-[4/3] sm:aspect-square w-full bg-slate-100">

<img src={product.image_url} alt="" className="w-full h-full object-contain" />

<button

onClick={onClose}

className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors"

>

<X size={20} />

</button>

</div>



<div className="p-5 space-y-4">

{/* Titre et Prix */}

<div className="space-y-1">

<h2 className="text-xl font-black text-slate-900 leading-tight">{product.name}</h2>

<div className="flex items-center gap-3">

<span className="text-2xl font-black text-orange-500">{price} HTG</span>

{product.promo_price && (

<span className="text-sm text-slate-400 line-through font-medium">

{applyClientMargin(product.price)} HTG

</span>

)}

</div>

</div>



{/* Description - Limitée visuellement mais scrollable */}

{product.description && (

<div className="py-2 border-t border-slate-50">

<h4 className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Description</h4>

<p className="text-slate-600 text-sm leading-relaxed">{product.description}</p>

</div>

)}



{/* Boutique - Plus compacte */}

{shop && (

<div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">

<div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 flex-shrink-0">

{shop.company_logo_url ? (

<img src={shop.company_logo_url} className="w-full h-full object-cover" alt="" />

) : (

<Store className="w-full h-full p-2 text-orange-600" />

)}

</div>

<div className="min-w-0">

<p className="font-bold text-sm text-slate-800 truncate">{shop.company_name}</p>

<p className="text-[10px] text-slate-500 flex items-center gap-1">

<MapPin size={10} /> {shop.region || 'Haïti'}

</p>

</div>

</div>

)}

</div>

</div>



{/* ACTIONS FIXÉES EN BAS (Sticky Footer) */}

<div className="p-4 bg-white border-t border-slate-100 space-y-3 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">

<div className="flex gap-2">

<Button

onClick={handleContactVendor}

disabled={isChatLoading}

variant="outline"

className="flex-1 py-6 border-slate-200 rounded-2xl hover:bg-slate-50"

>

{isChatLoading ? <Loader2 className="animate-spin" /> : <MessageSquare size={18} className="mr-2 text-orange-500" />}

Chat

</Button>



{shop?.company_category === "Mariage" && (

<Button

onClick={() => window.open('https://wa.me/c/50948690366', '_blank')}

className="flex-1 py-6 bg-[#25D366] hover:bg-[#1ebd57] text-white rounded-2xl"

>

WhatsApp

</Button>

)}

</div>



<div className="flex items-center gap-3">

{/* Sélecteur de quantité compact */}

<div className="flex items-center bg-slate-100 rounded-xl p-1">

<Button

size="icon"

variant="ghost"

className="h-8 w-8 rounded-lg"

onClick={() => setQuantity(Math.max(1, quantity - 1))}

>

<Minus size={14} />

</Button>

<span className="font-black text-sm w-8 text-center">{quantity}</span>

<Button

size="icon"

variant="ghost"

className="h-8 w-8 rounded-lg"

onClick={() => setQuantity(quantity + 1)}

>

<Plus size={14} />

</Button>

</div>



{/* Bouton Panier Principal */}

<Button

className="flex-1 py-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95"

onClick={() => { onAddToCart(product, quantity); onClose(); }}

>

Ajouter au panier

</Button>

</div>

</div>

</DialogContent>

</Dialog>

);

}