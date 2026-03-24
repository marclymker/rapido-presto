import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Truck, Store, MapPin } from 'lucide-react';
import { applyClientMargin, getClientPrice } from '@/components/utils/priceCalculation';
import { useAuth } from '@/components/auth/useAuth';
import { useGuestCart } from '@/components/cart/useGuestCart';
import { trackMetaEvent } from '@/components/utils/metaTracking';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';
import StickyActionBar from '@/components/product/StickyActionBar';
import RelatedProducts from '@/components/product/RelatedProducts';

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToGuestCart } = useGuestCart();
  const queryClient = useQueryClient();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);

  // Fetch product by slug or id
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['product-page', slug],
    queryFn: async () => {
      const bySlug = await base44.entities.Product.filter({ slug });
      if (bySlug.length > 0) return bySlug;
      return base44.entities.Product.filter({ id: slug });
    },
    staleTime: 5 * 60 * 1000,
  });

  const product = products[0];

  // Fetch shop
  const { data: shops = [] } = useQuery({
    queryKey: ['shop', product?.shop_id],
    queryFn: () => base44.entities.Shop.filter({ id: product.shop_id }),
    enabled: !!product?.shop_id,
    staleTime: 10 * 60 * 1000,
  });
  const shop = shops[0];

  // Cart items
  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  // All products for related
  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    staleTime: 10 * 60 * 1000,
  });

  // Track ViewContent on load
  useEffect(() => {
    if (!product) return;
    const price = getClientPrice(product);
    trackMetaEvent('ViewContent', {
      content_ids: [product.id],
      content_type: 'product',
      content_name: product.name,
      value: price,
      currency: 'HTG',
    });
    if (window.gtag) {
      window.gtag('event', 'view_item', {
        items: [{ item_id: product.id, item_name: product.name, price }],
      });
    }
  }, [product?.id]);

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      const price = getClientPrice(product);
      const existing = cartItems.find(i => i.product_id === product.id);
      if (existing) {
        return base44.entities.CartItem.update(existing.id, { quantity: existing.quantity + 1 });
      }
      return base44.entities.CartItem.create({
        user_id: user.id,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        quantity: 1,
        unit_price: price,
        shop_id: product.shop_id,
        shop_name: shop?.company_name || '',
        shop_region: shop?.region || '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
      toast.success('Ajouté au panier !');
    },
  });

  const handleAddToCart = () => {
    const price = getClientPrice(product);
    trackMetaEvent('AddToCart', {
      content_ids: [product.id],
      content_name: product.name,
      value: price,
      currency: 'HTG',
    });
    if (!user) {
      addToGuestCart({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        quantity: 1,
        unit_price: price,
        shop_id: product.shop_id,
        shop_name: shop?.company_name || '',
        shop_region: shop?.region || '',
      });
      toast.success('Ajouté au panier');
      return;
    }
    addToCartMutation.mutate();
  };

  const handleCheckout = async () => {
    const price = getClientPrice(product);
    trackMetaEvent('InitiateCheckout', {
      content_ids: [product.id],
      content_name: product.name,
      value: price,
      currency: 'HTG',
    });
    await handleAddToCart();
    navigate(createPageUrl('Cart'));
  };

  const handleWhatsApp = () => {
    trackMetaEvent('Contact', { content_name: product.name });
    const productUrl = `${window.location.origin}/product/${slug}`;
    const message = `Je suis intéressé par : ${product.name}\n${productUrl}`;
    window.open(`https://wa.me/50948690366?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Produit introuvable</p>
        <button onClick={() => navigate('/')} className="text-orange-500 font-bold">Retour à l'accueil</button>
      </div>
    );
  }

  const price = getClientPrice(product);
  const originalPrice = product.promo_price ? applyClientMargin(product.price) : null;
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const promoPercent = hasPromo ? Math.round((1 - product.promo_price / product.price) * 100) : 0;
  const allImages = [product.image_url, ...(product.additional_images || [])].filter(Boolean);

  const pageTitle = `${product.name} - ${price.toLocaleString()} HTG | Rapido Presto Haïti`;
  const pageDesc = product.description
    ? `${product.description.slice(0, 150)} — Livraison rapide en Haïti. Achetez ${product.name} en ligne sur Rapido Presto.`
    : `Achetez ${product.name} à ${price.toLocaleString()} HTG. Livraison rapide en Haïti sur Rapido Presto.`;
  const pageImage = product.image_url;
  const pageUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/product/${slug}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <link rel="canonical" href={pageUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        {pageImage && <meta property="og:image" content={pageImage} />}
        <meta property="og:url" content={pageUrl} />
        <meta property="og:site_name" content="Rapido Presto" />
        <meta property="product:price:amount" content={price} />
        <meta property="product:price:currency" content="HTG" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        {pageImage && <meta name="twitter:image" content={pageImage} />}
      </Helmet>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-1 -ml-1">
          <ArrowLeft size={22} className="text-slate-700" />
        </button>
        <p className="text-sm font-semibold text-slate-800 truncate flex-1">{product.name}</p>
      </header>

      {/* Image principale */}
      <div className="relative bg-white" style={{ aspectRatio: '1/1', maxHeight: '60vw' }}>
        {hasPromo && (
          <span className="absolute top-2 left-2 z-10 bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded">
            -{promoPercent}%
          </span>
        )}
        {allImages[imageIndex] ? (
          <img
            src={`${allImages[imageIndex]}${allImages[imageIndex]?.includes('?') ? '&' : '?'}w=600&q=75`}
            alt={product.image_alt || product.name}
            className={`w-full h-full object-contain transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            loading="eager"
            decoding="async"
            onLoad={() => setImgLoaded(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">📦</div>
        )}
        {!imgLoaded && allImages[imageIndex] && (
          <div className="absolute inset-0 bg-slate-100 animate-pulse" />
        )}
      </div>

      {/* Miniatures si plusieurs images */}
      {allImages.length > 1 && (
        <div className="flex gap-2 px-4 py-2 overflow-x-auto no-scrollbar bg-white">
          {allImages.map((img, i) => (
            <button
              key={i}
              onClick={() => { setImageIndex(i); setImgLoaded(false); }}
              className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${imageIndex === i ? 'border-orange-500' : 'border-transparent'}`}
            >
              <img src={`${img}${img?.includes('?') ? '&' : '?'}w=100&q=60`} alt="" className="w-full h-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* Contenu principal */}
      <div className="bg-white mt-2 px-4 pt-4 pb-2">
        {/* Prix en premier */}
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-black text-orange-500">{price.toLocaleString()} HTG</span>
          {originalPrice && (
            <span className="text-sm text-slate-400 line-through">{originalPrice.toLocaleString()} HTG</span>
          )}
        </div>

        {price >= 3000 && (
          <div className="flex items-center gap-1 text-green-600 text-xs font-bold mb-2">
            <Truck size={13} /> Livraison gratuite
          </div>
        )}

        <h1 className="text-base font-bold text-slate-900 leading-snug mb-2">{product.name}</h1>

        {product.description && (
          <p className="text-sm text-slate-600 leading-relaxed mb-3">{product.description}</p>
        )}

        {/* Boutique */}
        {shop && (
          <button
            onClick={() => navigate(`/shop-view?slug=${shop.slug || ''}&id=${shop.id}`)}
            className="flex items-center gap-2 w-full p-2.5 bg-slate-50 rounded-xl border border-slate-100 mb-3 active:bg-slate-100 transition-colors"
          >
            <div className="w-9 h-9 rounded-full overflow-hidden bg-orange-100 flex-shrink-0 flex items-center justify-center">
              {shop.company_logo_url ? (
                <img src={shop.company_logo_url} className="w-full h-full object-cover" alt={shop.company_name} loading="lazy" />
              ) : (
                <Store size={16} className="text-orange-500" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold text-slate-800">{shop.company_name}</p>
              <p className="text-xs text-slate-500 flex items-center gap-0.5"><MapPin size={10} />{shop.region || 'Haïti'}</p>
            </div>
          </button>
        )}
      </div>

      {/* Produits similaires (lazy) */}
      <RelatedProducts currentProduct={product} allProducts={allProducts} />

      {/* Sticky bar */}
      <StickyActionBar
        onAddToCart={handleAddToCart}
        onWhatsApp={handleWhatsApp}
        onCheckout={handleCheckout}
        price={price}
        loading={addToCartMutation.isPending}
      />
    </div>
  );
}