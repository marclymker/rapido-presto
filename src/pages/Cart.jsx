import React, { useState, useEffect } from 'react';

import { base44 } from '@/api/base44Client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Link, useNavigate } from 'react-router-dom';

import { createPageUrl } from '@/utils';

import {

ArrowLeft, Plus, Minus, Trash2, CreditCard, Wallet, Banknote,

Clock, AlertTriangle, Copy, Check, Info, MapPin, Edit3,

ShoppingBag, Zap, Loader2, ChevronRight

} from 'lucide-react';

import { Button } from "@/components/ui/button";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Label } from "@/components/ui/label";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";

import { motion, AnimatePresence } from 'framer-motion';

import { getHaitiTime } from '@/components/utils/dateFormat';

import SquarePaymentForm from '@/components/payment/SquarePaymentForm';

import { useAuth } from '@/components/auth/useAuth';
import { useGuestCart } from '@/components/cart/useGuestCart';
import { useBackButton } from '@/components/navigation/useBackButton';

import { applyClientMargin } from '@/components/utils/priceCalculation';
import { trackMetaEvent } from '@/components/utils/metaTracking';



// --- LOGIQUE DES FRAIS ---

function calculateDeliveryFee(clientCommune, shopCommune) {

const hour = getHaitiTime().getHours();

const sameCommune = clientCommune === shopCommune;

if (hour >= 8 && hour < 11) return sameCommune ? 300 : 500;

if (hour >= 12 && hour < 15) return sameCommune ? 400 : 750;

if (hour >= 16 && hour < 21) return sameCommune ? 300 : 500;

if (hour >= 21 && hour < 23) return sameCommune ? 500 : 750;

return sameCommune ? 400 : 600;

}



function generateConfirmationCode() {

return Math.floor(1000 + Math.random() * 9000).toString();

}



function calculateMoncashFee(amount) {

if (amount <= 10) return 0;

if (amount <= 100) return 5;

if (amount <= 250) return 10;

if (amount <= 500) return 15;

if (amount <= 1000) return 25;

if (amount <= 2000) return 45;

if (amount <= 4000) return 75;

if (amount <= 7500) return 115;

if (amount <= 10000) return 145;

if (amount <= 15000) return 185;

if (amount <= 20000) return 225;

if (amount <= 25000) return 270;

if (amount <= 30000) return 315;

if (amount <= 40000) return 380;

if (amount <= 50000) return 450;

if (amount <= 60000) return 525;

if (amount <= 75000) return 600;

return amount * 0.01;

}



function calculateNatcashFee(amount) {

const feeRanges = [

{ min: 20, max: 99, fee: 5.50 }, { min: 100, max: 249, fee: 11.50 },

{ min: 250, max: 499, fee: 13.50 }, { min: 500, max: 999, fee: 21.00 },

{ min: 1000, max: 1999, fee: 41.00 }, { min: 2000, max: 3999, fee: 68.00 },

{ min: 4000, max: 7999, fee: 97.00 }, { min: 8000, max: 11999, fee: 125.00 },

{ min: 12000, max: 19999, fee: 165.00 }, { min: 20000, max: 40000, fee: 274.00 }

];

for (const range of feeRanges) {

if (amount >= range.min && amount <= range.max) return range.fee;

}

return amount > 40000 ? 274.00 + Math.floor((amount - 40000) / 20000) * 100 : 0;

}



const ACCOUNTS = {

moncash: { number: "50948690366", name: "Marc lymker JEAN" },

natcash: { number: "3527-0511", name: "Rebecca Christa Rigaud" }

};



export default function Cart() {

const { user, isLoading: authLoading } = useAuth();
const { guestCart, updateGuestCartItem, removeFromGuestCart } = useGuestCart();

const [step, setStep] = useState('cart');

const [paymentMethod, setPaymentMethod] = useState('card');

const [paymentPlan, setPaymentPlan] = useState('full');

const [deliveryOption, setDeliveryOption] = useState('address');

const [orderNumber, setOrderNumber] = useState('');

const [confirmCode, setConfirmCode] = useState('');

const [specialInstructions, setSpecialInstructions] = useState('');

const [transactionCode, setTransactionCode] = useState('');

const [copiedState, setCopiedState] = useState({ account: false, amount: false });

const [squareToken, setSquareToken] = useState(null);

const [isEditingAddress, setIsEditingAddress] = useState(false);

const [tempAddress, setTempAddress] = useState('');


const queryClient = useQueryClient();

const navigate = useNavigate();

// Gérer le bouton retour natif
useBackButton(() => {
  if (step === 'checkout') {
    setStep('cart');
  } else if (step === 'confirmed') {
    navigate(createPageUrl('Home'));
  } else {
    navigate(-1);
  }
}, step !== 'cart' || true);



// Removed redirect - allow guest users to view cart



useEffect(() => {

if (user?.address) {

setTempAddress(user.address);

}

}, [user]);



const { data: dbCartItems = [], isLoading: loadingCart } = useQuery({

queryKey: ['cart', user?.id],

queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),

enabled: !!user?.id

});

