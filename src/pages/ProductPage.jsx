import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, Send, Store, MapPin } from 'lucide-react';
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

  // Background cart sync
  useCartSync(user?.id);

  useEffect(() => {
    window.history.pushState({ productPage: true }, '');
    const handlePop = () => { saveScroll(); navigate(-1); };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Try cache first for instant offline render
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

  // Related: all products for mixing logic
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

  // Cache product when loaded
  useEffect(() => {
    if (product && shop) cacheProduct(product, shop);
  }, [product?.id, shop?.id]);

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
  }, [product?.id]);

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
      // Optimistic + offline queue
      setOptimisticCart(c => c + 1);
      addToGuestCart({
        product_id: product.id, product_name: product.name, product_image: product.image_url,
        quantity: qty, unit_price: getClientPrice(product),
        shop_id: product.shop_id, shop_name: shop?.company_name, shop_region: shop?.region
      });
      // Also enqueue for background sync when user logs in
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
  }, [product, qty, user, shop]);

  const handlePayNow = useCallback(() => {
    handleAddToCart();
    setTimeout(() => navigate('/Cart'), 300);
  }, [handleAddToCart]);

  const handleSendWhatsApp = useCallback(() => {
    const productUrl = `https://rapidopresto.shop/product/${product.slug || product.id}`;
    const fullMsg = `${waMessage}\n${productUrl}`;
    window.open(`https://wa.me/50948690366?text=${encodeURIComponent(fullMsg)}`, '_blank');
    setWaBoxOpen(false);
  }, [waMessage, product]);

  // Build related products: 60% same shop, 40% others
  const relatedProducts = React.useMemo(() => {
    if (!product) return [];
    const sameShop = sameShopProducts.filter(p => p.id !== product.id).slice(0, 7);
    const others = similarProducts.filter(p => p.id !== product.id && p.shop_id !== product.shop_id);
    // Score others by tag similarity
    const productTags = new Set(product.seo_tags || []);
    const scored = others.map(p => {
      const score = (p.seo_tags || []).filter(t => productTags.has(t)).length;
      return { ...p, _score: score };
    }).sort((a, b) => b._score - a._score);
    return [...sameShop, ...scored.slice(0, 5)];
  }, [sameShopProducts, similarProducts, product]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500">Produit introuvable</p>
        <button onClick={() => navigate(-1)} className="text-blue-600 font-semibold">← Retour</button>
      </div>
    );
  }

  const price = applyClientMargin(product.promo_price || product.price);
  const originalPrice = product.promo_price ? applyClientMargin(product.price) : null;
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const allImages = [product.image_url, ...(product.additional_images || [])].filter(Boolean);
  const currentImg = allImages[imgIndex] || product.image_url;
  const imgSrc = currentImg ? `${currentImg}${currentImg.includes('?') ? '&' : '?'}width=800&quality=80` : null;
  const pageTitle = `${product.name}${shop ? ` - ${shop.company_name}` : ''} | Rapido Presto Haïti`;
  const pageDesc = product.description
    ? `${product.description.slice(0, 150)} - Prix: ${price.toLocaleString()} HTG.`
    : `${product.name} - Prix: ${price.toLocaleString()} HTG. Rapido Presto.`;

  const visibleRelated = relatedProducts.slice(0, relatedVisible);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#f0f2f5' }}>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        {imgSrc && <meta property="og:image" content={imgSrc} />}
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => { saveScroll(); navigate(-1); }}
          className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <span className="text-sm font-semibold text-gray-900 truncate flex-1">{product.name}</span>
        <button onClick={() => navigate('/Cart')} className="relative p-1.5">
          <ShoppingCart className="w-5 h-5 text-gray-700" />
          {(cartItems.length > 0 || optimisticCart > 0) && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {cartItems.reduce((s, i) => s + i.quantity, 0) + optimisticCart}
            </span>
          )}
        </button>
      </div>

      {/* Photo */}
      <div className="bg-white relative">
        <div className="w-full" style={{ aspectRatio: '1/1' }}>
          {imgSrc ? (
            <img src={imgSrc} alt={product.image_alt || product.name} className="w-full h-full object-contain" loading="eager" decoding="async" fetchpriority="high" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl">📦</div>
          )}
        </div>

        {hasPromo && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            -{Math.round((1 - product.promo_price / product.price) * 100)}%
          </div>
        )}

        {/* Dot indicators */}
        {allImages.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {allImages.map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIndex(i)}
                className="rounded-full transition-all"
                style={{
                  width: i === imgIndex ? 20 : 8,
                  height: 8,
                  backgroundColor: i === imgIndex ? '#1877F2' : 'rgba(255,255,255,0.7)'
                }}
              />
            ))}
          </div>
        )}

        {/* Thumbnail row if multiple images */}
        {allImages.length > 1 && (
          <div className="flex gap-2 px-3 py-2 overflow-x-auto border-t border-gray-100">
            {allImages.map((img, i) => (
              <button
                key={i}
                onClick={() => setImgIndex(i)}
                className="flex-shrink-0 rounded-md overflow-hidden border-2 transition-all"
                style={{ borderColor: i === imgIndex ? '#1877F2' : 'transparent', width: 52, height: 52 }}
              >
                <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main info card */}
      <div className="bg-white mt-2 px-4 py-4">
        {/* Title */}
        <h1 className="text-lg font-bold leading-snug mb-1" style={{ color: '#050505' }}>{product.name}</h1>

        {/* Price */}
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-xl font-bold" style={{ color: '#050505' }}>{price.toLocaleString()} HTG</span>
          {originalPrice && (
            <span className="text-sm line-through" style={{ color: '#8a8d91' }}>{originalPrice.toLocaleString()} HTG</span>
          )}
        </div>

        {/* WhatsApp message box - full line */}
        <div className="mb-3 w-full">
          {!waBoxOpen ? (
            <button
              onClick={() => setWaBoxOpen(true)}
              className="w-full flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-left hover:bg-gray-50 transition"
              style={{ color: '#444950' }}
            >
              <span className="text-lg">💬</span>
              <span className="truncate flex-1">{waMessage}</span>
              <Send className="w-4 h-4 flex-shrink-0" style={{ color: '#1877F2' }} />
            </button>
          ) : (
            <div className="border border-blue-400 rounded-lg overflow-hidden w-full">
              <textarea
                value={waMessage}
                onChange={e => setWaMessage(e.target.value)}
                rows={3}
                className="w-full px-3 pt-2.5 text-sm resize-none outline-none"
                style={{ color: '#050505' }}
              />
              <div className="flex gap-2 px-3 pb-2.5 justify-end">
                <button
                  onClick={() => setWaBoxOpen(false)}
                  className="text-xs text-gray-500 px-3 py-1.5 rounded-full hover:bg-gray-100"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSendWhatsApp}
                  className="text-xs text-white font-semibold px-4 py-1.5 rounded-full flex items-center gap-1"
                  style={{ backgroundColor: '#1877F2' }}
                >
                  <Send className="w-3 h-3" /> Envoyer
                </button>
              </div>
            </div>
          )}
        </div>

        {/* CTA buttons */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={handleAddToCart}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold border border-gray-300 hover:bg-gray-50 transition"
            style={{ color: '#1877F2' }}
          >
            Ajouter au panier
          </button>
          <button
            onClick={handlePayNow}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white transition"
            style={{ backgroundColor: '#1877F2' }}
          >
            Payer maintenant
          </button>
        </div>

        {/* Description */}
        {product.description && (
          <p className="text-sm leading-relaxed border-t border-gray-100 pt-3" style={{ color: '#444950' }}>
            {product.description}
          </p>
        )}
      </div>

      {/* Shop card */}
      {shop && (
        <div className="bg-white mt-2 px-4 py-4">
          <h2 className="text-sm font-bold mb-3" style={{ color: '#050505' }}>Vendeur</h2>
          <button
            className="flex items-center gap-3 w-full"
            onClick={() => navigate(`/ShopView?slug=${shop.slug || ''}&id=${shop.id}`)}
          >
            {shop.company_logo_url ? (
              <img src={shop.company_logo_url} alt={shop.company_name} className="w-11 h-11 rounded-full object-cover border border-gray-200" />
            ) : (
              <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: '#e7f3ff' }}>
                <Store className="w-5 h-5" style={{ color: '#1877F2' }} />
              </div>
            )}
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold" style={{ color: '#050505' }}>{shop.company_name}</p>
              {shop.region && (
                <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: '#8a8d91' }}>
                  <MapPin className="w-3 h-3" />{shop.region}
                </p>
              )}
            </div>
            <span className="text-xs font-semibold" style={{ color: '#1877F2' }}>Voir boutique →</span>
          </button>
        </div>
      )}

      {/* Related products */}
      {relatedProducts.length > 0 && (
        <div className="bg-white mt-2 px-4 py-4">
          <h2 className="text-sm font-bold mb-3" style={{ color: '#050505' }}>Produits similaires</h2>
          <div className="grid gap-2" style={{ gridTemplateColumns: '1fr 1fr' }}>
            {visibleRelated.map(p => {
              const s = shops.find(sh => sh.id === p.shop_id);
              return (
                <CompactProductCard
                  key={p.id}
                  product={p}
                  shop={s}
                  onClick={() => navigate(`/product/${p.slug || p.id}`)}
                />
              );
            })}
          </div>
          {relatedVisible < relatedProducts.length && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setRelatedVisible(v => v + 12)}
                className="px-8 py-2.5 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: '#1877F2' }}
              >
                Voir plus
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}