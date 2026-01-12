import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Minus, Trash2, CreditCard, Wallet, Banknote, Clock, AlertTriangle, Copy, Check, Info, Star, ShoppingBag } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import { getHaitiTime } from '@/components/utils/dateFormat';
import SquarePaymentForm from '@/components/payment/SquarePaymentForm';

// --- LOGIQUE DES FRAIS (GARDÉE INTACTE) ---
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

  // --- NOUVEAU: ARTICLES SIMILAIRES ---
  const { data: similarProducts = [] } = useQuery({
    queryKey: ['similar-products'],
    queryFn: () => base44.entities.Product.filter({}, { limit: 4 }),
    enabled: !!user?.id
  });

  // --- CALCULS DU PANIER (MODIFIÉS POUR OPTION 2 TEMPS) ---
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
          amount_paid: amountToPayNow, // Enregistre ce qui est payé maintenant
          remaining_balance: balanceToPayLater, // Enregistre la balance
          payment_method: paymentMethod,
          status: (paymentMethod === 'moncash' || paymentMethod === 'natcash') ? 'pending_validation' : 'pending',
          payment_status: isTwoSteps ? 'partially_paid' : (paymentMethod === 'CASH' ? 'pending' : 'paid'),
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
    }
  });

  return (
    <div className="min-h-screen bg-[#f3f3f3]"> {/* Style gris Amazon/Shein */}
      {/* HEADER STYLE AMAZON */}
      <header className="bg-[#131921] text-white p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-white" onClick={() => step === 'checkout' ? setStep('cart') : navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold italic">RapidPanye</h1>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
             {step === 'cart' ? 'Panier' : 'Paiement sécurisé'}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:py-8">
        <AnimatePresence mode="wait">
          {step === 'cart' && (
            <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-white p-6 rounded shadow-sm border">
                <h2 className="text-2xl font-bold mb-4">Votre panier</h2>
                <div className="space-y-4">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex gap-4 border-b pb-4">
                      <div className="w-20 h-20 bg-slate-100 rounded" />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <p className="font-bold text-lg">{item.product_name}</p>
                          <p className="font-bold">{item.unit_price} HTG</p>
                        </div>
                        <p className="text-sm text-green-600 font-bold">En stock</p>
                        <div className="mt-2 flex items-center gap-4">
                           <div className="flex items-center border rounded bg-slate-50">
                              <button className="px-2 py-1"><Minus size={14}/></button>
                              <span className="px-3 text-sm">{item.quantity}</span>
                              <button className="px-2 py-1"><Plus size={14}/></button>
                           </div>
                           <button onClick={() => base44.entities.CartItem.delete(item.id)} className="text-xs text-blue-600 hover:underline">Supprimer</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* NOUVEAU: SECTION PRODUITS SIMILAIRES STYLE SHEIN */}
              <div className="bg-white p-6 rounded shadow-sm border">
                 <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ShoppingBag size={18} className="text-orange-500"/> Autres articles similaires</h3>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {similarProducts.map(prod => (
                      <div key={prod.id} className="border rounded p-2 hover:shadow-md transition">
                        <div className="aspect-square bg-slate-50 rounded mb-2" />
                        <p className="text-sm font-medium line-clamp-1">{prod.name}</p>
                        <p className="font-bold text-orange-600 text-sm">{prod.price} HTG</p>
                        <Button size="sm" variant="outline" className="w-full mt-2 h-7 text-xs border-orange-400 text-orange-600 hover:bg-orange-50">Ajouter</Button>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="bg-white p-6 rounded shadow-sm border space-y-3">
                <div className="flex justify-between text-lg font-medium"><span>Sous-total:</span><span>{subtotal} HTG</span></div>
                <div className="flex justify-between font-bold text-2xl border-t pt-3"><span>Total:</span><span className="text-[#B12704]">{baseTotal} HTG</span></div>
                <Button className="w-full bg-[#FFD814] hover:bg-[#F7CA00] text-black h-12 rounded-lg font-bold shadow-sm" onClick={() => setStep('checkout')}>Passer au paiement</Button>
              </div>
            </motion.div>
          )}

          {step === 'checkout' && (
            <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
              <div className="bg-white p-6 rounded shadow-sm border">
                <h3 className="font-bold text-xl mb-6">Sélectionnez un mode de paiement</h3>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-4">
                  {/* OPTION PAIEMENT EN 2 TEMPS */}
                  <div className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all ${paymentMethod === 'TWO_STEPS' ? 'border-orange-500 bg-orange-50' : 'border-slate-100'}`}>
                    <RadioGroupItem value="TWO_STEPS" id="two_steps" />
                    <Label htmlFor="two_steps" className="flex-1 cursor-pointer">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-lg">Payer en 2 fois (50% / 50%)</span>
                            <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded font-black italic">PROMO</span>
                        </div>
                        <p className="text-xs text-slate-500">Payez la moitié aujourd'hui, le reste à la livraison.</p>
                    </Label>
                  </div>

                  <div className="flex items-center space-x-3 p-4 rounded-lg border border-slate-100">
                    <RadioGroupItem value="CASH" id="cash" />
                    <Label htmlFor="cash" className="flex-1 flex items-center gap-3 cursor-pointer"><Banknote className="text-green-600" />Cash à la livraison</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-lg border border-slate-100">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex-1 flex items-center gap-3 cursor-pointer"><CreditCard className="text-blue-600" />Carte de Crédit</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 rounded-lg border border-slate-100">
                    <RadioGroupItem value="moncash" id="moncash" />
                    <Label htmlFor="moncash" className="flex-1 flex items-center gap-3 cursor-pointer"><Wallet className="text-orange-500" />Moncash</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* RECAPITULATIF DYNAMIQUE */}
              <div className="bg-slate-900 text-white p-6 rounded shadow-lg">
                  <p className="text-sm opacity-70">Montant à régler immédiatement :</p>
                  <p className="text-3xl font-black">{finalAmountToPay} HTG</p>
                  {isTwoSteps && (
                      <div className="mt-4 pt-4 border-t border-white/20">
                          <p className="text-xs flex items-center gap-2 font-medium"><Clock size={14}/> Balance de {balanceToPayLater} HTG à payer à la livraison.</p>
                      </div>
                  )}
              </div>

              {paymentMethod === 'card' && (
                <SquarePaymentForm amount={amountToPayNow} onSuccess={setSquareToken} onError={(err) => toast.error(err)} />
              )}

              {(paymentMethod === 'moncash' || paymentMethod === 'natcash') && (
                <div className={`p-5 rounded-xl border-2 bg-white`}>
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Info className="w-5 h-5" />Instructions de transfert</h3>
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded border flex justify-between items-center">
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Compte {paymentMethod}</p>
                            <p className="font-bold text-lg">{ACCOUNTS[paymentMethod].number}</p>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => copyToClipboard(ACCOUNTS[paymentMethod].number, 'account')}><Copy className="w-4 h-4" /></Button>
                    </div>
                    <Input placeholder="Code de transaction SMS" value={transactionCode} onChange={(e) => setTransactionCode(e.target.value)} />
                  </div>
                </div>
              )}

              <Button className="w-full h-14 bg-[#FFD814] hover:bg-[#F7CA00] text-black font-bold text-lg rounded-lg shadow-md" onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending}>
                {createOrderMutation.isPending ? "Validation..." : "Confirmer la commande"}
              </Button>
            </motion.div>
          )}

          {step === 'confirmed' && (
            <motion.div key="confirmed" initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center py-20 bg-white rounded shadow-sm border">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><Check className="text-green-600 w-10 h-10" /></div>
              <h2 className="text-2xl font-black mb-6">Commande réussie !</h2>
              <p className="text-slate-500 mb-6">Code de récupération :</p>
              <div className="bg-[#131921] text-white p-8 rounded-xl max-w-xs mx-auto mb-8"><p className="text-5xl font-black tracking-widest">{confirmCode}</p></div>
              <Link to={createPageUrl('Home')}><Button className="px-10">Retour à la boutique</Button></Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}