// Combine guest cart and DB cart
const cartItems = user ? dbCartItems : guestCart;



// --- LOGIQUE ARTICLES SIMILAIRES ---

const { data: similarProducts = [], isLoading: loadingSimilar } = useQuery({

queryKey: ['similar-cart', cartItems[0]?.product_id],

queryFn: async () => {

if (!cartItems[0]?.product_id) return [];


// On récupère les détails du premier produit du panier pour avoir sa catégorie

const products = await base44.entities.Product.filter({ id: cartItems[0].product_id });

const product = products?.[0];


if (!product?.category) return [];



// On utilise la fonction getSimilarProducts pour la cohérence

const response = await base44.functions.invoke('getSimilarProducts', {

product_id: product.id,

category: product.category,

limit: 4

});


return response?.data?.data || response?.data || [];

},

enabled: cartItems.length > 0

});



const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price + (item.total_customization_price || 0)) * item.quantity, 0);


const getDeliveryPrice = () => {

if (deliveryOption === 'makarios_pap') return 250;

if (deliveryOption === 'makarios_cap') return 1000;

return 300;

};



const deliveryFee = getDeliveryPrice();

const baseTotal = subtotal + deliveryFee + (user?.pending_balance || 0);

const amountToPayNow = paymentPlan === 'split' ? baseTotal / 2 : baseTotal;

const balanceDueAtDelivery = paymentPlan === 'split' ? baseTotal / 2 : 0;

const transferFee = paymentMethod === 'moncash' ? calculateMoncashFee(amountToPayNow) :

paymentMethod === 'natcash' ? calculateNatcashFee(amountToPayNow) : 0;

const finalAmountToPay = amountToPayNow + transferFee;



const copyToClipboard = (text, type) => {

navigator.clipboard.writeText(text).then(() => {

setCopiedState(prev => ({ ...prev, [type]: true }));

setTimeout(() => setCopiedState(prev => ({ ...prev, [type]: false })), 2000);

toast.success('Copié !');

});

};



const updateQuantityMutation = useMutation({

mutationFn: ({ id, product_id, quantity }) => {
if (!user) {
  // Guest cart
  if (quantity <= 0) {
    removeFromGuestCart(product_id);
  } else {
    updateGuestCartItem(product_id, quantity);
  }
  return Promise.resolve();
}

if (quantity <= 0) return base44.entities.CartItem.delete(id);

return base44.entities.CartItem.update(id, { quantity });

},

onSuccess: () => {
  if (user) queryClient.invalidateQueries(['cart']);
}

});



const deleteItemMutation = useMutation({

mutationFn: ({ id, product_id }) => {
  if (!user) {
    removeFromGuestCart(product_id);
    return Promise.resolve();
  }
  return base44.entities.CartItem.delete(id);
},

onSuccess: () => {
  if (user) queryClient.invalidateQueries(['cart']);
}

});



