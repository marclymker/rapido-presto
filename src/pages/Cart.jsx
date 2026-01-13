import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Minus, Trash2, CreditCard, Wallet, Banknote, Clock, AlertTriangle, Copy, Check, Info, MapPin, Edit3, ShoppingBag } from 'lucide-react';
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

// --- LOGIQUE DES FRAIS (GARDÉE ENTIÈRE) ---
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
  const [step, setStep] = useState('cart'); 
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentPlan, setPaymentPlan] = useState('full'); // 'full' ou 'split'
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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(createPageUrl('Home'));
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user?.address) {
      setTempAddress(user.address);
    }
  }, [user]);

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  // Fonction d'appel des articles de la même catégorie
  const { data: similarProducts = [] } = useQuery({
    queryKey: ['similar', cartItems[0]?.product_id],
    queryFn: async () => {
      if (!cartItems[0]?.product_id) return [];
      const firstProduct = await base44.entities.Product.filter({ id: cartItems[0].product_id }, { limit: 1 });
      if (!firstProduct[0]?.category) return [];
      return base44.entities.Product.filter({ category: firstProduct[0].category }, { limit: 4 });
    },
    enabled: cartItems.length > 0
  });

  // --- CALCULS DU PANIER ---
  const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price + (item.total_customization_price || 0)) * item.quantity, 0);
  
  const getDeliveryPrice = () => {
    if (deliveryOption === 'makarios_pap') return 250;
    if (deliveryOption === 'makarios_cap') return 1000;
    return 300; // Adresse (si region client = region boutique)
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
    mutationFn: ({ id, quantity }) => {
      if (quantity <= 0) return base44.entities.CartItem.delete(id);
      return base44.entities.CartItem.update(id, { quantity });
    },
    onSuccess: () => queryClient.invalidateQueries(['cart'])
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => base44.entities.CartItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['cart'])
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
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

        // Send email notification to vendor
        try {
          const { data: shops } = await base44.entities.Shop.filter({ id: shopId });
          const shop = shops?.[0];
          if (shop?.email) {
            await base44.functions.invoke('sendOrderEmail', {
              type: 'new_order',
              orderData: {
                order_number: orderResponse.order_number,
                total: orderResponse.total,
                items: orderResponse.items
              },
              shopData: {
                company_name: shop.company_name,
                email: shop.email
              },
              clientData: {
                name: user.full_name,
                phone: user.phone,
                address: tempAddress,
                email: user.email
              }
            });
          }
        } catch (emailError) {
          console.log('Email notification failed:', emailError);
        }
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
                    <div className="w-24 h-32 bg-gray-50 overflow-hidden">
                       <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm leading-tight">{item.product_name}</p>
                        <button onClick={() => deleteItemMutation.mutate(item.id)}><Trash2 className="w-4 h-4 text-gray-300" /></button>
                      </div>
                      <div className="flex justify-between items-end">
                        <p className="font-bold text-sm">{item.unit_price.toLocaleString()} HTG</p>
                        <div className="flex items-center border border-black">
                          <button className="px-2 py-1" onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity - 1 })}><Minus className="w-3 h-3"/></button>
                          <span className="px-2 text-xs">{item.quantity}</span>
                          <button className="px-2 py-1" onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}><Plus className="w-3 h-3"/></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Articles Similaires */}
              {similarProducts.length > 0 && (
                <div className="mb-8">
                  <h3 className="font-bold text-xs uppercase tracking-widest mb-4">Articles similaires</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {similarProducts.map(prod => (
                      <div key={prod.id} className="space-y-1">
                        <div className="aspect-[3/4] bg-gray-100 relative">
                           <img src={prod.main_image} className="w-full h-full object-cover" />
                           <div className="absolute bottom-2 right-2 bg-white p-1 rounded-full shadow"><ShoppingBag className="w-3 h-3"/></div>
                        </div>
                        <p className="text-[10px] truncate">{prod.name}</p>
                        <p className="text-xs font-bold">{prod.price.toLocaleString()} HTG</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Résumé Fixe SHEIN */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-xs text-gray-500 uppercase"><span>Sous-total</span><span>{subtotal.toLocaleString()} HTG</span></div>
                <div className="flex justify-between text-xs text-gray-500 uppercase"><span>Livraison</span><span>{getDeliveryPrice().toLocaleString()} HTG</span></div>
                {(user?.pending_balance || 0) > 0 && (
                  <div className="flex justify-between text-xs text-orange-600 uppercase"><span>Balance due</span><span>{user.pending_balance.toLocaleString()} HTG</span></div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2"><span>Total</span><span>{baseTotal.toLocaleString()} HTG</span></div>
                <Button className="w-full bg-black text-white rounded-none h-12 uppercase tracking-widest font-bold text-xs" onClick={() => setStep('checkout')}>Passer au paiement</Button>
              </div>
            </motion.div>
          )}

          {step === 'checkout' && (
            <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8 pb-24">
              
              {/* OPTIONS DE LIVRAISON */}
              <section className="space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-widest border-l-4 border-black pl-2">Options de livraison</h3>
                <RadioGroup value={deliveryOption} onValueChange={setDeliveryOption} className="space-y-2">
                  <div className={`p-4 border flex justify-between items-center ${deliveryOption === 'address' ? 'border-black bg-zinc-50' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="address" id="addr" />
                      <Label htmlFor="addr" className="text-xs font-bold uppercase">Livraison à domicile</Label>
                    </div>
                    <span className="text-xs font-bold">300 HTG</span>
                  </div>
                  {deliveryOption === 'address' && (
                    <div className="p-3 bg-zinc-100 flex justify-between items-center">
                      {isEditingAddress ? (
                        <Input value={tempAddress} onChange={(e) => setTempAddress(e.target.value)} className="h-8 rounded-none border-black bg-white text-xs" />
                      ) : (
                        <p className="text-xs">{tempAddress || "Entrez votre adresse"}</p>
                      )}
                      <button onClick={() => setIsEditingAddress(!isEditingAddress)}><Edit3 className="w-4 h-4"/></button>
                    </div>
                  )}
                  <div className={`p-4 border flex justify-between items-center ${deliveryOption === 'makarios_pap' ? 'border-black bg-zinc-50' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="makarios_pap" id="pap" />
                      <Label htmlFor="pap" className="text-xs font-bold uppercase">Makarios P.A.P</Label>
                    </div>
                    <span className="text-xs font-bold">250 HTG</span>
                  </div>
                  <div className={`p-4 border flex justify-between items-center ${deliveryOption === 'makarios_cap' ? 'border-black bg-zinc-50' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                      <RadioGroupItem value="makarios_cap" id="cap" />
                      <Label htmlFor="cap" className="text-xs font-bold uppercase">Makarios CAP-H</Label>
                    </div>
                    <span className="text-xs font-bold">1000 HTG</span>
                  </div>
                </RadioGroup>
              </section>

              {/* ÉTAPE PAIEMENT 2 TEMPS */}
              <section className="space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-widest border-l-4 border-black pl-2">Plan de paiement</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div onClick={() => setPaymentPlan('full')} className={`p-4 border text-center cursor-pointer ${paymentPlan === 'full' ? 'border-black bg-black text-white' : 'border-gray-100'}`}>
                    <p className="text-[10px] font-bold uppercase">Complet</p>
                  </div>
                  <div onClick={() => setPaymentPlan('split')} className={`p-4 border text-center cursor-pointer ${paymentPlan === 'split' ? 'border-black bg-black text-white' : 'border-gray-100'}`}>
                    <p className="text-[10px] font-bold uppercase">50% / 50%</p>
                  </div>
                </div>
                {paymentPlan === 'split' && (
                  <div className="p-3 bg-red-50 border-l-2 border-red-500 text-[10px] uppercase font-bold text-red-600 flex justify-between">
                    <span>Balance à la livraison :</span>
                    <span>{(baseTotal / 2).toLocaleString()} HTG</span>
                  </div>
                )}
              </section>

              <section className="space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-widest border-l-4 border-black pl-2">Méthode</h3>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  <div className="flex items-center space-x-3 p-4 border border-gray-100 uppercase text-[10px] font-bold tracking-widest">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex-1 cursor-pointer">Carte Crédit</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border border-gray-100 uppercase text-[10px] font-bold tracking-widest">
                    <RadioGroupItem value="moncash" id="moncash" />
                    <Label htmlFor="moncash" className="flex-1 cursor-pointer">Moncash</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-4 border border-gray-100 uppercase text-[10px] font-bold tracking-widest">
                    <RadioGroupItem value="natcash" id="natcash" />
                    <Label htmlFor="natcash" className="flex-1 cursor-pointer">Natcash</Label>
                  </div>
                </RadioGroup>
              </section>

              {paymentMethod === 'card' && <SquarePaymentForm amount={finalAmountToPay} onSuccess={setSquareToken} onError={(err) => toast.error(err)} />}

              {(paymentMethod === 'moncash' || paymentMethod === 'natcash') && (
                <div className="p-4 bg-zinc-50 border space-y-4">
                  <div className="flex justify-between items-center border-b pb-2"><span className="text-[10px] uppercase font-bold text-gray-400">Total à payer</span><span className="text-xl font-black">{finalAmountToPay.toLocaleString()} HTG</span></div>
                  <div className="flex justify-between items-center"><span className="text-xs font-bold tracking-widest">{ACCOUNTS[paymentMethod].number}</span><Button variant="ghost" size="sm" onClick={() => copyToClipboard(ACCOUNTS[paymentMethod].number, 'account')}><Copy className="w-4 h-4"/></Button></div>
                  <Input placeholder="CODE SMS DE TRANSACTION" className="rounded-none border-black h-12 uppercase text-xs" value={transactionCode} onChange={(e) => setTransactionCode(e.target.value)} />
                </div>
              )}

              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
                <Button className="w-full h-14 bg-black text-white rounded-none uppercase font-bold tracking-tighter" onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending}>
                  {createOrderMutation.isPending ? "Traitement..." : `Payer ${finalAmountToPay.toLocaleString()} HTG`}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'confirmed' && (
            <motion.div key="confirmed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 px-6">
              <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto mb-6"><Check className="w-8 h-8" /></div>
              <h2 className="text-xl font-black uppercase tracking-widest mb-8">Confirmé</h2>
              <div className="border-4 border-black p-8 mb-8 text-4xl font-black tracking-[0.2em]">{confirmCode}</div>
              <Link to={createPageUrl('Home')}><Button className="w-full bg-black text-white rounded-none h-12 uppercase">Magasiner encore</Button></Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}