import React, { useState, useEffect } from 'react';

import { base44 } from '@/api/base44Client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Link, useNavigate } from 'react-router-dom';

import { createPageUrl } from '@/utils';

import { ArrowLeft, Plus, Minus, Trash2, CreditCard, Wallet, Banknote, Clock, AlertTriangle, Copy, Check, Info } from 'lucide-react';

import { Button } from "@/components/ui/button";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Label } from "@/components/ui/label";

import { Input } from "@/components/ui/input";

import { Textarea } from "@/components/ui/textarea";

import { toast } from "sonner";

import { motion, AnimatePresence } from 'framer-motion';

import { getHaitiTime } from '@/components/utils/dateFormat';

import SquarePaymentForm from '@/components/payment/SquarePaymentForm';



function calculateDeliveryFee(clientCommune, shopCommune) {

const hour = getHaitiTime().getHours();

const sameCommune = clientCommune === shopCommune;

if (hour >= 8 && hour < 11) {

return sameCommune ? 300 : 500;

} else if (hour >= 12 && hour < 15) {

return sameCommune ? 400 : 750;

} else if (hour >= 16 && hour < 21) {

return sameCommune ? 300 : 500;

} else if (hour >= 21 && hour < 23) {

return sameCommune ? 500 : 750;

}

return sameCommune ? 400 : 600;

}



function generateConfirmationCode() {

return Math.floor(1000 + Math.random() * 9000).toString();

}



// Fonction pour calculer les frais Natcash selon le tableau des frais de retrait

function calculateNatcashFee(amount) {

// Tableau des frais de retrait Natcash

const feeRanges = [

{ min: 20, max: 99, fee: 5.50 },

{ min: 100, max: 249, fee: 11.50 },

{ min: 250, max: 499, fee: 13.50 },

{ min: 500, max: 999, fee: 21.00 },

{ min: 1000, max: 1999, fee: 41.00 },

{ min: 2000, max: 3999, fee: 68.00 },

{ min: 4000, max: 7999, fee: 97.00 },

{ min: 8000, max: 11999, fee: 125.00 },

{ min: 12000, max: 19999, fee: 165.00 },

{ min: 20000, max: 40000, fee: 274.00 }

];



// Trouver la tranche correspondante

for (const range of feeRanges) {

if (amount >= range.min && amount <= range.max) {

return range.fee;

}

}



// Si le montant dépasse 40,000 HTG, appliquer une règle proportionnelle

if (amount > 40000) {

return 274.00 + Math.floor((amount - 40000) / 20000) * 100;

}



// Si le montant est inférieur à 20 HTG (cas improbable pour une commande)

return 0;

}



// Fonction pour calculer le montant total à transférer (montant de commande + frais Natcash)

function calculateNatcashTotal(orderAmount) {

const fee = calculateNatcashFee(orderAmount);

return {

orderAmount: orderAmount,

natcashFee: fee,

transferAmount: orderAmount + fee

};

}



// Compte marchand Natcash fixe

const NATCASH_MERCHANT_ACCOUNT = "3527-0511 Rebecca Christa Rigaud";



export default function Cart() {

const [user, setUser] = useState(null);

const [step, setStep] = useState('cart'); // cart, checkout, confirmed

const [paymentMethod, setPaymentMethod] = useState('CASH');

const [orderNumber, setOrderNumber] = useState('');

const [confirmCode, setConfirmCode] = useState('');

const [specialInstructions, setSpecialInstructions] = useState('');

const [redirectingToMoncash, setRedirectingToMoncash] = useState(false);

const [squareToken, setSquareToken] = useState(null);

const [processingSquare, setProcessingSquare] = useState(false);

// État pour Natcash

const [natcashTransactionCode, setNatcashTransactionCode] = useState('');

const [copiedAccount, setCopiedAccount] = useState(false);

const [copiedAmount, setCopiedAmount] = useState(false);

const [natcashInfo, setNatcashInfo] = useState(null);

const queryClient = useQueryClient();

const navigate = useNavigate();



useEffect(() => {

base44.auth.me().then(u => {

setUser(u);

}).catch(() => {

navigate(createPageUrl('Home'));

});

}, []);



const { data: cartItems = [], isLoading } = useQuery({

queryKey: ['cart', user?.id],

queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),

enabled: !!user?.id,

refetchInterval: 60000,

refetchIntervalInBackground: true

});



// Calculer les frais Natcash quand le total change et que Natcash est sélectionné