const createOrderMutation = useMutation({

mutationFn: async () => {
if (!user) {
  // Redirect to login before payment
  base44.auth.redirectToLogin(window.location.pathname);
  throw new Error('Connexion requise');
}

if ((paymentMethod === 'moncash' || paymentMethod === 'natcash') && !transactionCode.trim()) {

throw new Error('Code de transaction requis');

}

if (paymentMethod === 'card' && !squareToken) {

throw new Error('Veuillez valider votre carte');

}



const shopIds = [...new Set(cartItems.map(item => item.shop_id))];

const firstOrderNum = 'RP' + Date.now().toString().slice(-6);



if (paymentMethod === 'card') {

const paymentResponse = await base44.functions.invoke('squarePayment', {

sourceId: squareToken,

amount: finalAmountToPay,

orderId: firstOrderNum

});

if (!paymentResponse.data.success) throw new Error('Paiement par carte refusé');

}



for (const shopId of shopIds) {

const shopItems = cartItems.filter(item => item.shop_id === shopId);

const code = generateConfirmationCode();



const orderResponse = await base44.entities.Order.create({

order_number: `${firstOrderNum}-${shopId.slice(-4)}`,

client_id: user.id,

client_name: user.full_name,

client_phone: user.phone,

client_address: tempAddress,

client_region: user.region,

shop_id: shopId,

items: shopItems.map(item => ({

product_id: item.product_id,

name: item.product_name,

quantity: item.quantity,

unit_price: item.unit_price + (item.total_customization_price || 0)

})),

total: baseTotal,

amount_paid: finalAmountToPay,

balance_due: balanceDueAtDelivery,

payment_method: paymentMethod,

payment_plan: paymentPlan,

status: 'pending_validation',

confirmation_code: code,

external_transaction_code: transactionCode.trim(),

special_instructions: specialInstructions

});

}



await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));

return { orderNum: firstOrderNum, code: generateConfirmationCode() };

},

onSuccess: (data) => {

setOrderNumber(data.orderNum);

setConfirmCode(data.code);

setStep('confirmed');

// Track Meta Purchase
trackMetaEvent('Purchase', {
value: finalAmountToPay,
currency: 'HTG',
content_ids: cartItems.map(item => item.product_id),
content_type: 'product',
num_items: cartItems.reduce((sum, item) => sum + item.quantity, 0),
}, {
phone: user.phone,
email: user.email,
});

},

onError: (err) => toast.error(err.message)

});



