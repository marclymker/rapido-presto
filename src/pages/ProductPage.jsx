import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { firebaseApi } from '@/api/firebaseClient';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Send, Store, MapPin, Share2, MessageCircle, CreditCard } from 'lucide-react';
import { cacheProduct, getCachedProduct } from '@/lib/useProductCache';
import { Helmet } from 'react-helmet-async';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { trackMetaEvent } from '@/components/utils/metaTracking';
import { useAuth } from '@/components/auth/useAuth';
import { toast } from 'sonner';
import { getProductShareUrl, getProductCanonicalUrl } from '@/lib/productShareUrl';
import CompactProductCard from '@/components/home/CompactProductCard';
import ProductReviews from '@/components/product/ProductReviews';
import ProductFAQ from '@/components/product/ProductFAQ';

function saveScroll() {
  try { sessionStorage.setItem('marketplace_scroll', String(window.scrollY)); } catch (_) {}
}

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [imgIndex, setImgIndex] = useState(0);
  const [waMessage, setWaMessage] = useState('');
  const [waBoxOpen, setWaBoxOpen] = useState(false);
  const [relatedVisible, setRelatedVisible] = useState(12);

  useEffect(() => {
    window.history.pushState({ productPage: true }, '');
    const handlePop = () => { saveScroll(); navigate(-1); };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [navigate]);

  const rawCached = getCachedProduct(slug);
  const cached = rawCached?.product?.id === slug ? rawCached : null;

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      // Les nouveaux liens utilisent l'ID Firestore, qui est toujours unique.
      const byId = await firebaseApi.entities.Product.get(slug);
      if (byId) return [byId];
      // Compatibilité avec les anciens liens en slug : ne résoudre que si le
      // slug est réellement unique, sinon afficher une erreur plutôt que le
      // premier produit arbitraire.
      const bySlug = await firebaseApi.entities.Product.filter({ slug }, undefined, 10);
      return bySlug.length === 1 ? bySlug : [];
    },
    enabled: !!slug,
    initialData: cached?.product ? [cached.product] : undefined,
    staleTime: 2 * 60 * 1000,
  });

  const product = products[0];

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => firebaseApi.entities.Shop.filter({ is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  const shop = shops.find(s => s.id === product?.shop_id);

  const { data: sameShopProducts = [] } = useQuery({
    queryKey: ['sameShop', product?.shop_id],
    queryFn: () => firebaseApi.entities.Product.filter({ shop_id: product.shop_id, is_available: true }, '-created_date', 20),
    enabled: !!product?.shop_id,
  });

  const { data: similarProducts = [] } = useQuery({
    queryKey: ['similar', product?.category],
    queryFn: () => firebaseApi.entities.Product.filter({ category: product.category, is_available: true }, '-created_date', 30),
    enabled: !!product?.category,
  });

  // LOGIQUE DE PARTAGE (PREVIEW WHATSAPP)
  const getShareUrl = useCallback(() => {
    if (!product) return window.location.href;
    return getProductShareUrl({ ...product, shop_slug: shop?.slug }, window.location.origin);
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
    const price = applyClientMargin(product.promo_price || product.price, shop?.company_name || product.shop_name);
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

  const price = applyClientMargin(product.promo_price || product.price, shop?.company_name || product.shop_name);
  const originalPrice = product.promo_price ? applyClientMargin(product.price, shop?.company_name || product.shop_name) : null;
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const allImages = [product.image_url, ...(product.additional_images || [])].filter(Boolean);
  const currentImg = allImages[imgIndex] || product.image_url;
  const imgSrc = currentImg ? `${currentImg}${currentImg.includes('?') ? '&' : '?'}width=800&quality=80` : null;
  const canonicalUrl = getProductCanonicalUrl(product);
  const shareDescription = (product.description || `Découvrez ${product.name} sur Kairos.`).slice(0, 300);

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#f0f2f5' }}>
      <Helmet>
        <title>{product.name} | Kairos</title>
        <meta name="description" content={shareDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${product.name} | Kairos`} />
        <meta property="og:description" content={shareDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={imgSrc} />
        <meta property="og:image:alt" content={product.name} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} | Kairos`} />
        <meta name="twitter:description" content={shareDescription} />
        <meta name="twitter:image" content={imgSrc} />
      </Helmet>
      {/* Schema.org Product + AggregateRating (injecté côté client pour crawlers) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Product",
        "name": product.name,
        "description": product.description || product.name,
        "image": imgSrc,
        "brand": { "@type": "Brand", "name": shop?.company_name || "KAIROS" },
        "offers": {
          "@type": "Offer",
          "priceCurrency": "HTG",
          "price": price,
          "availability": "https://schema.org/InStock",
          "url": window.location.href
        }
      }) }} />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <button onClick={() => { saveScroll(); navigate(-1); }} className="p-1.5 -ml-1.5 rounded-full hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <span className="text-sm font-semibold text-gray-900 truncate flex-1">{product.name}</span>

        <button onClick={handleShare} className="p-1.5 rounded-full hover:bg-gray-100">
          <Share2 className="w-5 h-5 text-gray-700" />
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

        {/* Bouton Commander maintenant */}
        <button
          onClick={() => {
            if (!user) { firebaseApi.auth.redirectToLogin(window.location.pathname); return; }
            trackMetaEvent('InitiateCheckout', { content_ids: [product.id], content_type: 'product', content_name: product.name, value: price, currency: 'HTG' });
            window.location.href = `/QuickCheckout?product_id=${product.id}&quantity=1`;
          }}
          className="w-full mb-4 py-4 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
        >
          <CreditCard className="w-5 h-5" />
          Commander Maintenant
        </button>

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

      {/* Avis clients */}
      <ProductReviews productId={product.id} productName={product.name} />

      {/* FAQ dynamique IA */}
      <ProductFAQ product={product} shop={shop} />

      {/* Related Section */}
      {relatedProducts.length > 0 && (
        <div className="bg-white mt-2 px-4 py-4 shadow-sm">
          <h2 className="text-sm font-bold mb-4 text-gray-900">Articles similaires</h2>
          <div className="grid grid-cols-2 gap-3">
            {relatedProducts.slice(0, relatedVisible).map(p => (
                <CompactProductCard key={p.id} product={p} shop={shops.find(sh => sh.id === p.shop_id)} onClick={() => navigate(`/product/${p.id}`)} />
            ))}
          </div>
          {relatedVisible < relatedProducts.length && (
            <button onClick={() => setRelatedVisible(v => v + 12)} className="w-full mt-6 py-3 rounded-xl bg-gray-100 text-sm font-bold text-gray-700">Voir plus d'articles</button>
          )}
        </div>
      )}

      {/* Barre d'achat fixée en bas */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 px-4 py-3 safe-bottom shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="flex-1">
            <p className="text-xl font-black text-orange-500">{price.toLocaleString()} HTG</p>
            {originalPrice && <p className="text-xs text-gray-400 line-through">{originalPrice.toLocaleString()} HTG</p>}
          </div>
          <button
            onClick={() => {
              if (!user) {
                firebaseApi.auth.redirectToLogin(window.location.pathname);
                return;
              }
              trackMetaEvent('InitiateCheckout', {
                content_ids: [product.id],
                content_type: 'product',
                content_name: product.name,
                value: price,
                currency: 'HTG',
              });
              window.location.href = `/QuickCheckout?product_id=${product.id}&quantity=1`;
            }}
            className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all active:scale-95"
          >
            <CreditCard className="w-5 h-5" />
            Commander Maintenant
          </button>
        </div>
      </div>
    </div>
  );
}