useEffect(() => {

if (paymentMethod === 'natcash' && cartItems.length > 0) {

// Calculer le total de la commande

const itemsByShop = cartItems.reduce((acc, item) => {

if (!acc[item.shop_id]) {

acc[item.shop_id] = [];

}

acc[item.shop_id].push(item);

return acc;

}, {});



const subtotal = cartItems.reduce((sum, item) => {

const itemTotal = (item.unit_price + (item.total_customization_price || 0)) * item.quantity;

return sum + itemTotal;

}, 0);

let deliveryFee = 0;

Object.keys(itemsByShop).forEach(shopId => {

const shopRegion = itemsByShop[shopId][0].shop_region;

deliveryFee += calculateDeliveryFee(user?.region || '', shopRegion);

});

const pendingBalance = user?.pending_balance || 0;

const total = subtotal + deliveryFee + pendingBalance;

// Calculer les frais Natcash

const natcashData = calculateNatcashTotal(total);

setNatcashInfo(natcashData);

} else {

setNatcashInfo(null);

}

}, [paymentMethod, cartItems, user]);



const updateQuantityMutation = useMutation({

mutationFn: ({ id, quantity }) => {

if (quantity <= 0) {

return base44.entities.CartItem.delete(id);

}

return base44.entities.CartItem.update(id, { quantity });

},

onSuccess: () => queryClient.invalidateQueries(['cart'])

});



const deleteItemMutation = useMutation({

mutationFn: (id) => base44.entities.CartItem.delete(id),

onSuccess: () => queryClient.invalidateQueries(['cart'])

});



// Fonction pour copier le texte

const copyToClipboard = (text, type) => {

navigator.clipboard.writeText(text).then(() => {

if (type === 'account') {

setCopiedAccount(true);

setTimeout(() => setCopiedAccount(false), 2000);

} else if (type === 'amount') {

setCopiedAmount(true);

setTimeout(() => setCopiedAmount(false), 2000);

}

toast.success('Copié dans le presse-papier');

});

};