return (

<div className="min-h-screen bg-white text-black font-sans">

<header className="bg-white border-b h-14 flex items-center px-4 sticky top-0 z-50">

<Button variant="ghost" size="icon" onClick={() => step === 'checkout' ? setStep('cart') : navigate(-1)}>

<ArrowLeft className="w-5 h-5" />

</Button>

<h1 className="flex-1 text-center font-bold uppercase tracking-widest text-sm">

{step === 'cart' ? 'Mon Panier' : 'Paiement'}

</h1>

<div className="w-10" />

</header>



<main className="max-w-xl mx-auto p-4">

<AnimatePresence mode="wait">

{step === 'cart' && (

<motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>

{/* Articles Panier */}

<div className="space-y-6 mb-8">

{cartItems.map(item => (

<div key={item.id} className="flex gap-4 border-b pb-4">

<div className="w-24 h-32 bg-gray-50 overflow-hidden rounded-lg">

<img src={item.product_image} alt="" className="w-full h-full object-cover" />

</div>

<div className="flex-1 flex flex-col justify-between">

<div className="flex justify-between items-start">

<p className="font-medium text-sm leading-tight">{item.product_name}</p>

<button onClick={() => deleteItemMutation.mutate({ id: item.id, product_id: item.product_id })}><Trash2 className="w-4 h-4 text-gray-300" /></button>

</div>

<div className="flex justify-between items-end">

<p className="font-bold text-sm">{item.unit_price.toLocaleString()} HTG</p>

<div className="flex items-center border border-black rounded-sm overflow-hidden">

<button className="px-2 py-1 hover:bg-black hover:text-white" onClick={() => updateQuantityMutation.mutate({ id: item.id, product_id: item.product_id, quantity: item.quantity - 1 })}><Minus className="w-3 h-3"/></button>

<span className="px-3 text-xs font-bold">{item.quantity}</span>

<button className="px-2 py-1 hover:bg-black hover:text-white" onClick={() => updateQuantityMutation.mutate({ id: item.id, product_id: item.product_id, quantity: item.quantity + 1 })}><Plus className="w-3 h-3"/></button>

</div>

</div>

</div>

</div>

))}

</div>



{/* Articles Similaires - REECRIT AVEC VOTRE LOGIQUE */}

{similarProducts.length > 0 && (

<div className="mb-24 pt-4 border-t border-slate-100">

<div className="flex items-center justify-between mb-4">

<h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-400">Articles similaires</h3>

{loadingSimilar && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}

</div>

<div className="grid grid-cols-2 gap-4">

{similarProducts.map(prod => {

const displayPrice = applyClientMargin(prod.promo_price || prod.price);

// Exception MAKARIOS BRIDAL

const fastText = prod.shop_name === "MAKARIOS BRIDAL" ? "Réponse Rapide" : "Livraison Rapide";


return (

<div key={prod.id} className="group flex flex-col gap-2">

<div className="aspect-[3/4] bg-slate-50 relative rounded-xl overflow-hidden cursor-pointer" onClick={() => navigate(`/product/${prod.id}`)}>

<img src={prod.image_url} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />

<div className="absolute top-2 left-2 flex items-center gap-1 text-amber-600 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-sm">

<Zap size={8} fill="currentColor" />

<span className="text-[8px] font-bold uppercase">{fastText}</span>

</div>

<div className="absolute bottom-2 right-2 bg-white p-1.5 rounded-full shadow-lg text-orange-500">

<ShoppingBag className="w-3 h-3"/>

</div>

</div>

<div>

<p className="text-[10px] font-medium text-slate-600 truncate">{prod.name}</p>

<p className="text-xs font-black text-slate-900">{displayPrice.toLocaleString()} HTG</p>

</div>

</div>

);

})}

</div>

</div>

)}



{/* Résumé Fixe */}

<div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">

<div className="max-w-xl mx-auto space-y-3">

<div className="flex justify-between font-bold text-lg">

<span className="uppercase text-xs tracking-widest flex items-center">Total</span>

<span>{baseTotal.toLocaleString()} HTG</span>

</div>

<Button className="w-full bg-black text-white rounded-xl h-14 uppercase tracking-widest font-black text-xs" onClick={() => setStep('checkout')}>

Passer au paiement

</Button>

</div>

</div>

</motion.div>

)}



{step === 'checkout' && (

<motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-32">


<section className="space-y-4">

<h3 className="font-bold text-xs uppercase tracking-widest border-l-4 border-black pl-2">Options de livraison</h3>

<RadioGroup value={deliveryOption} onValueChange={setDeliveryOption} className="space-y-2">

<div className={`p-4 border rounded-xl flex justify-between items-center ${deliveryOption === 'address' ? 'border-black bg-zinc-50' : 'border-gray-100'}`}>

<div className="flex items-center gap-3">

<RadioGroupItem value="address" id="addr" />

<Label htmlFor="addr" className="text-xs font-bold uppercase">Livraison à domicile</Label>

</div>

<span className="text-xs font-bold">300 HTG</span>

</div>

{deliveryOption === 'address' && (

<div className="p-3 bg-zinc-100 rounded-xl flex justify-between items-center">

{isEditingAddress ? (

<Input value={tempAddress} onChange={(e) => setTempAddress(e.target.value)} className="h-8 rounded-lg border-black bg-white text-xs" />

) : (

<p className="text-xs italic">{tempAddress || "Entrez votre adresse"}</p>

)}

<button onClick={() => setIsEditingAddress(!isEditingAddress)} className="p-2"><Edit3 className="w-4 h-4 text-slate-400"/></button>

</div>

)}

<div className={`p-4 border rounded-xl flex justify-between items-center ${deliveryOption === 'makarios_pap' ? 'border-black bg-zinc-50' : 'border-gray-100'}`}>

<div className="flex items-center gap-3">

<RadioGroupItem value="makarios_pap" id="pap" />

<Label htmlFor="pap" className="text-xs font-bold uppercase">Makarios Bridal P.A.P</Label>

</div>

<span className="text-xs font-bold">250 HTG</span>

</div>

<div className={`p-4 border rounded-xl flex justify-between items-center ${deliveryOption === 'makarios_cap' ? 'border-black bg-zinc-50' : 'border-gray-100'}`}>

<div className="flex items-center gap-3">

<RadioGroupItem value="makarios_cap" id="cap" />

<Label htmlFor="cap" className="text-xs font-bold uppercase">Makarios Bridal CAP-H</Label>

</div>

<span className="text-xs font-bold">1000 HTG</span>

</div>

</RadioGroup>

</section>



<section className="space-y-4">

<h3 className="font-bold text-xs uppercase tracking-widest border-l-4 border-black pl-2">Plan de paiement</h3>

<div className="grid grid-cols-2 gap-3">

<div onClick={() => setPaymentPlan('full')} className={`p-4 border rounded-xl text-center cursor-pointer transition-all ${paymentPlan === 'full' ? 'border-black bg-black text-white' : 'border-gray-100 bg-white'}`}>

<p className="text-[10px] font-bold uppercase">100% Complet</p>

</div>

<div onClick={() => setPaymentPlan('split')} className={`p-4 border rounded-xl text-center cursor-pointer transition-all ${paymentPlan === 'split' ? 'border-black bg-black text-white' : 'border-gray-100 bg-white'}`}>

<p className="text-[10px] font-bold uppercase">50% Acompte</p>

</div>

</div>

</section>



<section className="space-y-4">

<h3 className="font-bold text-xs uppercase tracking-widest border-l-4 border-black pl-2">Mode de paiement</h3>

<RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">

{['card', 'moncash', 'natcash'].map((m) => (

<div key={m} className={`flex items-center space-x-3 p-4 border rounded-xl uppercase text-[10px] font-bold tracking-widest ${paymentMethod === m ? 'border-orange-500 bg-orange-50/30' : 'border-gray-100'}`}>

<RadioGroupItem value={m} id={m} />

<Label htmlFor={m} className="flex-1 cursor-pointer flex justify-between items-center">

{m === 'card' ? 'Carte de Crédit' : m.toUpperCase()}

{m === 'moncash' && <span className="bg-[#df1f26] text-white px-2 py-0.5 rounded">Recommandé</span>}

</Label>

</div>

))}

</RadioGroup>

</section>



{paymentMethod === 'card' && <SquarePaymentForm amount={finalAmountToPay} onSuccess={setSquareToken} onError={(err) => toast.error(err)} />}



{(paymentMethod === 'moncash' || paymentMethod === 'natcash') && (

<div className="p-5 bg-slate-900 text-white rounded-2xl space-y-4 shadow-xl">

<div className="flex justify-between items-center border-b border-white/10 pb-3">

<span className="text-[10px] uppercase font-bold text-slate-400">Total à transférer</span>

<span className="text-2xl font-black text-orange-400">{finalAmountToPay.toLocaleString()} HTG</span>

</div>

<div className="bg-white/5 p-3 rounded-lg flex justify-between items-center">

<div>

<p className="text-[8px] uppercase text-slate-400 font-bold mb-1">Numéro de réception</p>

<span className="text-lg font-black tracking-widest">{ACCOUNTS[paymentMethod].number}</span>

</div>

<Button variant="ghost" size="sm" className="text-orange-400 hover:bg-white/10" onClick={() => copyToClipboard(ACCOUNTS[paymentMethod].number, 'account')}><Copy className="w-4 h-4"/></Button>

</div>

<div className="space-y-2">

<Label className="text-[10px] uppercase text-slate-400">Code de transaction SMS</Label>

<Input placeholder="ENTREZ LE CODE REÇU" className="rounded-xl border-none bg-white/10 h-14 uppercase text-center text-lg font-black tracking-widest focus:ring-2 focus:ring-orange-500" value={transactionCode} onChange={(e) => setTransactionCode(e.target.value)} />

</div>

</div>

)}



<div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-50">

<Button

className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl uppercase font-black tracking-tight shadow-lg shadow-orange-200"

onClick={() => createOrderMutation.mutate()}

disabled={createOrderMutation.isPending}

>

{createOrderMutation.isPending ? "Validation..." : `Confirmer le paiement`}

</Button>

</div>

</motion.div>

)}



{step === 'confirmed' && (

<motion.div key="confirmed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-20 px-6">

<div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100">

<Check className="w-10 h-10" strokeWidth={3} />

</div>

<h2 className="text-2xl font-black uppercase tracking-tight mb-2">Commande Reçue !</h2>

<p className="text-slate-500 text-sm mb-8">Votre commande a été transmise aux boutiques.</p>

<div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-3xl mb-8">

<p className="text-[10px] uppercase font-bold text-slate-400 mb-2">Code de retrait</p>

<div className="text-5xl font-black tracking-[0.2em] text-slate-900">{confirmCode}</div>

</div>

<Link to={createPageUrl('Home')}>

<Button className="w-full bg-slate-900 text-white rounded-2xl h-14 uppercase font-bold">Retourner à l'accueil</Button>

</Link>

</motion.div>

)}

</AnimatePresence>

</main>

</div>

);

}