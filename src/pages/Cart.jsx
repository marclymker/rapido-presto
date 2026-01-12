import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, Plus, Minus, Trash2, CreditCard, Wallet, 
  Banknote, Clock, AlertTriangle, Copy, Check, Info, 
  Search, ShoppingCart, Star, ShieldCheck, ChevronRight 
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
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('cart'); 
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [orderNumber, setOrderNumber] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [transactionCode, setTransactionCode] = useState('');
  const [copiedState, setCopiedState] = useState({ account: false, amount: false });
  const [squareToken, setSquareToken] = useState(null);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => navigate(createPageUrl('Home')));
  }, []);

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  // Simulation d'articles similaires (Style Amazon "Frequently bought together")
  const { data: suggestedItems = [] } = useQuery({
    queryKey: ['suggestions'],
    queryFn: () => base44.entities.Product.filter({}, { limit: 4 }),
    enabled: !!user?.id
  });

  // --- CALCULS DU PANIER ---
  const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price + (item.total_customization_price || 0)) * item.quantity, 0);
  const itemsByShop = cartItems.reduce((acc, item) => {
    if (!acc[item.shop_id]) acc[item.shop_id] = [];
    acc[item.shop_id].push(item);
    return acc;
  }, {});
  
  let deliveryFee = 0;
  Object.keys(itemsByShop).forEach(shopId => {
    deliveryFee += calculateDeliveryFee(user?.region || '', itemsByShop[shopId][0].shop_region);
  });
  
  const baseTotal = subtotal + deliveryFee + (user?.pending_balance || 0);
  
  // Logique Paiement en 2 temps
  const isTwoSteps = paymentMethod === 'TWO_STEPS';
  const amountToPayNow = isTwoSteps ? (baseTotal / 2) : baseTotal;
  const balanceToPayLater = isTwoSteps ? (baseTotal / 2) : 0;

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

  const addItemMutation = useMutation({
    mutationFn: (product) => base44.entities.CartItem.create({
      user_id: user.id,
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity: 1,
      shop_id: product.shop_id,
      shop_name: product.shop_name
    }),
    onSuccess: () => {
        queryClient.invalidateQueries(['cart']);
        toast.success("Ajouté au panier");
    }
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if ((paymentMethod === 'moncash' || paymentMethod === 'natcash') && !transactionCode.trim()) {
        throw new Error('Code de transaction requis');
      }
      if (paymentMethod === 'card' && !squareToken) {
        throw new Error('Veuillez valider votre carte');
      }

      const shopIds = Object.keys(itemsByShop);
      const firstOrderNum = 'RP' + Date.now().toString().slice(-6);

      if (paymentMethod === 'card') {
        const paymentResponse = await base44.functions.invoke('squarePayment', {
          sourceId: squareToken,
          amount: amountToPayNow,
          orderId: firstOrderNum
        });
        if (!paymentResponse.data.success) throw new Error('Paiement par carte refusé');
      }

      for (const shopId of shopIds) {
        const shopItems = itemsByShop[shopId];
        const code = generateConfirmationCode();

        await base44.entities.Order.create({
          order_number: `${firstOrderNum}-${shopId.slice(-4)}`,
          client_id: user.id,
          client_name: user.full_name,
          client_phone: user.phone,
          client_address: user.address || '',
          client_region: user.region,
          shop_id: shopId,
          shop_name: shopItems[0].shop_name,
          items: shopItems.map(item => ({
            product_id: item.product_id,
            name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price + (item.total_customization_price || 0)
          })),
          total: baseTotal,
          amount_paid: amountToPayNow,
          pending_balance: balanceToPayLater,
          payment_method: paymentMethod,
          status: (paymentMethod === 'moncash' || paymentMethod === 'natcash') ? 'pending_validation' : 'pending',
          payment_status: isTwoSteps ? 'partially_paid' : (paymentMethod === 'CASH' ? 'pending' : 'paid'),
          confirmation_code: code,
          external_transaction_code: transactionCode.trim(),
          special_instructions: specialInstructions
        });
      }

      // Si balance, on met à jour le profil user (optionnel selon votre backend)
      if (balanceToPayLater > 0) {
          await base44.entities.User.update(user.id, {
              pending_balance: (user.pending_balance || 0) + balanceToPayLater
          });
      }

      await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));
      return { orderNum: firstOrderNum, code: generateConfirmationCode() };
    },
    onSuccess: (data) => {
      setOrderNumber(data.orderNum);
      setConfirmCode(data.code);
      setStep('confirmed');
    },
    onError: (err) => toast.error(err.message)
  });

  return (
    <div className="min-h-screen bg-[#eaeded]">
      {/* Header Amazon Style */}
      <header className="bg-[#232f3e] text-white p-3 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="text-white hover:bg-slate-700 p-1" onClick={() => navigate(-1)}>
              <ArrowLeft />
            </Button>
            <h1 className="text-xl font-bold tracking-tight">Rapid<span className="text-orange-400">Panye</span></h1>
          </div>
          <div className="flex-1 max-w-xl hidden md:flex relative">
            <Input className="w-full bg-white text-black" placeholder="Rechercher un produit..." />
            <div className="absolute right-0 bg-orange-400 h-full px-3 flex items-center rounded-r-md cursor-pointer">
              <Search className="text-black w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm font-bold">
            <div className="relative">
                <ShoppingCart />
                <span className="absolute -top-2 -right-2 bg-orange-500 text-black text-xs rounded-full w-5 h-5 flex items-center justify-center">{cartItems.length}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:py-8">
        <AnimatePresence mode="wait">
          {step === 'cart' && (
            <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Colonne Gauche: Articles */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white p-6 shadow-sm border-b">
                   <h2 className="text-2xl font-semibold mb-4">Votre panier</h2>
                   {cartItems.length === 0 ? (
                       <div className="text-center py-10">
                           <p className="text-slate-500 mb-4">Votre panier est vide</p>
                           <Link to={createPageUrl('Home')}><Button className="bg-orange-400 text-black">Continuer mes achats</Button></Link>
                       </div>
                   ) : (
                    <div className="divide-y">
                        {cartItems.map(item => (
                            <div key={item.id} className="py-4 flex gap-4">
                                <div className="w-24 h-24 bg-slate-100 rounded flex-shrink-0" />
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h3 className="font-bold text-lg hover:text-orange-600 cursor-pointer">{item.product_name}</h3>
                                        <p className="font-bold text-xl">{item.unit_price} HTG</p>
                                    </div>
                                    <p className="text-green-600 text-sm font-medium">En stock</p>
                                    <div className="flex items-center gap-4 mt-3">
                                        <div className="flex items-center border rounded-lg bg-slate-50">
                                            <button className="px-3 py-1 border-r hover:bg-slate-100"><Minus className="w-4 h-4" /></button>
                                            <span className="px-4 font-bold">{item.quantity}</span>
                                            <button className="px-3 py-1 border-l hover:bg-slate-100"><Plus className="w-4 h-4" /></button>
                                        </div>
                                        <button 
                                            onClick={() => base44.entities.CartItem.delete(item.id)}
                                            className="text-xs text-blue-600 hover:underline border-l pl-4"
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                   )}
                </div>

                {/* Section Suggestion "Amazon Style" */}
                <div className="bg-white p-6 shadow-sm">
                    <h3 className="font-bold text-lg mb-4">Articles souvent achetés ensemble</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {suggestedItems.map(prod => (
                            <div key={prod.id} className="group cursor-pointer">
                                <div className="aspect-square bg-slate-50 rounded mb-2 overflow-hidden border">
                                    <img src={prod.image_url} alt="" className="object-cover w-full h-full group-hover:scale-105 transition" />
                                </div>
                                <p className="text-sm font-medium line-clamp-1">{prod.name}</p>
                                <div className="flex text-orange-400 mt-1"><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /></div>
                                <p className="text-red-700 font-bold mt-1">{prod.price} HTG</p>
                                <Button 
                                    size="sm" 
                                    className="w-full mt-2 bg-yellow-400 hover:bg-yellow-500 text-black text-xs"
                                    onClick={() => addItemMutation.mutate(prod)}
                                >
                                    Ajouter
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
              </div>

              {/* Colonne Droite: Résumé */}
              <div className="space-y-4">
                <div className="bg-white p-6 shadow-sm border sticky top-20">
                    <div className="flex items-center gap-2 text-green-700 text-sm mb-4">
                        <ShieldCheck className="w-5 h-5" />
                        <span>Votre commande est éligible à la livraison rapide.</span>
                    </div>
                    <div className="text-xl mb-4">
                        Sous-total ({cartItems.length} articles): <span className="font-bold">{subtotal} HTG</span>
                    </div>
                    <Button 
                        disabled={cartItems.length === 0}
                        className="w-full bg-[#ffd814] hover:bg-[#f7ca00] text-black border border-[#fcd200] rounded-full h-10 font-medium"
                        onClick={() => setStep('checkout')}
                    >
                        Passer la commande
                    </Button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'checkout' && (
            <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                
                {/* Section Paiement */}
                <div className="bg-white p-6 shadow-sm border">
                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="bg-slate-800 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                        Mode de paiement
                    </h3>
                    
                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                        <div className={`p-4 rounded-lg border-2 transition-all ${paymentMethod === 'TWO_STEPS' ? 'border-orange-500 bg-orange-50' : 'border-slate-100'}`}>
                            <div className="flex items-center space-x-3">
                                <RadioGroupItem value="TWO_STEPS" id="two-steps" />
                                <Label htmlFor="two-steps" className="flex-1 cursor-pointer">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-lg">Paiement en 2 temps (50/50)</span>
                                        <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded">POPULAIRE</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">Payez {amountToPayNow} HTG maintenant, et le reste ({balanceToPayLater} HTG) à la livraison.</p>
                                </Label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-slate-50">
                                <RadioGroupItem value="CASH" />
                                <div className="flex flex-col">
                                    <span className="font-bold flex items-center gap-2"><Banknote size={16}/> Cash</span>
                                    <span className="text-xs text-slate-500">Payer le total à la livraison</span>
                                </div>
                            </Label>

                            <Label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-slate-50">
                                <RadioGroupItem value="card" />
                                <div className="flex flex-col">
                                    <span className="font-bold flex items-center gap-2"><CreditCard size={16}/> Carte</span>
                                    <span className="text-xs text-slate-500">Visa, Mastercard, Square</span>
                                </div>
                            </Label>

                            <Label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-slate-50">
                                <RadioGroupItem value="moncash" />
                                <div className="flex flex-col">
                                    <span className="font-bold flex items-center gap-2 text-orange-600"><Wallet size={16}/> Moncash</span>
                                    <span className="text-xs text-slate-500">Paiement mobile instantané</span>
                                </div>
                            </Label>
                        </div>
                    </RadioGroup>

                    {paymentMethod === 'card' && (
                        <div className="mt-6 border-t pt-6">
                            <SquarePaymentForm amount={amountToPayNow} onSuccess={setSquareToken} onError={(err) => toast.error(err)} />
                        </div>
                    )}

                    {(paymentMethod === 'moncash' || paymentMethod === 'natcash') && (
                        <div className="mt-6 p-4 bg-slate-50 rounded-xl border-dashed border-2">
                             <div className="flex justify-between mb-4">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">À transférer maintenant</p>
                                    <p className="text-2xl font-black text-orange-600">{finalAmountToPay} HTG</p>
                                </div>
                                <Button size="sm" variant="outline" onClick={() => copyToClipboard(finalAmountToPay.toString(), 'amount')}>Copier</Button>
                             </div>
                             <Input 
                                placeholder="Code de transaction SMS" 
                                className="bg-white" 
                                value={transactionCode} 
                                onChange={(e) => setTransactionCode(e.target.value)} 
                             />
                        </div>
                    )}
                </div>
              </div>

              {/* Résumé de commande fixe style Amazon */}
              <div className="lg:col-span-1">
                <div className="bg-white p-6 shadow-sm border rounded-lg space-y-4">
                    <Button 
                        className="w-full bg-[#ffd814] hover:bg-[#f7ca00] text-black font-bold h-12 rounded-lg"
                        onClick={() => createOrderMutation.mutate()}
                        disabled={createOrderMutation.isPending}
                    >
                        {createOrderMutation.isPending ? "Traitement..." : "Confirmer et payer"}
                    </Button>
                    <p className="text-[11px] text-center text-slate-500">
                        En passant votre commande, vous acceptez les conditions générales de vente de RapidPanye.
                    </p>
                    
                    <div className="border-t pt-4 space-y-2">
                        <h4 className="font-bold text-sm">Récapitulatif de la commande</h4>
                        <div className="flex justify-between text-sm"><span>Articles:</span><span>{subtotal} HTG</span></div>
                        <div className="flex justify-between text-sm"><span>Livraison:</span><span>{deliveryFee} HTG</span></div>
                        {isTwoSteps && (
                            <div className="flex justify-between text-sm text-blue-600"><span>Paiement différé:</span><span>-{balanceToPayLater} HTG</span></div>
                        )}
                        <div className="flex justify-between text-lg font-bold text-red-700 border-t pt-2">
                            <span>Total TTC:</span>
                            <span>{finalAmountToPay} HTG</span>
                        </div>
                    </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 'confirmed' && (
            <motion.div key="confirmed" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md mx-auto text-center py-20">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="text-green-600 w-12 h-12" />
              </div>
              <h2 className="text-3xl font-black mb-2 text-slate-900">Merci !</h2>
              <p className="text-slate-600 mb-8">Votre commande <span className="font-bold">#{orderNumber}</span> a été enregistrée avec succès.</p>
              
              <div className="bg-white p-8 rounded-2xl shadow-xl border-2 border-slate-100 mb-8">
                <p className="text-sm text-slate-500 uppercase tracking-widest mb-2 font-bold">Code de récupération</p>
                <p className="text-6xl font-black tracking-tighter text-slate-900">{confirmCode}</p>
              </div>

              <div className="flex flex-col gap-3">
                <Link to={createPageUrl('Home')} className="w-full">
                    <Button className="w-full bg-slate-900 h-12">Continuer mes achats</Button>
                </Link>
                <Button variant="outline" className="h-12 border-2">Suivre mon colis</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer minimal style Amazon */}
      <footer className="mt-20 bg-[#232f3e] text-slate-300 py-10 px-4">
          <div className="max-w-6xl mx-auto text-center border-t border-slate-700 pt-10">
              <h2 className="text-xl font-bold text-white mb-4">RapidPanye</h2>
              <div className="flex justify-center gap-6 text-sm">
                  <span className="hover:underline cursor-pointer">Conditions d'utilisation</span>
                  <span className="hover:underline cursor-pointer">Avis de confidentialité</span>
                  <span className="hover:underline cursor-pointer">Aide</span>
              </div>
              <p className="text-xs mt-8">© 2024-2025, RapidPanye.com, Inc. ou ses filiales</p>
          </div>
      </footer>
    </div>
  );
}