const createOrderMutation = useMutation({

mutationFn: async () => {

// Grouper les articles par boutique

const itemsByShop = cartItems.reduce((acc, item) => {

if (!acc[item.shop_id]) {

acc[item.shop_id] = [];

}

acc[item.shop_id].push(item);

return acc;

}, {});



const shopIds = Object.keys(itemsByShop);

const subtotal = cartItems.reduce((sum, item) => {

const itemTotal = (item.unit_price + (item.total_customization_price || 0)) * item.quantity;

return sum + itemTotal;

}, 0);

// Calculer frais de livraison total (par boutique)

let totalDeliveryFee = 0;

for (const shopId of shopIds) {

const shopRegion = itemsByShop[shopId][0].shop_region;

totalDeliveryFee += calculateDeliveryFee(user.region, shopRegion);

}

const totalAmount = subtotal + totalDeliveryFee + (user?.pending_balance || 0);

// Si Square, traiter le paiement par carte

if (paymentMethod === 'card') {

if (!squareToken) {

throw new Error('Token de paiement manquant');

}



try {

// Créer commandes d'abord

const createdOrders = [];

for (const shopId of shopIds) {

const shopItems = itemsByShop[shopId];

const shopSubtotal = shopItems.reduce((sum, item) => {

const itemTotal = (item.unit_price + (item.total_customization_price || 0)) * item.quantity;

return sum + itemTotal;

}, 0);

const shopDeliveryFee = calculateDeliveryFee(user.region, shopItems[0].shop_region);

const orderNum = 'RP' + Date.now().toString().slice(-6) + '-' + shopId.slice(-4);

const code = generateConfirmationCode();



const order = await base44.entities.Order.create({

order_number: orderNum,

client_id: user.id,

client_name: user.full_name,

client_phone: user.phone,

client_address: user.address || '',

client_region: user.region,

shop_id: shopId,

shop_name: shopItems[0].shop_name,

shop_region: shopItems[0].shop_region,

items: shopItems.map(item => ({

product_id: item.product_id,

name: item.product_name,

quantity: item.quantity,

unit_price: item.unit_price + (item.total_customization_price || 0),

total: (item.unit_price + (item.total_customization_price || 0)) * item.quantity,

customization: item.customization

})),

subtotal: shopSubtotal,

delivery_fee: shopDeliveryFee,

total: shopSubtotal + shopDeliveryFee,

payment_method: 'card',

status: 'pending',

payment_status: 'pending',

confirmation_code: code

});



createdOrders.push({ orderId: order.id, orderNum, code });

}



// Traiter le paiement Square

const paymentResponse = await base44.functions.invoke('squarePayment', {

sourceId: squareToken,

amount: totalAmount,

orderId: createdOrders[0].orderNum

});



if (!paymentResponse.data.success) {

throw new Error('Paiement refusé');

}



// Mettre à jour statut paiement des commandes

for (const order of createdOrders) {

await base44.entities.Order.update(order.orderId, {

payment_status: 'paid'

});



// Envoyer notifications

await base44.functions.invoke('sendOrderNotification', {

orderId: order.orderId,

status: 'pending'

}).catch(err => console.error('Notification error:', err));



await base44.functions.invoke('sendWhatsAppOrderNotification', {

orderId: order.orderId

}).catch(err => console.error('WhatsApp error:', err));

}



// Vider le panier

await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));



return {

orderNum: createdOrders[0].orderNum,

code: createdOrders[0].code,

allOrders: createdOrders

};

} catch (error) {

console.error('Square payment error:', error);

throw new Error(error.message || 'Erreur lors du paiement par carte');

}

}

// Si MonCash, initier le paiement

if (paymentMethod === 'moncash') {

try {

const orderNum = 'RP' + Date.now().toString().slice(-6);



console.log('Initialisation paiement MonCash:', { orderNum, amount: totalAmount });



const response = await base44.functions.invoke('moncashCreatePayment', {

orderId: orderNum,

amount: totalAmount,

description: `Commande ${orderNum}`

});



console.log('Réponse MonCash:', response);



const paymentData = response.data;



if (!paymentData || !paymentData.success) {

console.error('Erreur paiement MonCash:', paymentData);

throw new Error(paymentData?.error || 'Erreur lors de l\'initialisation du paiement MonCash');

}



console.log('URL de paiement générée:', paymentData.paymentUrl);

// Créer une commande par boutique SANS envoyer de notifications

const createdOrders = [];

for (const shopId of shopIds) {

const shopItems = itemsByShop[shopId];

const shopSubtotal = shopItems.reduce((sum, item) => {

const itemTotal = (item.unit_price + (item.total_customization_price || 0)) * item.quantity;

return sum + itemTotal;

}, 0);

const shopDeliveryFee = calculateDeliveryFee(user.region, shopItems[0].shop_region);

const code = generateConfirmationCode();



const order = await base44.entities.Order.create({

order_number: `${orderNum}-${shopId.slice(-4)}`,

client_id: user.id,

client_name: user.full_name,

client_phone: user.phone,

client_address: user.address || '',

client_region: user.region,

shop_id: shopId,

shop_name: shopItems[0].shop_name,

shop_region: shopItems[0].shop_region,

items: shopItems.map(item => ({

product_id: item.product_id,

name: item.product_name,

quantity: item.quantity,

unit_price: item.unit_price + (item.total_customization_price || 0),

total: (item.unit_price + (item.total_customization_price || 0)) * item.quantity,

customization: item.customization

})),

subtotal: shopSubtotal,

delivery_fee: shopDeliveryFee,

total: shopSubtotal + shopDeliveryFee,

payment_method: paymentMethod,

status: 'pending',

payment_status: 'pending',

confirmation_code: code,

moncash_transaction_id: paymentData.transactionId

});



createdOrders.push({ orderId: order.id, code });

}



// Vider le panier

await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));



console.log('Redirection vers MonCash:', paymentData.paymentUrl);



return {

orderNum,

codes: createdOrders.map(o => o.code),

moncashUrl: paymentData.paymentUrl,

transactionId: paymentData.transactionId,

redirecting: true

};

} catch (error) {

console.error('MonCash payment error:', error);

throw new Error(error.message || 'Erreur MonCash');

}

}

// Paiement Natcash - créer commande en attente de validation

if (paymentMethod === 'natcash') {

// Valider que le code de transaction est fourni

if (!natcashTransactionCode.trim()) {

throw new Error('Veuillez saisir votre code de transaction Natcash');

}



// Calculer les frais Natcash pour le montant total

const natcashData = calculateNatcashTotal(totalAmount);



// Créer une commande par boutique

const createdOrders = [];

for (const shopId of shopIds) {

const shopItems = itemsByShop[shopId];

const shopSubtotal = shopItems.reduce((sum, item) => {

const itemTotal = (item.unit_price + (item.total_customization_price || 0)) * item.quantity;

return sum + itemTotal;

}, 0);

const shopDeliveryFee = calculateDeliveryFee(user.region, shopItems[0].shop_region);

const orderNum = 'RP' + Date.now().toString().slice(-6) + '-' + shopId.slice(-4);

const code = generateConfirmationCode();



const order = await base44.entities.Order.create({

order_number: orderNum,

client_id: user.id,

client_name: user.full_name,

client_phone: user.phone,

client_address: user.address || '',

client_region: user.region,

shop_id: shopId,

shop_name: shopItems[0].shop_name,

shop_region: shopItems[0].shop_region,

items: shopItems.map(item => ({

product_id: item.product_id,

name: item.product_name,

quantity: item.quantity,

unit_price: item.unit_price + (item.total_customization_price || 0),

total: (item.unit_price + (item.total_customization_price || 0)) * item.quantity,

customization: item.customization

})),

subtotal: shopSubtotal,

delivery_fee: shopDeliveryFee,

total: shopSubtotal + shopDeliveryFee,

payment_method: 'natcash',

status: 'pending_validation', // Statut spécial pour Natcash

payment_status: 'pending',

confirmation_code: code,

natcash_transaction_code: natcashTransactionCode.trim(),

natcash_fee: natcashData.natcashFee,

natcash_transfer_amount: natcashData.transferAmount,

natcash_merchant_account: NATCASH_MERCHANT_ACCOUNT,

special_instructions: specialInstructions

});



createdOrders.push({ orderId: order.id, orderNum, code });



// Envoyer notifications IMMÉDIATEMENT pour informer le marchand

await base44.functions.invoke('sendOrderNotification', {

orderId: order.id,

status: 'pending_validation'

}).catch(err => console.error('Notification error:', err));



// Envoyer notification WhatsApp au marchand

await base44.functions.invoke('sendWhatsAppOrderNotification', {

orderId: order.id

}).catch(err => console.error('WhatsApp error:', err));

}



// Vider le panier

await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));

