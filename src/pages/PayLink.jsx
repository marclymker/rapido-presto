import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ShoppingBag, AlertCircle, CheckCircle, Wallet, CreditCard, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PayLink() {
  const urlParams = new URLSearchParams(window.location.search);
  const linkId = urlParams.get('id');

  const [user, setUser] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('moncash');
  const [step, setStep] = useState('review'); // review | paying | done
  const [orderNumber, setOrderNumber] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        setUser(u);
        setLoadingUser(false);
      })
      .catch(() => {
        // Non connecté → redirection vers login avec retour automatique
        base44.auth.redirectToLogin(window.location.href);
      });
  }, []);

  const { data: link, isLoading } = useQuery({
    queryKey: ['payment-link', linkId],
    queryFn: () => base44.entities.PaymentLink.filter({ id: linkId }).then(r => r[0]),
    enabled: !!linkId
  });

  const handlePay = async () => {
    if (!user) {
      toast.error('Connectez-vous pour payer');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    setStep('paying');
    try {
      const orderNum = 'RP' + Date.now().toString().slice(-6);
      const code = Math.floor(1000 + Math.random() * 9000).toString();

      const order = await base44.entities.Order.create({
        order_number: orderNum,
        client_id: user.id,
        client_name: user.full_name,
        client_phone: user.phone || '',
        client_address: user.address || '',
        client_region: user.region || '',
        shop_id: link.shop_id,
        shop_name: link.shop_name,
        items: link.items.map(i => ({
          product_id: i.product_id,
          name: i.name,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total: i.unit_price * i.quantity
        })),
        subtotal: link.subtotal,
        delivery_fee: link.delivery_fee,
        total: link.total,
        payment_method: paymentMethod,
        status: 'pending',
        payment_status: 'pending',
        confirmation_code: code,
        delivery_type: 'merchant_delivery'
      });

      // Update payment link status
      await base44.entities.PaymentLink.update(link.id, { status: 'paid', order_id: order.id });

      if (paymentMethod === 'moncash') {
        const response = await base44.functions.invoke('moncashCreatePayment', {
          orderId: orderNum,
          amount: link.total,
          description: `Paiement ${link.title}`
        });
        if (response.data?.paymentUrl) {
          window.location.href = response.data.paymentUrl;
          return;
        }
        throw new Error('Erreur MonCash');
      }

      // CASH: direct confirmation
      setOrderNumber(orderNum);
      setConfirmCode(code);
      setStep('done');
      await base44.functions.invoke('sendOrderNotification', { orderId: order.id, status: 'pending' }).catch(() => {});
      await base44.functions.invoke('sendWhatsAppOrderNotification', { orderId: order.id }).catch(() => {});
    } catch (e) {
      toast.error(e.message);
      setStep('review');
    }
  };

  if (!linkId) return <div className="min-h-screen flex items-center justify-center"><p className="text-slate-500">Lien invalide</p></div>;

  // Si pas encore de user (en attente de redirect ou chargement), afficher spinner
  if (loadingUser || (!user && !isLoading)) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
    </div>
  );

  if (isLoading || loadingUser) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
    </div>
  );

  if (!link) return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-3">
      <AlertCircle className="w-12 h-12 text-red-400" />
      <p className="text-slate-600">Ce lien de paiement n'existe pas ou a expiré.</p>
    </div>
  );

  if (step === 'done') return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
        <h2 className="text-2xl font-bold text-slate-800">Commande confirmée !</h2>
        <p className="text-slate-500">Numéro : <span className="font-bold text-slate-800">{orderNumber}</span></p>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <p className="text-sm text-orange-700 mb-1">Code de confirmation</p>
          <p className="text-4xl font-black text-orange-600 tracking-widest">{confirmCode}</p>
          <p className="text-xs text-orange-500 mt-1">Partagez ce code avec le vendeur</p>
        </div>
        <Button onClick={() => window.location.href = '/'} className="w-full bg-orange-500 hover:bg-orange-600">
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );

  if (link.status === 'paid') return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-3">
      <CheckCircle className="w-12 h-12 text-green-500" />
      <p className="text-slate-700 font-semibold">Ce lien a déjà été payé.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      {/* Header */}
      <div className="bg-white border-b px-4 py-5 flex items-center gap-3">
        {link.shop_logo ? (
          <img src={link.shop_logo} className="w-10 h-10 rounded-full object-cover" alt="" />
        ) : (
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-orange-500" />
          </div>
        )}
        <div>
          <p className="text-xs text-slate-400">Paiement sécurisé via</p>
          <p className="font-bold text-slate-800">{link.shop_name}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Title */}
        <div>
          <h1 className="text-xl font-bold text-slate-800">{link.title}</h1>
          {link.note && <p className="text-sm text-slate-500 mt-1 italic">"{link.note}"</p>}
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Articles</p>
          {link.items.map((item, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <ShoppingBag className="w-5 h-5 m-3.5 text-slate-300" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-500">{item.quantity}x {item.unit_price.toLocaleString()} HTG</p>
              </div>
              <p className="text-sm font-bold text-slate-800">{(item.unit_price * item.quantity).toLocaleString()} HTG</p>
            </div>
          ))}

          <div className="border-t pt-3 space-y-1.5">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Sous-total</span><span>{link.subtotal?.toLocaleString()} HTG</span>
            </div>
            {link.delivery_fee > 0 && (
              <div className="flex justify-between text-sm text-slate-600">
                <span>Livraison</span><span>{link.delivery_fee?.toLocaleString()} HTG</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black">
              <span>Total</span><span className="text-orange-600">{link.total?.toLocaleString()} HTG</span>
            </div>
          </div>
        </div>

        {/* Payment method */}
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Mode de paiement</p>
          <div className="space-y-2">
            {[
              { id: 'moncash', label: 'MonCash', icon: <Wallet className="w-5 h-5 text-orange-500" />, recommended: true },
              { id: 'CASH', label: 'Paiement à la livraison', icon: <span className="text-lg">💵</span> },
            ].map(m => (
              <button
                key={m.id}
                onClick={() => setPaymentMethod(m.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition ${paymentMethod === m.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}
              >
                {m.icon}
                <span className="font-medium text-sm">{m.label}</span>
                {m.recommended && <span className="ml-auto text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full">Recommandé</span>}
              </button>
            ))}
          </div>
        </div>

        {!user && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700">
            Vous devrez vous connecter pour finaliser le paiement.
          </div>
        )}

        <Button
          className="w-full h-14 text-lg font-bold bg-orange-500 hover:bg-orange-600"
          onClick={handlePay}
          disabled={step === 'paying'}
        >
          {step === 'paying' ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
          {step === 'paying' ? 'Traitement...' : `Payer ${link.total?.toLocaleString()} HTG`}
        </Button>
      </div>
    </div>
  );
}