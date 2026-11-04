import React, { useState, useMemo } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useQuery } from '@tanstack/react-query';
import { Plus, Minus, Trash2, Link, Copy, Check, ShoppingBag, Send } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PaymentLinkBuilder({ shop, user }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const [search, setSearch] = useState('');
  const [createdLink, setCreatedLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: products = [] } = useQuery({
    queryKey: ['vendor-products', shop?.id],
    queryFn: () => firebaseApi.entities.Product.filter({ shop_id: shop?.id, is_available: true }, '-created_date', 200),
    enabled: !!shop?.id
  });

  const filtered = useMemo(() => {
    if (!search.trim()) return products.slice(0, 30);
    const q = search.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20);
  }, [products, search]);

  const addItem = (product) => {
    setCartItems(prev => {
      const exists = prev.find(i => i.product_id === product.id);
      if (exists) return prev.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, {
        product_id: product.id,
        name: product.name,
        image: product.image_url,
        quantity: 1,
        unit_price: product.promo_price && product.promo_price < product.price ? product.promo_price : product.price
      }];
    });
  };

  const updateQty = (product_id, qty) => {
    if (qty <= 0) setCartItems(prev => prev.filter(i => i.product_id !== product_id));
    else setCartItems(prev => prev.map(i => i.product_id === product_id ? { ...i, quantity: qty } : i));
  };

  const subtotal = cartItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const total = subtotal + Number(deliveryFee || 0);

  const handleCreate = async () => {
    if (!cartItems.length) { toast.error('Ajoutez au moins un article'); return; }
    if (!title.trim()) { toast.error('Donnez un titre à ce lien'); return; }
    setLoading(true);
    try {
      const link = await firebaseApi.entities.PaymentLink.create({
        shop_id: shop.id,
        shop_name: shop.company_name,
        shop_logo: shop.company_logo_url,
        vendor_id: user.id,
        title: title.trim(),
        items: cartItems,
        subtotal,
        delivery_fee: Number(deliveryFee || 0),
        total,
        note: note.trim(),
        status: 'active'
      });
      const url = `${window.location.origin}/PayLink?id=${link.id}`;
      setCreatedLink(url);
      toast.success('Lien de paiement créé !');
    } catch (e) {
      toast.error('Erreur: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(createdLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(`Voici votre lien de paiement pour *${title}* :\n${createdLink}`);
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const reset = () => {
    setTitle(''); setNote(''); setDeliveryFee(0);
    setCartItems([]); setCreatedLink(null); setSearch('');
  };

  if (createdLink) {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-green-800">Lien créé avec succès !</h2>
          <p className="text-sm text-green-700 font-medium">{title}</p>
          <p className="text-2xl font-black text-green-900">{total.toLocaleString()} HTG</p>

          <div className="bg-white rounded-xl border p-3 text-left break-all text-xs text-slate-600">
            {createdLink}
          </div>

          <div className="flex gap-3">
            <Button onClick={handleCopy} className="flex-1 bg-slate-800 hover:bg-slate-900">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copié !' : 'Copier'}
            </Button>
            <Button onClick={handleWhatsApp} className="flex-1 bg-green-600 hover:bg-green-700">
              <Send className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>

          <Button variant="outline" className="w-full" onClick={reset}>
            Créer un nouveau lien
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
      <h2 className="text-xl font-bold text-slate-800">🔗 Créer un lien de paiement</h2>

      {/* Title & Note */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <Input
          placeholder="Titre (ex: Commande robe + accessoires)"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="font-medium"
        />
        <Input
          placeholder="Note pour le client (optionnel)"
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      {/* Product Search */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-700">Ajouter des articles</p>
        <Input
          placeholder="Rechercher un produit..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => addItem(p)}
              className="flex items-center gap-2 bg-slate-50 hover:bg-orange-50 border rounded-lg p-2 text-left transition"
            >
              <div className="w-10 h-10 rounded-md bg-slate-200 overflow-hidden flex-shrink-0">
                {p.image_url ? <img src={p.image_url} className="w-full h-full object-cover" /> : <ShoppingBag className="w-4 h-4 m-3 text-slate-400" />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                <p className="text-xs text-orange-600 font-bold">{(p.promo_price || p.price).toLocaleString()} HTG</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Cart */}
      {cartItems.length > 0 && (
        <div className="bg-white rounded-xl border p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-700">Panier ({cartItems.length} articles)</p>
          {cartItems.map(item => (
            <div key={item.product_id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                <p className="text-xs text-slate-500">{item.unit_price.toLocaleString()} HTG × {item.quantity} = <span className="font-bold text-slate-700">{(item.unit_price * item.quantity).toLocaleString()} HTG</span></p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.product_id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                <button onClick={() => updateQty(item.product_id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200">
                  <Plus className="w-3 h-3" />
                </button>
                <button onClick={() => updateQty(item.product_id, 0)} className="w-7 h-7 rounded-full text-red-400 hover:bg-red-50 flex items-center justify-center ml-1">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}

          {/* Delivery fee */}
          <div className="flex items-center gap-3 pt-2 border-t">
            <span className="text-sm text-slate-600 flex-1">Frais de livraison</span>
            <Input
              type="number"
              value={deliveryFee}
              onChange={e => setDeliveryFee(e.target.value)}
              className="w-28 text-right"
              min={0}
            />
            <span className="text-sm text-slate-500">HTG</span>
          </div>

          {/* Total */}
          <div className="flex justify-between items-center bg-orange-50 rounded-lg p-3 border border-orange-200">
            <span className="font-bold text-slate-800">Total</span>
            <span className="text-xl font-black text-orange-600">{total.toLocaleString()} HTG</span>
          </div>
        </div>
      )}

      <Button
        className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-base font-bold"
        onClick={handleCreate}
        disabled={loading || !cartItems.length || !title.trim()}
      >
        <Link className="w-5 h-5 mr-2" />
        {loading ? 'Création...' : 'Générer le lien de paiement'}
      </Button>
    </div>
  );
}