return {

orderNum: createdOrders[0].orderNum,

code: createdOrders[0].code,

allOrders: createdOrders,

natcashData: natcashData

};

}

// Paiement autre que MonCash/Natcash - créer une commande par boutique

const createdOrders = [];

for (const shopId of shopIds) {

const shopItems = itemsByShop[shopId];

const shopSubtotal = shopItems.reduce((sum, item) => {

const itemTotal = (item.unit_price + (item.total_customization_price || 0)) * item.quantity;

return sum + itemTotal;

}, 0);

const shopDeliveryFee = calculateDeliveryFee(user.region, shopItems[0].shop_region);

const orderNum = 'RP' + Date.now().toString().slice(-6) + '-' + shopId.slice(-4);

const code = generateConfirmationCode();



const order = await base44.entities.Order.create({

order_number: orderNum,

client_id: user.id,

client_name: user.full_name,

client_phone: user.phone,

client_address: user.address || '',

client_region: user.region,

shop_id: shopId,

shop_name: shopItems[0].shop_name,

shop_region: shopItems[0].shop_region,

items: shopItems.map(item => ({

product_id: item.product_id,

name: item.product_name,

quantity: item.quantity,

unit_price: item.unit_price + (item.total_customization_price || 0),

total: (item.unit_price + (item.total_customization_price || 0)) * item.quantity,

customization: item.customization

})),

subtotal: shopSubtotal,

delivery_fee: shopDeliveryFee,

total: shopSubtotal + shopDeliveryFee,

payment_method: paymentMethod,

status: 'pending',

payment_status: paymentMethod === 'CASH' ? 'pending' : 'paid', // CASH = à la livraison, autres = déjà payé

confirmation_code: code

});



createdOrders.push({ orderId: order.id, orderNum, code });



// Envoyer notifications IMMÉDIATEMENT pour paiements non-MonCash

await base44.functions.invoke('sendOrderNotification', {

orderId: order.id,

status: 'pending'

}).catch(err => console.error('Notification error:', err));



// Envoyer notification WhatsApp au marchand

await base44.functions.invoke('sendWhatsAppOrderNotification', {

orderId: order.id

}).catch(err => console.error('WhatsApp error:', err));

}



// Clear cart

await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));

return {

orderNum: createdOrders[0].orderNum,

code: createdOrders[0].code,

allOrders: createdOrders

};

},

onSuccess: (data) => {

if (data.redirecting && data.moncashUrl) {

// Redirection vers MonCash

console.log('Succès - redirection vers:', data.moncashUrl);

setRedirectingToMoncash(true);

toast.success('Redirection vers MonCash...');

setTimeout(() => {

console.log('Redirection maintenant...');

window.location.href = data.moncashUrl;

}, 1000);

return;

}

queryClient.invalidateQueries(['cart']);

setOrderNumber(data.orderNum);

setConfirmCode(data.code);

setStep('confirmed');

toast.success('Commande confirmée!');

},

onError: (error) => {

toast.error(error.message || 'Erreur lors de la création de la commande');

}

});



if (!user || isLoading) {

return (

<div className="min-h-screen bg-slate-50 flex items-center justify-center">

<div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />

</div>

);

}



// Grouper par boutique pour calcul des frais

const itemsByShop = cartItems.reduce((acc, item) => {

if (!acc[item.shop_id]) {

acc[item.shop_id] = [];

}

acc[item.shop_id].push(item);

return acc;

}, {});



const subtotal = cartItems.reduce((sum, item) => {

const itemTotal = (item.unit_price + (item.total_customization_price || 0)) * item.quantity;

return sum + itemTotal;

}, 0);

// Calculer frais de livraison pour chaque boutique

