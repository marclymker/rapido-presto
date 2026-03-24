import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, ChevronLeft, ChevronRight, Truck, Store } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { applyClientMargin, getClientPrice } from '@/components/utils/priceCalculation';
import { trackMetaEvent } from '@/components/utils/metaTracking';
import { useAuth } from '@/components/auth/useAuth';
import { useGuestCart } from '@/components/cart/useGuestCart';
import { toast } from 'sonner';
import StickyActionBar from '@/components/product/StickyActionBar';
import { generateProductSEO } from '@/components/product/useProductSEO';

const RelatedProducts = lazy(() => import('@/components/product/RelatedProducts'));

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToGuestCart } = useGuestCart();
  const queryClient = useQueryClient();
  const [imgIndex, setImgIndex] = useState(0);
  const [showRelated, setShowRelated] = useState(false);

  // Fetch product
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const bySlug = await base44.entities.Product.filter({ slug });
      if (bySlug.length > 0) return bySlug;
      return base44.entities.Product.filter({ id: slug });
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });

  const product = products[0];

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  const shop = shops.find(s => s.id === product?.shop_id);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  // Track ViewContent + lazy related after 2s
  useEffect(() => {
    if (!product) return;
    trackMetaEvent('ViewContent', {
      content_ids: [product.id],
      content_type: 'product',
      content_name: product.name,
      value: applyClientMargin(product.promo_price || product.price),
      currency: 'HTG',
    });
    try { localStorage.setItem('last_viewed_product', JSON.stringify({ id: product.id, name: product.name, seo_tags: product.seo_tags, category: product.category })); } catch (_) {}
    const t = setTimeout(() => setShowRelated(true), 2000);
    return () => clearTimeout(t);
  }, [product?.id]);

  const addToCartMutation = useMutation({
    mutationFn: async (quantity) => {
      const existing = cartItems.find(i => i.product_id === product.id);
      const price = getClientPrice(product);
      if (existing) return base44.entities.CartItem.update(existing.id, { quantity: existing.quantity + quantity });
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
    onSuccess: () => {
      queryClient.invalidateQueries(['cart', user?.id]);
      toast.success('Ajouté au panier !');
    },
  });

  const handleAddToCart = useCallback((qty = 1) => {
    trackMetaEvent('AddToCart', {
      content_ids: [product.id],
      content_name: product.name,
      value: getClientPrice(product) * qty,
      currency: 'HTG',
    });
    if (!user) {
      addToGuestCart({ product_id: product.id, product_name: product.name, product_image: product.image_url, quantity: qty, unit_price: getClientPrice(product), shop_id: product.shop_id, shop_name: shop?.company_name, shop_region: shop?.region });
      toast.success('Ajouté au panier');
      return;
    }
    addToCartMutation.mutate(qty);
  }, [product, user, shop]);

  const handlePayNow = useCallback((qty = 1) => {
    trackMetaEvent('InitiateCheckout', {
      content_ids: [product.id],
      content_name: product.name,
      value: getClientPrice(product) * qty,
      currency: 'HTG',
    });
    handleAddToCart(qty);
    setTimeout(() => navigate('/Cart'), 300);
  }, [product, handleAddToCart]);

  const handleWhatsApp = useCallback(() => {
    trackMetaEvent('Contact', { content_name: product.name });
    const msg = `Bonjour, je suis intéressé par : ${product.name}\n${window.location.href}`;
    window.open(`https://wa.me/50948690366?text=${encodeURIComponent(msg)}`, '_blank');
  }, [product]);

  // ── LOADING ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-100 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 px-4">
        <p className="text-slate-400 text-lg">Produit introuvable</p>
        <button onClick={() => navigate(-1)} className="text-orange-500 font-semibold text-sm">← Retour</button>
      </div>
    );
  }

  // ── DATA ──────────────────────────────────────────────────
  const price = applyClientMargin(product.promo_price || product.price);
  const originalPrice = product.promo_price ? applyClientMargin(product.price) : null;
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const allImages = [product.image_url, ...(product.additional_images || [])].filter(Boolean);
  const currentImg = allImages[imgIndex];
  const imgSrc = currentImg ? `${currentImg}${currentImg.includes('?') ? '&' : '?'}width=800&quality=80&format=webp` : null;
  const cartCount = user ? cartItems.reduce((s, i) => s + i.quantity, 0) : 0;
  const { title: seoTitle, description: seoDesc, keywords: seoKeywords } = generateProductSEO(product, shop);

  return (
    <div className="min-h-screen bg-white pb-36">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <meta name="keywords" content={seoKeywords} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        {imgSrc && <meta property="og:image" content={imgSrc} />}
        <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
        <meta property="product:price:amount" content={price} />
        <meta property="product:price:currency" content="HTG" />
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />
      </Helmet>

      {/* ── TOP BAR ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 -ml-1.5 rounded-full active:bg-slate-100 flex-shrink-0">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <span className="text-sm font-semibold text-slate-800 truncate flex-1">{product.name}</span>
        <button onClick={() => navigate('/Cart')} className="relative p-1.5 flex-shrink-0">
          <ShoppingCart className="w-5 h-5 text-slate-700" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>

      {/* ── IMAGE ── */}
      <div className="relative bg-slate-100 w-full" style={{ aspectRatio: '1 / 1', maxHeight: '70vw' }}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={product.image_alt || product.name}
            className="absolute inset-0 w-full h-full object-contain"
            loading="eager"
            fetchpriority="high"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-5xl">📦</div>
        )}

        {hasPromo && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
            -{Math.round((1 - product.promo_price / product.price) * 100)}%
          </div>
        )}

        {/* Thumbnails if multiple images */}
        {allImages.length > 1 && (
          <>
            <button
              onClick={() => setImgIndex(i => (i === 0 ? allImages.length - 1 : i - 1))}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/25 rounded-full text-white active:bg-black/50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setImgIndex(i => (i === allImages.length - 1 ? 0 : i + 1))}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/25 rounded-full text-white active:bg-black/50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allImages.map((_, i) => (
                <button key={i} onClick={() => setImgIndex(i)} className={`w-2 h-2 rounded-full transition-all ${i === imgIndex ? 'bg-orange-500 scale-125' : 'bg-white/60'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnail strip */}
      {allImages.length > 1 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar bg-white border-b border-slate-100">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setImgIndex(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${i === imgIndex ? 'border-orange-500' : 'border-slate-200 opacity-60'}`}
            >
              <img src={`${img}${img.includes('?') ? '&' : '?'}width=100&quality=60`} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* ── MAIN INFO ── */}
      <div className="px-4 py-4 space-y-3">
        {/* Price */}
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-orange-500">{price.toLocaleString()} HTG</span>
          {originalPrice && <span className="text-sm text-slate-400 line-through">{originalPrice.toLocaleString()} HTG</span>}
        </div>

        {/* Free delivery */}
        {price >= 3000 && (
          <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full border border-green-200">
            <Truck className="w-3.5 h-3.5" />
            Livraison gratuite
          </div>
        )}

        {/* Name */}
        <h1 className="text-base font-bold text-slate-900 leading-snug">{product.name}</h1>

        {/* Category */}
        {product.category && (
          <span className="inline-block bg-slate-100 text-slate-600 text-xs font-semibold px-3 py-1 rounded-full">
            {product.category}
          </span>
        )}

        {/* Shop */}
        {shop && (
          <button
            onClick={() => navigate(`/shop-view?slug=${shop.slug || ''}&id=${shop.id}`)}
            className="flex items-center gap-2 w-full bg-slate-50 rounded-xl px-3 py-2.5 active:bg-slate-100"
          >
            {shop.company_logo_url ? (
              <img src={shop.company_logo_url} alt={shop.company_name} className="w-8 h-8 rounded-full object-cover border border-slate-200 flex-shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                <Store className="w-4 h-4 text-orange-500" />
              </div>
            )}
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{shop.company_name}</p>
              {shop.region && <p className="text-[11px] text-slate-500">{shop.region}</p>}
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          </button>
        )}

        {/* Description */}
        {product.description && (
          <div className="border-t border-slate-100 pt-3">
            <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
          </div>
        )}
      </div>

      {/* ── RELATED (lazy) ── */}
      {showRelated && (
        <Suspense fallback={null}>
          <RelatedProducts product={product} shops={shops} />
        </Suspense>
      )}

      {/* ── STICKY ACTION BAR ── */}
      <StickyActionBar
        product={product}
        shop={shop}
        price={price}
        onAddToCart={handleAddToCart}
        onPayNow={handlePayNow}
        onWhatsApp={handleWhatsApp}
        loading={addToCartMutation.isPending}
      />
    </div>
  );
}