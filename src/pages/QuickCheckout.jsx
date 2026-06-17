import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Wallet, MapPin } from 'lucide-react';
import { useAuth } from '@/components/auth/useAuth';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import SquarePaymentForm from '@/components/payment/SquarePaymentForm';
import { applyClientMargin } from '@/components/utils/priceCalculation';

function generateConfirmationCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function QuickCheckout() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const productId = searchParams.get('product_id');
  const qty = parseInt(searchParams.get('quantity') || '1', 10);

  const [paymentMethod, setPaymentMethod] = useState('moncash');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [squareToken, setSquareToken] = useState(null);
  const [confOrder, setConfOrder] = useState(null);
  const [confCode, setConfCode] = useState(null);
  const [splitPercent, setSplitPercent] = useState(50);

  const { data: products = [], isLoading: productLoading } = useQuery({
    queryKey: ['quick-product', productId],
    queryFn: () => base44.entities.Product.filter({ id: productId }),
    enabled: !!productId,
  });

  const product = products[0];

  const { data: shops = [] } = useQuery({
    queryKey: ['quick-shop', product?.shop_id],
    queryFn: () => base44.entities.Shop.filter({ id: product.shop_id }),
    enabled: !!product?.shop_id,
  });

  const shop = shops[0];
  const price = product ? applyClientMargin(product.promo_price || product.price) : 0;
  const total = price * qty;

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!product || !user) throw new Error('Données manquantes');

      const orderNum = 'RP' + Date.now().toString().slice(-6);
      const code = generateConfirmationCode();

      const order = await base44.entities.Order.create({
        order_number: orderNum,
        client_id: user.id,
        client_name: user.full_name,
        client_phone: user.phone,
        client_address: user.address || '',
        client_region: user.region,
        shop_id: product.shop_id,
        shop_name: shop?.company_name || '',
        shop_region: shop?.region || '',
        items: [{
          product_id: product.id,
          name: product.name,
          quantity: qty,
          unit_price: price,
          total: total,
        }],
        subtotal: total,
        delivery_fee: 0,
        total: total,
        payment_method: paymentMethod,
        status: 'pending',
        payment_status: paymentMethod === 'card' ? 'paid' : 'pending',
        confirmation_code: code,
        special_instructions: specialInstructions,
      });

      if (paymentMethod === 'card') {
        if (!squareToken) throw new Error('Token de paiement manquant');
        const paymentResponse = await base44.functions.invoke('squarePayment', {
          sourceId: squareToken,
          amount: total,
          orderId: orderNum,
        });
        if (!paymentResponse.data.success) throw new Error('Paiement refusé');

        await base44.functions.invoke('sendOrderNotification', { orderId: order.id, status: 'pending' }).catch(() => {});
        await base44.functions.invoke('sendWhatsAppOrderNotification', { orderId: order.id }).catch(() => {});
        return { orderNum, code };
      }

      if (paymentMethod === 'moncash') {
        const payAmount = Math.round(total * splitPercent / 100);
        const response = await base44.functions.invoke('moncashCreatePayment', {
          orderId: orderNum,
          amount: payAmount,
          description: `Commande ${orderNum} - ${product.name} (${splitPercent}%)`,
        });
        const paymentData = response.data;
        if (!paymentData?.success || !paymentData?.paymentUrl) {
          throw new Error(paymentData?.error || 'Erreur MonCash');
        }
        await base44.entities.Order.update(order.id, { moncash_transaction_id: paymentData.transactionId });
        return { redirectToMoncash: true, paymentUrl: paymentData.paymentUrl, orderNum };
      }
    },
    onSuccess: (data) => {
      if (data?.redirectToMoncash && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      if (window.fbq) {
        window.fbq('track', 'Purchase', {
          content_ids: [product.id],
          content_type: 'product',
          contents: [{ id: product.id, quantity: qty, item_price: price }],
          num_items: qty,
          value: total,
          currency: 'HTG',
          order_id: data.orderNum,
        });
      }
      setConfOrder(data.orderNum);
      setConfCode(data.code);
      toast.success('Commande confirmée!');
    },
    onError: (error) => toast.error(error.message || 'Erreur lors du paiement'),
  });

  // Écran confirmation
  if (confOrder && confCode) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-black text-slate-800 mb-2">Paiement Réussi !</h2>
        <p className="text-slate-500 font-medium mb-8">N° de commande : {confOrder}</p>
        <div className="bg-orange-50 rounded-2xl p-6 mb-8 border border-orange-100 w-full max-w-sm">
          <p className="text-sm font-bold text-orange-800 uppercase tracking-wider mb-2">Code de Sécurité</p>
          <p className="text-5xl font-black text-orange-500 tracking-[0.2em]">{confCode}</p>
          <p className="text-sm text-orange-700 mt-3 font-medium">Ne partagez ce code qu'avec le livreur.</p>
        </div>
        <div className="flex gap-3 max-w-sm w-full">
          <Link to="/Orders" className="flex-1"><Button variant="outline" className="w-full h-12 font-bold">Suivre</Button></Link>
          <Link to="/" className="flex-1"><Button className="w-full bg-orange-500 hover:bg-orange-600 h-12 font-bold">Terminer</Button></Link>
        </div>
      </div>
    );
  }

  if (authLoading || productLoading) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>;
  }

  if (!user) {
    navigate('/'); return null;
  }

  if (!product) {
    return <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4"><p className="text-slate-500">Produit introuvable</p><Link to="/"><Button>Retour</Button></Link></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white sticky top-0 z-40 border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-semibold">Commande rapide</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Résumé produit */}
        <div className="bg-white rounded-xl p-4 flex gap-4 shadow-sm border">
          <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">
            {product.image_url ? <img src={product.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">📦</div>}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-slate-800 truncate">{product.name}</h3>
            {shop && <p className="text-xs text-slate-500">{shop.company_name}</p>}
            <div className="flex items-center justify-between mt-2">
              <span className="font-bold text-slate-800">{price.toLocaleString()} HTG × {qty}</span>
              <span className="font-black text-orange-500">{total.toLocaleString()} HTG</span>
            </div>
          </div>
        </div>

        {/* Paiement */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-bold mb-4 text-slate-800">Méthode de paiement</h3>
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
            <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === 'moncash' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>
              <RadioGroupItem value="moncash" id="moncash" />
              <Wallet className="w-6 h-6 text-orange-500" />
              <div className="flex-1 flex justify-between items-center">
                <span className="font-bold text-slate-800">MonCash</span>
                <span className="text-[10px] uppercase tracking-wider font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">Recommandé</span>
              </div>
            </label>
            <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}>
              <RadioGroupItem value="card" id="card" />
              <CreditCard className="w-6 h-6 text-blue-600" />
              <span className="font-bold text-slate-800">Carte de crédit/débit</span>
            </label>
          </RadioGroup>

          {paymentMethod === 'moncash' && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Paiement fractionné</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSplitPercent(50)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    splitPercent === 50
                      ? 'border-orange-500 bg-orange-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-2xl font-black text-orange-500">50%</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">Payer 50%</p>
                  <p className="text-xs text-slate-400 mt-0.5">{Math.round(total * 0.5).toLocaleString()} HTG</p>
                </button>
                <button
                  onClick={() => setSplitPercent(100)}
                  className={`p-4 rounded-xl border-2 text-center transition-all ${
                    splitPercent === 100
                      ? 'border-orange-500 bg-orange-50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="text-2xl font-black text-slate-700">100%</p>
                  <p className="text-sm font-bold text-slate-700 mt-1">Payer 100%</p>
                  <p className="text-xs text-slate-400 mt-0.5">{total.toLocaleString()} HTG</p>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Adresse */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-bold mb-1 text-slate-800 flex items-center gap-2"><MapPin className="w-4 h-4" /> Adresse de livraison</h3>
          <p className="text-slate-600 font-medium">{user.address || 'Non définie'}</p>
          <p className="text-slate-400 text-sm">{user.region}</p>
        </div>

        {/* Square */}
        {paymentMethod === 'card' && (
          <SquarePaymentForm
            amount={total}
            onSuccess={(token) => { setSquareToken(token); toast.success('Carte validée'); }}
            onError={(error) => { setSquareToken(null); toast.error(error); }}
          />
        )}

        {/* Instructions */}
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-bold mb-3 text-slate-800">Instructions spéciales</h3>
          <Textarea
            placeholder="Ex: Sonnez à la porte, laissez à l'accueil..."
            value={specialInstructions}
            onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 200))}
            className="min-h-[80px] bg-slate-50 border-slate-200"
            maxLength={200}
          />
        </div>

        {/* Total + Payer */}
        <div className="bg-slate-800 rounded-xl p-5 text-white">
          <div className="flex justify-between font-black text-2xl text-orange-400">
            <span>{paymentMethod === 'moncash' && splitPercent < 100 ? `Payer ${splitPercent}%` : 'Total à Payer'}</span>
            <span>{paymentMethod === 'moncash' ? Math.round(total * splitPercent / 100).toLocaleString() : total.toLocaleString()} HTG</span>
          </div>
          {paymentMethod === 'moncash' && splitPercent < 100 && (
            <p className="text-slate-400 text-xs mt-1 text-right">Reste {Math.round(total * (100 - splitPercent) / 100).toLocaleString()} HTG à la livraison</p>
          )}
        </div>

        <Button
          className="w-full bg-orange-500 hover:bg-orange-600 h-14 text-lg font-bold shadow-lg shadow-orange-500/25"
          onClick={() => createOrderMutation.mutate()}
          disabled={createOrderMutation.isPending || (paymentMethod === 'card' && !squareToken)}
        >
          {createOrderMutation.isPending ? 'Traitement...' : 'Payer maintenant'}
        </Button>
      </main>
    </div>
  );
}