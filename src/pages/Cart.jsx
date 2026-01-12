import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Minus, Trash2, CreditCard, Wallet, Check, Info, ChevronRight, ShoppingBag, Copy } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import { getHaitiTime } from '@/components/utils/dateFormat';
import SquarePaymentForm from '@/components/payment/SquarePaymentForm';

// --- LOGIQUE DES FRAIS ---
function calculateDeliveryFee(clientCommune, shopCommune) {
  const sameCommune = clientCommune === shopCommune;
  return sameCommune ? 300 : 500;
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
  const [paymentMethod, setPaymentMethod] = useState('card'); // Par défaut Carte (Cash supprimé)
  const [paymentPlan, setPaymentPlan] = useState('full'); // 'full' ou 'split' (50/50)
  const [orderNumber, setOrderNumber] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
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

  // Appel des articles similaires (même catégorie que le premier article du panier)
  const { data: similarProducts = [] } = useQuery({
    queryKey: ['similar', cartItems[0]?.category_id],
    queryFn: () => base44.entities.Product.filter({ category_id: cartItems[0]?.category_id, _limit: 4 }),
    enabled: cartItems.length > 0
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
  
  // Logique 50/50
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

  const addToCartMutation = useMutation({
    mutationFn: (product) => base44.entities.CartItem.create({
      user_id: user.id,
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url,
      unit_price: product.price,
      quantity: 1,
      shop_id: product.shop_id,
      shop_name: product.shop_name,
      shop_region: product.shop_region
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
          amount: finalAmountToPay,
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
          amount_paid: finalAmountToPay,
          balance_due: balanceDueAtDelivery,
          payment_method: paymentMethod,
          payment_plan: paymentPlan,
          status: 'pending_validation',
          confirmation_code: code,
          external_transaction_code: transactionCode.trim()
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
    <div className="min-h-screen bg-white font-sans text-black">
      {/* Header Style SHEIN */}
      <header className="border-b h-14 flex items-center px-4 sticky top-0 bg-white z-50">
        <button onClick={() => step === 'checkout' ? setStep('cart') : navigate(-1)} className="mr-4">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 text-center font-bold tracking-widest uppercase text-sm">
          {step === 'cart' ? 'Mon Panier' : 'Paiement'}
        </h1>
        <div className="w-6" />
      </header>

      <main className="max-w-xl mx-auto p-4">
        <AnimatePresence mode="wait">
          {step === 'cart' && (
            <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {/* Articles Panier */}
              <div className="space-y-6 mb-8">
                {cartItems.map(item => (
                  <div key={item.id} className="flex gap-4 border-b pb-4">
                    <div className="w-24 h-32 bg-gray-100 flex-shrink-0 overflow-hidden">
                       <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <p className="font-medium text-sm leading-tight">{item.product_name}</p>
                          <button onClick={() => base44.entities.CartItem.delete(item.id)}>
                            <Trash2 className="w-4 h-4 text-gray-400" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 uppercase">Shop: {item.shop_name}</p>
                      </div>
                      <div className="flex justify-between items-end">
                        <p className="font-bold">{item.unit_price} HTG</p>
                        <div className="flex items-center border">
                          <button className="p-1"><Minus className="w-3 h-3" /></button>
                          <span className="px-3 text-sm">{item.quantity}</span>
                          <button className="p-1"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Suggestions SHEIN style */}
              {similarProducts.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-sm mb-4 uppercase tracking-wider">Vous pourriez aussi aimer</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {similarProducts.map(prod => (
                      <div key={prod.id} className="space-y-2">
                        <div className="aspect-[3/4] bg-gray-50 relative">
                           <img src={prod.main_image} className="w-full h-full object-cover" />
                           <button className="absolute bottom-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm">
                              <ShoppingBag className="w-4 h-4" />
                           </button>
                        </div>
                        <p className="text-xs truncate">{prod.name}</p>
                        <p className="text-xs font-bold">{prod.price} HTG</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Résumé fixe en bas comme SHEIN */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Sous-total</span>
                  <span>{subtotal} HTG</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{baseTotal} HTG</span>
                </div>
                <Button 
                  className="w-full mt-4 bg-black text-white hover:bg-zinc-800 rounded-none h-12 uppercase tracking-widest font-bold"
                  onClick={() => setStep('checkout')}
                >
                  Commander ({cartItems.length})
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'checkout' && (
            <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-24">
              
              {/* ÉTAPE 1: OPTION DE PAIEMENT (50/50 vs COMPLET) */}
              <section className="space-y-4">
                <h3 className="font-bold text-sm uppercase border-l-4 border-black pl-2">Options de paiement</h3>
                <div className="grid grid-cols-1 gap-3">
                   <div 
                    onClick={() => setPaymentPlan('full')}
                    className={`p-4 border cursor-pointer flex justify-between items-center ${paymentPlan === 'full' ? 'border-black bg-gray-50' : 'border-gray-200'}`}
                   >
                     <div>
                       <p className="font-bold text-sm">Paiement complet</p>
                       <p className="text-xs text-gray-500">Réglez la totalité aujourd'hui</p>
                     </div>
                     {paymentPlan === 'full' && <Check className="w-5 h-5" />}
                   </div>

                   <div 
                    onClick={() => setPaymentPlan('split')}
                    className={`p-4 border cursor-pointer flex justify-between items-center ${paymentPlan === 'split' ? 'border-black bg-gray-50' : 'border-gray-200'}`}
                   >
                     <div>
                       <p className="font-bold text-sm">Payer en 2 temps (50/50)</p>
                       <p className="text-xs text-gray-500">Payez la moitié maintenant, le reste à la livraison</p>
                     </div>
                     {paymentPlan === 'split' && <Check className="w-5 h-5" />}
                   </div>
                </div>

                {paymentPlan === 'split' && (
                  <div className="bg-zinc-50 p-3 border-l-2 border-zinc-400">
                    <div className="flex justify-between text-xs mb-1">
                      <span>À payer aujourd'hui :</span>
                      <span className="font-bold">{baseTotal / 2} HTG</span>
                    </div>
                    <div className="flex justify-between text-xs text-red-600">
                      <span>Balance à la livraison :</span>
                      <span className="font-bold">{baseTotal / 2} HTG</span>
                    </div>
                  </div>
                )}
              </section>

              {/* ÉTAPE 2: MÉTHODES (Pas de Cash) */}
              <section className="space-y-4">
                <h3 className="font-bold text-sm uppercase border-l-4 border-black pl-2">Méthode de transfert</h3>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  <div className="flex items-center space-x-3 p-4 border border-gray-100">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex-1 flex items-center gap-3 cursor-pointer text-sm font-medium uppercase"><CreditCard className="w-4 h-4" />Carte Crédit / Débit</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border border-gray-100">
                    <RadioGroupItem value="moncash" id="moncash" />
                    <Label htmlFor="moncash" className="flex-1 flex items-center gap-3 cursor-pointer text-sm font-medium uppercase"><Wallet className="w-4 h-4" />Moncash</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border border-gray-100">
                    <RadioGroupItem value="natcash" id="natcash" />
                    <Label htmlFor="natcash" className="flex-1 flex items-center gap-3 cursor-pointer text-sm font-medium uppercase"><Wallet className="w-4 h-4" />Natcash</Label>
                  </div>
                </RadioGroup>
              </section>

              {paymentMethod === 'card' && (
                <div className="border p-4">
                  <SquarePaymentForm amount={finalAmountToPay} onSuccess={setSquareToken} onError={(err) => toast.error(err)} />
                </div>
              )}

              {(paymentMethod === 'moncash' || paymentMethod === 'natcash') && (
                <div className="space-y-4 bg-gray-50 p-4 border">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="text-xs uppercase text-gray-500">Montant + Frais</span>
                    <span className="font-bold text-lg">{finalAmountToPay} HTG</span>
                  </div>
                  <div className="text-sm">
                    <p className="text-xs text-gray-500 uppercase">Transférer vers :</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="font-bold tracking-widest">{ACCOUNTS[paymentMethod].number}</span>
                      <Button variant="ghost" size="sm" onClick={() => copyToClipboard(ACCOUNTS[paymentMethod].number, 'account')}><Copy className="w-4 h-4" /></Button>
                    </div>
                    <p className="text-[10px] text-gray-400">{ACCOUNTS[paymentMethod].name}</p>
                  </div>
                  <Input 
                    placeholder="Code de transaction SMS" 
                    className="rounded-none border-black" 
                    value={transactionCode} 
                    onChange={(e) => setTransactionCode(e.target.value)} 
                  />
                </div>
              )}

              {/* Articles similaires avant confirmation */}
              {similarProducts.length > 0 && (
                <section className="space-y-4 mt-8">
                  <h3 className="font-bold text-sm uppercase border-l-4 border-black pl-2">Ajoutez encore plus</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {similarProducts.map(prod => (
                      <div key={prod.id} className="border p-2 space-y-2">
                        <div className="aspect-[3/4] bg-gray-50 relative overflow-hidden">
                           <img src={prod.image_url} className="w-full h-full object-cover" alt={prod.name} />
                        </div>
                        <p className="text-xs truncate">{prod.name}</p>
                        <p className="text-xs font-bold">{prod.price} HTG</p>
                        <Button 
                          size="sm" 
                          className="w-full bg-white border border-black text-black hover:bg-black hover:text-white rounded-none text-[10px] h-7"
                          onClick={() => addToCartMutation.mutate(prod)}
                          disabled={addToCartMutation.isPending}
                        >
                          Ajouter
                        </Button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t z-50">
                <Button 
                  className="w-full h-12 bg-black text-white rounded-none uppercase tracking-widest font-bold" 
                  onClick={() => createOrderMutation.mutate()} 
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? "Traitement..." : `Payer ${finalAmountToPay} HTG`}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'confirmed' && (
            <motion.div key="confirmed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 px-6">
              <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold uppercase tracking-tighter mb-2">Merci pour votre commande !</h2>
              <p className="text-sm text-gray-500 mb-8">Un agent va valider votre paiement sous peu.</p>
              
              <div className="border p-6 mb-8">
                <p className="text-xs text-gray-400 uppercase mb-2">Code de retrait</p>
                <p className="text-4xl font-black tracking-widest">{confirmCode}</p>
              </div>

              <Link to={createPageUrl('Home')}>
                <Button className="w-full bg-black text-white rounded-none h-12 uppercase">Continuer mes achats</Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}