let deliveryFee = 0;

Object.keys(itemsByShop).forEach(shopId => {

const shopRegion = itemsByShop[shopId][0].shop_region;

deliveryFee += calculateDeliveryFee(user.region, shopRegion);

});

const pendingBalance = user?.pending_balance || 0;

const total = subtotal + deliveryFee + pendingBalance;

const shopCount = Object.keys(itemsByShop).length;



return (

<div className="min-h-screen bg-slate-50">

{/* Header */}

<header className="bg-white sticky top-0 z-40 border-b">

<div className="max-w-2xl mx-auto px-4 py-4">

<div className="flex items-center gap-4">

<Link to={createPageUrl('Home')}>

<Button variant="ghost" size="icon">

<ArrowLeft className="w-5 h-5" />

</Button>

</Link>

<h1 className="text-lg font-semibold">

{step === 'cart' && 'Mon Panier'}

{step === 'checkout' && 'Paiement'}

{step === 'confirmed' && 'Commande Confirmée'}

</h1>

</div>

</div>

</header>



<main className="max-w-2xl mx-auto px-4 py-6">

<AnimatePresence mode="wait">

{/* Empty Cart */}

{cartItems.length === 0 && step === 'cart' && (

<motion.div

initial={{ opacity: 0 }}

animate={{ opacity: 1 }}

className="text-center py-12"

>

<p className="text-slate-500 mb-4">Votre panier est vide</p>

<Link to={createPageUrl('Home')}>

<Button className="bg-orange-500 hover:bg-orange-600">

Continuer vos achats

</Button>

</Link>

</motion.div>

)}



{/* Cart Items */}

{step === 'cart' && cartItems.length > 0 && (

<motion.div

key="cart"

initial={{ opacity: 0 }}

animate={{ opacity: 1 }}

exit={{ opacity: 0 }}

>

{/* Multi-boutique info */}

{shopCount > 1 && (

<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">

<p className="font-medium">📦 Commande multi-boutique</p>

<p className="text-xs mt-1">

Votre panier contient des articles de {shopCount} boutiques différentes.

Les délais de livraison peuvent varier.

</p>

</div>

)}



<div className="space-y-3">

{cartItems.map(item => (

<div key={item.id} className="bg-white rounded-xl p-4 flex gap-4">

<div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">

{item.product_image ? (

<img src={item.product_image} alt="" className="w-full h-full object-cover" />

) : (

<div className="w-full h-full flex items-center justify-center text-xl">📦</div>

)}

</div>

<div className="flex-1 min-w-0">

<h3 className="font-medium text-slate-800 truncate">{item.product_name}</h3>

<p className="text-sm text-slate-500">{item.shop_name}</p>

{/* Customization Details */}

{item.customization && (

<div className="flex flex-wrap gap-1 mt-1">

{item.customization.color && (

<span className="inline-flex items-center gap-1 text-xs bg-slate-100 rounded-full px-2 py-0.5">

<div

className="w-3 h-3 rounded-full border"

style={{ backgroundColor: item.customization.color.hex }}

/>

{item.customization.color.name}

</span>

)}

{item.customization.size && (

<span className="text-xs bg-slate-100 rounded-full px-2 py-0.5">

Taille: {item.customization.size.name}

</span>

)}

{item.customization.text && (

<span className="text-xs bg-slate-100 rounded-full px-2 py-0.5">

"{item.customization.text}"

</span>

)}

{item.customization.arrangement && (

<span className="text-xs bg-slate-100 rounded-full px-2 py-0.5">

{item.customization.arrangement.name}

</span>

)}

</div>

)}



<div className="flex items-center justify-between mt-2">

<div>

<span className="font-semibold text-orange-500">

{(item.unit_price + (item.total_customization_price || 0)) * item.quantity} HTG

</span>

{item.total_customization_price > 0 && (

<span className="text-xs text-slate-500 ml-1">

(+{item.total_customization_price * item.quantity} HTG)

</span>

)}

</div>

<div className="flex items-center gap-2">

<Button

size="icon"

variant="outline"

className="h-8 w-8"

onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity - 1 })}

>

<Minus className="w-4 h-4" />

</Button>

<span className="w-8 text-center">{item.quantity}</span>

<Button

size="icon"

variant="outline"

className="h-8 w-8"

onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}

>

<Plus className="w-4 h-4" />

</Button>

<Button

size="icon"

variant="ghost"

className="h-8 w-8 text-red-500"

onClick={() => deleteItemMutation.mutate(item.id)}

>

<Trash2 className="w-4 h-4" />

</Button>

</div>

</div>

</div>

</div>

))}

</div>



<Link to={createPageUrl('Home')}>

<Button variant="outline" className="w-full mt-4">

Ajouter plus d'articles

