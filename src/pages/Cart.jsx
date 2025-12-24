import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Minus, Trash2, CreditCard, Wallet, Banknote } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';

function calculateDeliveryFee(clientCommune, shopCommune) {
  const hour = new Date().getHours();
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

export default function Cart() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('cart'); // cart, checkout, confirmed
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [orderNumber, setOrderNumber] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      navigate(createPageUrl('Home'));
    });
  }, []);

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

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

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const orderNum = 'RP' + Date.now().toString().slice(-6);
      const code = generateConfirmationCode();
      const shop = cartItems[0];
      const deliveryFee = calculateDeliveryFee(user.commune, shop.shop_commune);
      const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      
      const order = await base44.entities.Order.create({
        order_number: orderNum,
        client_id: user.id,
        client_name: user.full_name,
        client_phone: user.phone,
        client_address: user.address || '',
        client_commune: user.commune,
        shop_id: shop.shop_id,
        shop_name: shop.shop_name,
        shop_commune: shop.shop_commune,
        items: cartItems.map(item => ({
          product_id: item.product_id,
          name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.unit_price * item.quantity
        })),
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        total: subtotal + deliveryFee,
        payment_method: paymentMethod,
        status: 'pending',
        confirmation_code: code
      });

      // Clear cart
      await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));
      
      return { orderNum, code };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['cart']);
      setOrderNumber(data.orderNum);
      setConfirmCode(data.code);
      setStep('confirmed');
      toast.success('Commande confirmée!');
    },
    onError: () => {
      toast.error('Erreur lors de la création de la commande');
    }
  });

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const deliveryFee = cartItems.length > 0 
    ? calculateDeliveryFee(user.commune, cartItems[0].shop_commune) 
    : 0;
  const total = subtotal + deliveryFee;

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
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-semibold text-orange-500">
                          {item.unit_price * item.quantity} HTG
                        </span>
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
                <div className="flex justify-between text-slate-600">
                  <span>Frais de livraison</span>
                  <span>{deliveryFee} HTG</span>
                </div>
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
                      <span>Carte de débit/crédit</span>
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

              {/* Delivery Address */}
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-semibold mb-3">Adresse de livraison</h3>
                <p className="text-slate-600">{user.address || 'Non définie'}</p>
                <p className="text-slate-500 text-sm">{user.commune}</p>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-xl p-4 space-y-2">
                <h3 className="font-semibold mb-3">Récapitulatif</h3>
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between text-sm text-slate-600">
                    <span>{item.quantity}x {item.product_name}</span>
                    <span>{item.unit_price * item.quantity} HTG</span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-total</span>
                    <span>{subtotal} HTG</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Livraison</span>
                    <span>{deliveryFee} HTG</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg pt-2">
                    <span>Total</span>
                    <span className="text-orange-500">{total} HTG</span>
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
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? 'Traitement...' : 'Confirmer'}
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