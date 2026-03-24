import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ShoppingCart, MessageCircle, ChevronLeft, ChevronRight, Truck } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { applyClientMargin, getClientPrice } from '@/components/utils/priceCalculation';
import { trackMetaEvent } from '@/components/utils/metaTracking';
import { useAuth } from '@/components/auth/useAuth';
import { useGuestCart } from '@/components/cart/useGuestCart';
import { toast } from 'sonner';
import CompactProductCard from '@/components/home/CompactProductCard';

// Save and restore scroll position for marketplace back-navigation
function saveScroll() {
  try { sessionStorage.setItem('marketplace_scroll', String(window.scrollY)); } catch (_) {}
}

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToGuestCart } = useGuestCart();
  const queryClient = useQueryClient();
  const [qty, setQty] = useState(1);
  const [imgIndex, setImgIndex] = useState(0);
  const [showRelated, setShowRelated] = useState(false);

  // Push history entry so Android back button works correctly
  useEffect(() => {
    window.history.pushState({ productPage: true }, '');
    const handlePop = () => navigate(-1);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Fetch product by slug or id
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const bySlug = await base44.entities.Product.filter({ slug });
      if (bySlug.length > 0) return bySlug;
      return base44.entities.Product.filter({ id: slug });
    },
    enabled: !!slug,
  });

  const product = products[0];

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  const shop = shops.find(s => s.id === product?.shop_id);

  // Related products
  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['related', product?.category, product?.id],
    queryFn: () => base44.entities.Product.filter({ category: product.category, is_available: true }, '-created_date', 20),
    enabled: showRelated && !!product?.category,
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  // Track ViewContent once product loads
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
    // Show related after 1.5s
    const t = setTimeout(() => setShowRelated(true), 1500);
    return () => clearTimeout(t);
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
    onSuccess: () => {
      queryClient.invalidateQueries(['cart', user?.id]);
      toast.success('Ajouté au panier !');
    },
  });

  const handleAddToCart = useCallback(() => {
    trackMetaEvent('AddToCart', {
      content_ids: [product.id],
      content_type: 'product',
      content_name: product.name,
      value: getClientPrice(product) * qty,
      currency: 'HTG',
    });
    if (!user) {
      addToGuestCart({ product_id: product.id, product_name: product.name, product_image: product.image_url, quantity: qty, unit_price: getClientPrice(product), shop_id: product.shop_id, shop_name: shop?.company_name, shop_region: shop?.region });
      toast.success('Ajouté au panier');
      return;
    }
    addToCartMutation.mutate({ quantity: qty });
  }, [product, qty, user, shop]);

  const handlePayNow = useCallback(() => {
    trackMetaEvent('InitiateCheckout', {
      content_ids: [product.id],
      content_name: product.name,
      value: getClientPrice(product) * qty,
      currency: 'HTG',
    });
    handleAddToCart();
    setTimeout(() => navigate('/Cart'), 300);
  }, [product, qty, handleAddToCart]);

  const handleWhatsApp = useCallback(() => {
    trackMetaEvent('Contact', { content_name: product.name });
    const productUrl = `${window.location.href}`;
    const msg = `Bonjour, je suis intéressé par : ${product.name}\n${productUrl}`;
    window.open(`https://wa.me/50948690366?text=${encodeURIComponent(msg)}`, '_blank');
  }, [product]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Produit introuvable</p>
        <button onClick={() => navigate(-1)} className="text-orange-500 font-semibold">← Retour</button>
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
    ? `${product.description.slice(0, 150)} - Prix: ${price.toLocaleString()} HTG. Livraison rapide en Haïti.`
    : `${product.name} disponible en Haïti. Prix: ${price.toLocaleString()} HTG. Commandez maintenant sur Rapido Presto.`;

  const handleBack = () => {
    saveScroll();
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-white" style={{ paddingBottom: '80px' }}>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        {imgSrc && <meta property="og:image" content={imgSrc} />}
        <meta property="og:url" content={window.location.href} />
        <meta property="product:price:amount" content={price} />
        <meta property="product:price:currency" content="HTG" />
        <link rel="canonical" href={window.location.href} />
      </Helmet>

      {/* Back button */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm px-4 py-3 flex items-center gap-3 border-b border-slate-100">
        <button onClick={handleBack} className="p-1.5 -ml-1.5 rounded-full hover:bg-slate-100">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <span className="text-sm font-semibold text-slate-700 truncate flex-1">{product.name}</span>
        <button onClick={() => navigate('/Cart')} className="relative p-1.5">
          <ShoppingCart className="w-5 h-5 text-slate-700" />
          {cartItems.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {cartItems.reduce((s, i) => s + i.quantity, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Image */}
      <div className="relative bg-slate-100 w-full" style={{ aspectRatio: '1/1' }}>
        {imgSrc ? (
          <img src={imgSrc} alt={product.image_alt || product.name} className="w-full h-full object-contain" loading="eager" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-6xl">📦</div>
        )}
        {hasPromo && (
          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            -{Math.round((1 - product.promo_price / product.price) * 100)}%
          </div>
        )}
        {allImages.length > 1 && (
          <>
            <button onClick={() => setImgIndex(i => (i === 0 ? allImages.length - 1 : i - 1))} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setImgIndex(i => (i === allImages.length - 1 ? 0 : i + 1))} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 rounded-full text-white">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {allImages.map((_, i) => (
                <button key={i} onClick={() => setImgIndex(i)} className={`w-1.5 h-1.5 rounded-full ${i === imgIndex ? 'bg-orange-500' : 'bg-white/60'}`} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main info */}
      <div className="px-4 py-4">
        {/* Price first */}
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-2xl font-black text-orange-500">{price.toLocaleString()} HTG</span>
          {originalPrice && <span className="text-sm text-slate-400 line-through">{originalPrice.toLocaleString()} HTG</span>}
        </div>

        {/* Free delivery badge */}
        {price >= 3000 && (
          <div className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-bold px-3 py-1 rounded-full border border-green-200 mb-2">
            <Truck className="w-3 h-3" />
            Livraison gratuite
          </div>
        )}

        {/* Inline action buttons — compact, just under price */}
        <div className="flex items-center gap-1.5 mb-3">
          <button
            onClick={handleWhatsApp}
            className="flex items-center gap-1 bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/30 font-semibold rounded-lg px-2.5 py-1.5 text-xs flex-shrink-0"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WA</span>
          </button>
          <button
            onClick={() => { handleAddToCart(); }}
            className="flex-1 bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-lg px-3 py-1.5 text-xs"
          >
            + Panier
          </button>
          <button
            onClick={handlePayNow}
            className="flex-1 bg-orange-500 text-white font-bold rounded-lg px-3 py-1.5 text-xs shadow-sm shadow-orange-200"
          >
            Payer maintenant
          </button>
        </div>

        <h1 className="text-lg font-bold text-slate-900 leading-snug mb-2">{product.name}</h1>

        {shop && (
          <button onClick={() => navigate(`/shop-view?slug=${shop.slug || ''}&id=${shop.id}`)} className="flex items-center gap-2 mb-3">
            {shop.company_logo_url && <img src={shop.company_logo_url} alt={shop.company_name} className="w-7 h-7 rounded-full object-cover border border-slate-200" />}
            <span className="text-sm text-orange-500 font-semibold">{shop.company_name}</span>
          </button>
        )}

        {product.description && (
          <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">{product.description}</p>
        )}

        {/* Qty picker + add to cart */}
        <div className="flex items-center gap-3 mt-4">
          <span className="text-sm font-semibold text-slate-700">Quantité :</span>
          <div className="flex items-center bg-slate-100 rounded-full">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-8 h-8 flex items-center justify-center text-slate-700 font-bold text-lg">−</button>
            <span className="w-8 text-center text-sm font-bold">{qty}</span>
            <button onClick={() => setQty(q => q + 1)} className="w-8 h-8 flex items-center justify-center text-slate-700 font-bold text-lg">+</button>
          </div>
          <button
            onClick={handleAddToCart}
            className="flex-1 bg-slate-800 text-white text-sm font-bold rounded-full py-2 px-4"
          >
            Ajouter au panier
          </button>
        </div>
      </div>

      {/* Related products - lazy */}
      {showRelated && relatedProducts.length > 1 && (
        <div className="border-t border-slate-100 pt-4 mt-2">
          <h2 className="text-sm font-bold text-slate-800 px-4 mb-3">Produits similaires</h2>
          <div className="flex gap-2 overflow-x-auto px-4 pb-2 no-scrollbar" style={{ WebkitOverflowScrolling: 'touch' }}>
            {relatedProducts.filter(p => p.id !== product.id).slice(0, 10).map(p => {
              const s = shops.find(sh => sh.id === p.shop_id);
              return (
                <div key={p.id} style={{ minWidth: '120px', maxWidth: '120px' }}>
                  <CompactProductCard product={p} shop={s} onClick={() => navigate(`/product/${p.slug || p.id}`)} />
                </div>
              );
            })}
          </div>
        </div>
      )}


    </div>
  );
}