</Button>

</Link>



{/* Summary */}

<div className="bg-white rounded-xl p-4 mt-6 space-y-2">

<div className="flex justify-between text-slate-600">

<span>Sous-total</span>

<span>{subtotal} HTG</span>

</div>

<div className="flex justify-between items-center text-slate-600">

<div className="flex items-center gap-2">

<Clock className="w-4 h-4 text-orange-500" />

<span>Frais de livraison {shopCount > 1 ? `(${shopCount} boutiques)` : ''}</span>

</div>

<div className="text-right">

<div className="font-medium">{deliveryFee} HTG</div>

<div className="text-xs text-slate-400">Livraison: 20-30 min</div>

</div>

</div>

{pendingBalance > 0 && (

<div className="flex justify-between items-center text-orange-600 font-medium">

<div className="flex items-center gap-2">

<AlertTriangle className="w-4 h-4" />

<span>Balance due (annulation)</span>

</div>

<span>+{pendingBalance} HTG</span>

</div>

)}

<div className="flex justify-between font-bold text-lg pt-2 border-t">

<span>Total</span>

<span className="text-orange-500">{total} HTG</span>

</div>

</div>



<Button

className="w-full mt-4 bg-orange-500 hover:bg-orange-600 h-12 text-lg"

onClick={() => setStep('checkout')}

>

Confirmer la commande

</Button>

</motion.div>

)}



{/* Checkout */}

