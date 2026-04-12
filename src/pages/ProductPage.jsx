import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, Send, Store, MapPin, Share2, MessageCircle, Loader2 } from 'lucide-react';
import { cacheProduct, getCachedProduct } from '@/lib/useProductCache';
import { enqueueCartAction, useCartSync } from '@/lib/useCartSync';
import { Helmet } from 'react-helmet-async';
import { applyClientMargin, getClientPrice } from '@/components/utils/priceCalculation';
import { trackMetaEvent } from '@/components/utils/metaTracking';
import { useAuth } from '@/components/auth/useAuth';
import { useGuestCart } from '@/components/cart/useGuestCart';
import { toast } from 'sonner';
import CompactProductCard from '@/components/home/CompactProductCard';

function saveScroll() {
  try { sessionStorage.setItem('marketplace_scroll', String(window.scrollY)); } catch (_) {}
}
 
export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToGuestCart } = useGuestCart();
  const queryClient = useQueryClient();
  const [qty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [waMessage, setWaMessage] = useState('');
  const [waBoxOpen, setWaBoxOpen] = useState(false);
  const [relatedVisible, setRelatedVisible] = useState(12);
  const [optimisticCart, setOptimisticCart] = useState(0);

  useCartSync(user?.id);

  useEffect(() => {
    window.history.pushState({ productPage: true }, '');
    const handlePop = () => { saveScroll(); navigate(-1); };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [navigate]);

  const cached = getCachedProduct(slug);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const bySlug = await base44.entities.Product.filter({ slug });
      if (bySlug.length > 0) return bySlug;
      return base44.entities.Product.filter({ id: slug });
    },
    enabled: !!slug,
    initialData: cached?.product ? [cached.product] : undefined,
    staleTime: 2 * 60 * 1000,
  });

  const product = products[0];

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  const shop = shops.find(s => s.id === product?.shop_id);

  const { data: sameShopProducts = [] } = useQuery({
    queryKey: ['sameShop', product?.shop_id],
    queryFn: () => base44.entities.Product.filter({ shop_id: product.shop_id, is_available: true }, '-created_date', 20),
    enabled: !!product?.shop_id,
  });

  const { data: similarProducts = [] } = useQuery({
    queryKey: ['similar', product?.category],
    queryFn: () => base44.entities.Product.filter({ category: product.category, is_available: true }, '-created_date', 30),
    enabled: !!product?.category,
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  // LOGIQUE DE PARTAGE (PREVIEW WHATSAPP)
  const getShareUrl = useCallback(() => {
    if (!product) return window.location.href;
    const base = 'https://rapido-presto.base44.app/functions/ogMetaTags';
    const params = new URLSearchParams();
    if (shop?.slug) params.set('slug', shop.slug);
    if (product.slug || product.id) params.set('product', product.slug || product.id);
    return `${base}?${params.toString()}`;
  }, [product, shop]);

  const handleShare = useCallback(() => {
    const url = getShareUrl();
    if (navigator.share) {
      navigator.share({ title: product.name, url });
    } else {
      navigator.clipboard?.writeText(url);
      toast.success('Lien copié !');
    }
  }, [product, getShareUrl]);

  useEffect(() => {
    if (product && shop) cacheProduct(product, shop);
  }, [product, shop]);

  useEffect(() => {
    if (!product) return;
    const price = applyClientMargin(product.promo_price || product.price);
    trackMetaEvent('ViewContent', {
      content_ids: [product.id],
      content_type: 'product',
      content_name: product.name,
      contents: [{ id: product.id, quantity: 1, item_price: price }],
      value: price,
      currency: 'HTG',
    });
    setWaMessage(`Bonjour, je suis intéressé par: ${product.name}`);
  }, [product]);

  const addToCartMutation = useMutation({
    mutationFn: async ({ quantity }) => {
      const existing = cartItems.find(i => i.product_id === product.id);
      const price = getClientPrice(product);
      if (existing) {
        return base44.entities.CartItem.update(existing.id, { quantity: existing.quantity + quantity });
      }
      return base44.entities.CartItem.create({
        user_id: user.id,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        quantity,
        unit_price: price,
        shop_id: product.shop_id,
        shop_name: shop?.company_name || '',
        shop_region: shop?.region || '',
      });
    },
    onMutate: () => setOptimisticCart(c => c + 1),
    onSuccess: () => {
      queryClient.invalidateQueries(['cart', user?.id]);
      toast.success('Ajouté au panier !');
    },
    onError: () => setOptimisticCart(c => Math.max(0, c - 1)),
  });

  const handleAddToCart = useCallback(() => {
    if (!user) {
      setOptimisticCart(c => c + 1);
      addToGuestCart({
        product_id: product.id, product_name: product.name, product_image: product.image_url,
        quantity: qty, unit_price: getClientPrice(product),
        shop_id: product.shop_id, shop_name: shop?.company_name, shop_region: shop?.region
      });
      enqueueCartAction({
        type: 'add',
        data: {
          product_id: product.id, product_name: product.name,
          product_image: product.image_url, quantity: qty,
          unit_price: getClientPrice(product), shop_id: product.shop_id,
          shop_name: shop?.company_name, shop_region: shop?.region,
        },
      });
      toast.success('Ajouté au panier');
      return;
    }
    addToCartMutation.mutate({ quantity: qty });
  }, [product, qty, user, shop, addToGuestCart, addToCartMutation]);

  const handlePayNow = useCallback(() => {
    handleAddToCart();
    setTimeout(() => navigate('/Cart'), 300);
  }, [handleAddToCart, navigate]);

  const handleSendWhatsApp = useCallback(() => {
    const previewUrl = getShareUrl();
    const fullMsg = `${waMessage}\n${previewUrl}`;
    window.open(`https://wa.me/50948690366?text=${encodeURIComponent(fullMsg)}`, '_blank');
    setWaBoxOpen(false);
  }, [waMessage, getShareUrl]);

  const relatedProducts = React.useMemo(() => {
    if (!product) return [];
    const sameShop = sameShopProducts.filter(p => p.id !== product.id).slice(0, 7);
    const others = similarProducts.filter(p => p.id !== product.id && p.shop_id !== product.shop_id);
    const productTags = new Set(product.seo_tags || []);
    const scored = others.map(p => {
      const score = (p.seo_tags || []).filter(t => productTags.has(t)).length;
      return { ...p, _score: score };
    }).sort((a, b) => b._score - a._score);
    return [...sameShop, ...scored.slice(0, 5)];
  }, [sameShopProducts, similarProducts, product]);

  if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (!product) return <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4"><p className="text-gray-500">Produit introuvable</p><button onClick={() => navigate(-1)} className="text-blue-600 font-semibold">← Retour</button></div>;

  const price = applyClientMargin(product.promo_price || product.price);
  const originalPrice = product.promo_price ? applyClientMargin(product.price) : null;
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const allImages = [product.image_url, ...(product.additional_images || [])].filter(Boolean);
  const currentImg = allImages[imgIndex] || product.image_url;
  const imgSrc = currentImg ? `${currentImg}${currentImg.includes('?') ? '&' : '?'}width=800&quality=80` : null;

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#f0f2f5' }}>
      <Helmet>
        <title>{product.name} | Rapido Presto</title>
        <meta property="og:image" content={imgSrc} />
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => { saveScroll(); navigate(-1); }} className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <span className="text-sm font-semibold text-gray-900 truncate flex-1">{product.name}</span>
        
        <button onClick={handleShare} className="p-1.5 rounded-full hover:bg-gray-100">
          <Share2 className="w-5 h-5 text-gray-700" />
        </button>
        
        <button onClick={() => navigate('/Cart')} className="relative p-1.5">
          <ShoppingCart className="w-5 h-5 text-gray-700" />
          {(cartItems.length > 0 || optimisticCart > 0) && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {cartItems.reduce((s, i) => s + i.quantity, 0) + optimisticCart}
            </span>
          )}
        </button>
      </div>

      {/* Photo Section */}
      <div className="bg-white relative">
        <div className="w-full" style={{ aspectRatio: '1/1' }}>
          <img src={imgSrc} alt={product.name} className="w-full h-full object-contain" />
        </div>
        {hasPromo && <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">-{Math.round((1 - product.promo_price / product.price) * 100)}%</div>}
        
        <button onClick={handleShare} className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur shadow-md rounded-full">
          <Share2 className="w-4 h-4 text-gray-700" />
        </button>

        {allImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {allImages.map((_, i) => (
              <button key={i} onClick={() => setImgIndex(i)} className="rounded-full transition-all" style={{ width: i === imgIndex ? 20 : 8, height: 8, backgroundColor: i === imgIndex ? '#1877F2' : 'rgba(255,255,255,0.7)' }} />
            ))}
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-white mt-2 px-4 py-4 shadow-sm">
        <h1 className="text-xl font-bold leading-snug mb-1" style={{ color: '#050505' }}>{product.name}</h1>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-xl font-bold text-blue-600">{price.toLocaleString()} HTG</span>
          {originalPrice && <span className="text-sm line-through text-gray-400">{originalPrice.toLocaleString()} HTG</span>}
        </div>

        {/* WhatsApp Message Box */}
        <div className="mb-4">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contacter le vendeur</div>
          {!waBoxOpen ? (
            <button onClick={() => setWaBoxOpen(true)} className="w-full flex items-center gap-3 border border-green-200 bg-green-50/30 rounded-xl px-4 py-3 text-sm text-gray-700 hover:bg-green-50 transition">
              <MessageCircle className="w-5 h-5 text-green-500" fill="currentColor" />
              <span className="flex-1 text-left truncate">{waMessage}</span>
              <Send className="w-4 h-4 text-green-600" />
            </button>
          ) : (
            <div className="border border-green-400 rounded-xl overflow-hidden bg-white shadow-lg animate-in fade-in zoom-in duration-200">
              <textarea value={waMessage} onChange={e => setWaMessage(e.target.value)} rows={3} className="w-full px-4 pt-3 text-sm outline-none resize-none" />
              <div className="flex justify-end gap-2 p-3 bg-gray-50 border-t border-gray-100">
                <button onClick={() => setWaBoxOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-500">Annuler</button>
                <button onClick={handleSendWhatsApp} className="px-5 py-2 text-xs font-bold text-white bg-green-600 rounded-lg flex items-center gap-2 shadow-md">
                  <Send className="w-3 h-3" /> Envoyer sur WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-3">
          <button onClick={handleAddToCart} className="flex-1 py-3 rounded-xl text-sm font-bold border border-gray-200 text-blue-600 hover:bg-gray-50 active:scale-95 transition-all">Ajouter au panier</button>
          <button onClick={handlePayNow} className="flex-1 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 shadow-lg shadow-blue-100 active:scale-95 transition-all">Payer maintenant</button>
        </div>

        {product.description && <p className="text-sm text-gray-600 mt-5 border-t border-gray-100 pt-4 leading-relaxed">{product.description}</p>}
      </div>

      {/* Seller info */}
      {shop && (
        <div className="bg-white mt-2 px-4 py-4 shadow-sm">
          <h2 className="text-sm font-bold mb-3 text-gray-900">Vendeur</h2>
          <button onClick={() => navigate(`/ShopView?slug=${shop.slug || ''}&id=${shop.id}`)} className="flex items-center gap-3 w-full">
            {shop.company_logo_url ? <img src={shop.company_logo_url} alt={shop.company_name} className="w-12 h-12 rounded-full border border-gray-100" /> : <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center"><Store className="w-6 h-6 text-blue-600" /></div>}
            <div className="flex-1 text-left"><p className="text-sm font-bold text-gray-900">{shop.company_name}</p>{shop.region && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{shop.region}</p>}</div>
            <span className="text-xs font-bold text-blue-600">Boutique →</span>
          </button>
        </div>
      )}

      {/* Related Section */}
      {relatedProducts.length > 0 && (
        <div className="bg-white mt-2 px-4 py-4 shadow-sm">
          <h2 className="text-sm font-bold mb-4 text-gray-900">Articles similaires</h2>
          <div className="grid grid-cols-2 gap-3">
            {relatedProducts.slice(0, relatedVisible).map(p => (
              <CompactProductCard key={p.id} product={p} shop={shops.find(sh => sh.id === p.shop_id)} onClick={() => navigate(`/product/${p.slug || p.id}`)} />
            ))}
          </div>
          {relatedVisible < relatedProducts.length && (
            <button onClick={() => setRelatedVisible(v => v + 12)} className="w-full mt-6 py-3 rounded-xl bg-gray-100 text-sm font-bold text-gray-700">Voir plus d'articles</button>
          )}
        </div>
      )}
    </div>
  );
}