{step === 'checkout' && (

<motion.div

key="checkout"

initial={{ opacity: 0, x: 20 }}

animate={{ opacity: 1, x: 0 }}

exit={{ opacity: 0, x: -20 }}

className="space-y-6"

>

{/* Payment Method */}

<div className="bg-white rounded-xl p-4">

<h3 className="font-semibold mb-4">Méthode de paiement</h3>

<RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">

<div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50">

<RadioGroupItem value="CASH" id="cash" />

<Label htmlFor="cash" className="flex items-center gap-3 cursor-pointer flex-1">

<Banknote className="w-5 h-5 text-green-600" />

<span>Cash à la livraison</span>

</Label>

</div>

<div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50">

<RadioGroupItem value="card" id="card" />

<Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">

<CreditCard className="w-5 h-5 text-blue-600" />

<span>Carte de débit/crédit (Square)</span>

</Label>

</div>

<div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50">

<RadioGroupItem value="moncash" id="moncash" />

<Label htmlFor="moncash" className="flex items-center gap-3 cursor-pointer flex-1">

<Wallet className="w-5 h-5 text-orange-600" />

<span>Moncash</span>

</Label>

</div>

<div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50">

<RadioGroupItem value="natcash" id="natcash" />

<Label htmlFor="natcash" className="flex items-center gap-3 cursor-pointer flex-1">

<Wallet className="w-5 h-5 text-purple-600" />

<span>Natcash</span>

</Label>

</div>

</RadioGroup>

</div>



{/* Natcash Instructions */}

{paymentMethod === 'natcash' && (

<div className="bg-white rounded-xl p-4 border-2 border-purple-200">

<h3 className="font-semibold mb-3 text-purple-700">Instructions Natcash</h3>

<div className="space-y-4">

{/* Détails des frais */}

<div className="bg-purple-50 p-4 rounded-lg">

<div className="flex items-start gap-2 mb-3">

<Info className="w-5 h-5 text-purple-600 mt-0.5" />

<div>

<p className="text-sm text-purple-600">

<strong>Frais Natcash:</strong> Les frais de retrait Natcash sont ajoutés au montant de votre commande selon le tableau officiel des frais.

</p>

</div>

</div>

<div className="space-y-3">

<div className="bg-white p-3 rounded border">

<p className="text-xs text-slate-500">Montant de la commande</p>

<p className="font-bold text-lg">{total} HTG</p>

</div>

{natcashInfo && (

<>

<div className="bg-white p-3 rounded border">

<div className="flex justify-between items-center">

<div>

<p className="text-xs text-slate-500">Frais de retrait Natcash</p>

<p className="font-bold text-lg text-red-600">+{natcashInfo.natcashFee} HTG</p>

</div>

<div className="text-xs text-slate-400 text-right">

<p>Tranche: {natcashInfo.orderAmount >= 20 && natcashInfo.orderAmount <= 40000 ?

`${natcashInfo.orderAmount} HTG` : '> 40,000 HTG'}</p>

</div>

</div>

</div>

<div className="bg-white p-3 rounded border border-purple-300">

<p className="text-xs text-slate-500">Montant total à transférer</p>

<p className="font-bold text-2xl text-purple-700">{natcashInfo.transferAmount} HTG</p>

</div>

</>

)}

</div>

</div>



<div className="bg-purple-50 p-4 rounded-lg">

<p className="text-sm text-purple-600 mb-2">

<strong>Étape 1:</strong> Faites un transfert Natcash vers notre compte marchand :

</p>

<div className="bg-white p-4 rounded-lg border">

<p className="text-xs text-slate-500 mb-2">Compte Marchand</p>

<div className="flex items-start justify-between">

<div>

<p className="font-bold text-lg text-purple-700">3527-0511</p>

<p className="text-sm text-slate-700">Rebecca Christa Rigaud</p>

<p className="text-xs text-slate-400 mt-1">

Copiez le numéro et le nom pour faire le transfert dans l'application Natcash

</p>

</div>

<Button

size="sm"

variant="outline"

onClick={() => copyToClipboard(NATCASH_MERCHANT_ACCOUNT, 'account')}

className="h-10"

>

{copiedAccount ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}

</Button>

</div>

</div>

</div>



<div className="bg-purple-50 p-4 rounded-lg">

<p className="text-sm text-purple-600 mb-2">

<strong>Étape 2:</strong> Transférez le montant exact :

</p>

<div className="flex items-center justify-between bg-white p-3 rounded border">

<div>

<p className="text-xs text-slate-500">Montant à transférer</p>

<p className="font-bold text-lg text-orange-600">

{natcashInfo ? natcashInfo.transferAmount : total} HTG

</p>

<p className="text-xs text-slate-400 mt-1">

Inclut {natcashInfo ? natcashInfo.natcashFee : 'les frais'} HTG de frais Natcash

</p>

</div>

<Button

size="sm"

variant="outline"

onClick={() => copyToClipboard(natcashInfo ? natcashInfo.transferAmount.toString() : total.toString(), 'amount')}

>

{copiedAmount ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}

</Button>

</div>

</div>



<div className="bg-purple-50 p-4 rounded-lg">

<p className="text-sm text-purple-600 mb-2">

<strong>Étape 3:</strong> Après le transfert, saisissez votre code de transaction :

</p>

<div className="space-y-2">

<Label htmlFor="natcash-code" className="text-purple-700">

Code de transaction Natcash

</Label>

<Input

id="natcash-code"

placeholder="Ex: 123456 (reçu par SMS)"

value={natcashTransactionCode}

onChange={(e) => setNatcashTransactionCode(e.target.value)}

className="border-purple-300 focus:border-purple-500"

maxLength={20}

/>

<p className="text-xs text-slate-400">

Le code est envoyé par SMS après chaque transfert Natcash.

</p>

</div>

</div>



<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">

<p className="text-sm text-yellow-700">

⚠️ <strong>Important:</strong>

Votre commande sera mise en attente jusqu'à validation manuelle du transfert.

Vous recevrez une notification une fois validé.

<br />

<span className="text-xs mt-1 block">

<strong>Note:</strong> Les frais Natcash (frais de retrait) sont calculés selon le tableau officiel Natcash et sont inclus dans le montant à transférer.

</span>

</p>

</div>

</div>

</div>

)}



{/* Delivery Address */}

<div className="bg-white rounded-xl p-4">

<h3 className="font-semibold mb-3">Adresse de livraison</h3>

<p className="text-slate-600">{user.address || 'Non définie'}</p>

<p className="text-slate-500 text-sm">{user.region}</p>

</div>



{/* Square Payment Form */}

{paymentMethod === 'card' && (

<SquarePaymentForm

amount={total}

onSuccess={(token) => {

setSquareToken(token);

toast.success('Carte validée');

}}

onError={(error) => {

setSquareToken(null);

toast.error(error);

}}

/>

)}



{/* Special Instructions */}

<div className="bg-white rounded-xl p-4">

<h3 className="font-semibold mb-3">Instructions spéciales (optionnel)</h3>

<Textarea

placeholder="Ex: Sonnez à la porte, pas d'interphone..."

value={specialInstructions}

onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 200))}

className="min-h-[80px]"

maxLength={200}

/>

<p className="text-xs text-slate-400 mt-1">{specialInstructions.length}/200 caractères</p>

</div>



{/* Summary */}

<div className="bg-white rounded-xl p-4 space-y-2">

<h3 className="font-semibold mb-3">Récapitulatif</h3>

{/* Group by shop */}

{Object.keys(itemsByShop).map(shopId => {

const shopItems = itemsByShop[shopId];

const shopSubtotal = shopItems.reduce((sum, item) => {

const itemTotal = (item.unit_price + (item.total_customization_price || 0)) * item.quantity;

return sum + itemTotal;

}, 0);

return (

<div key={shopId} className="mb-3 pb-3 border-b">

<p className="text-xs font-semibold text-slate-500 mb-2">{shopItems[0].shop_name}</p>

{shopItems.map(item => (

<div key={item.id} className="text-sm text-slate-600">

<div className="flex justify-between">

<span>{item.quantity}x {item.product_name}</span>

<span>{(item.unit_price + (item.total_customization_price || 0)) * item.quantity} HTG</span>

</div>

{item.customization && (

<div className="flex flex-wrap gap-1 mt-0.5 ml-4">

{item.customization.color && (

<span className="text-xs text-slate-500">• {item.customization.color.name}</span>

)}

{item.customization.size && (

<span className="text-xs text-slate-500">• Taille: {item.customization.size.name}</span>

)}

{item.customization.text && (

<span className="text-xs text-slate-500">• "{item.customization.text}"</span>

)}

{item.customization.arrangement && (

<span className="text-xs text-slate-500">• {item.customization.arrangement.name}</span>

)}

</div>

)}

</div>

))}

</div>

);

})}

<div className="border-t pt-2 mt-2">

<div className="flex justify-between text-slate-600">

<span>Sous-total</span>

<span>{subtotal} HTG</span>

</div>

<div className="flex justify-between text-slate-600">

<span>Livraison {shopCount > 1 ? `(${shopCount} boutiques)` : ''}</span>

<span>{deliveryFee} HTG</span>

</div>

{pendingBalance > 0 && (

<div className="flex justify-between text-orange-600 font-medium">

<span>Balance due (annulation)</span>

<span>+{pendingBalance} HTG</span>

</div>

)}

{/* Affichage des frais Natcash si applicable */}

{paymentMethod === 'natcash' && natcashInfo && (

<div className="flex justify-between text-purple-600 font-medium">

<span>Frais Natcash (retrait)</span>

<span>+{natcashInfo.natcashFee} HTG</span>

</div>

)}

<div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">

<span>

{paymentMethod === 'natcash' ? 'Total à transférer' : 'Total'}

</span>

<span className="text-orange-500">

{paymentMethod === 'natcash' && natcashInfo ?

natcashInfo.transferAmount + ' HTG' :

total + ' HTG'

}

</span>

</div>

</div>

</div>



<div className="flex gap-3">

<Button

variant="outline"

className="flex-1"

onClick={() => setStep('cart')}

>

Retour

</Button>

<Button

className="flex-1 bg-orange-500 hover:bg-orange-600"

onClick={() => createOrderMutation.mutate()}

disabled={

createOrderMutation.isPending ||

redirectingToMoncash ||

(paymentMethod === 'card' && !squareToken) ||

(paymentMethod === 'natcash' && !natcashTransactionCode.trim())

}

>

{redirectingToMoncash ? 'Redirection MonCash...' :

paymentMethod === 'natcash' ? 'Soumettre le code' :

createOrderMutation.isPending ? 'Traitement...' : 'Confirmer'}

</Button>

</div>

</motion.div>

)}



{/* Confirmed */}

{step === 'confirmed' && (

<motion.div

key="confirmed"

initial={{ opacity: 0, scale: 0.95 }}

animate={{ opacity: 1, scale: 1 }}

className="text-center py-8"

>

<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">

<svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">

<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />

</svg>

</div>

<h2 className="text-2xl font-bold text-slate-800 mb-2">Commande Confirmée!</h2>

<p className="text-slate-500 mb-6">Numéro: {orderNumber}</p>



<div className="bg-orange-50 rounded-2xl p-6 mb-6">

<p className="text-sm text-orange-700 mb-2">Code de confirmation</p>

<p className="text-4xl font-bold text-orange-600 tracking-widest">{confirmCode}</p>

<p className="text-xs text-orange-600 mt-2">Donnez ce code au livreur</p>

</div>



{paymentMethod === 'natcash' && (

<div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 mb-6">

<h3 className="font-semibold text-purple-700 mb-2">🎉 Paiement Natcash Soumis!</h3>

<p className="text-sm text-purple-600 mb-3">

Votre code de transaction a été enregistré. Notre équipe va vérifier manuellement votre transfert.

</p>

<div className="bg-white rounded-lg p-3 text-left">

<p className="text-xs text-slate-500">Statut actuel</p>

<p className="font-bold text-purple-700">⏳ En attente de validation</p>

<p className="text-xs text-slate-400 mt-1">

Vous recevrez une notification lorsque le transfert sera vérifié.

</p>

</div>

</div>

)}



<div className="flex gap-3">

<Link to={createPageUrl('Orders')} className="flex-1">

<Button variant="outline" className="w-full">

Mes Commandes

</Button>

</Link>

<Link to={createPageUrl('Home')} className="flex-1">

<Button className="w-full bg-orange-500 hover:bg-orange-600">

Continuer

</Button>

</Link>

</div>

</motion.div>

)}

</AnimatePresence>

</main>

</div>

);

}