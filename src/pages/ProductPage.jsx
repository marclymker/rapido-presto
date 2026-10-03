import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { firebase } from '@/api/firebaseClient';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronDown, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import { cacheProduct, getCachedProduct } from '@/lib/useProductCache';
import { Helmet } from 'react-helmet-async';
import { applyClientMargin, getClientPrice } from '@/components/utils/priceCalculation';
import { trackMetaEvent } from '@/components/utils/metaTracking';
import { useAuth } from '@/components/auth/useAuth';
import { toast } from 'sonner';
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
  const queryClient = useQueryClient();
  const [imgIndex, setImgIndex] = useState(0);
  const [waMessage, setWaMessage] = useState('');
  const [waBoxOpen, setWaBoxOpen] = useState(false);
  const [relatedVisible, setRelatedVisible] = useState(12);
  const [saved, setSaved] = useState(false);
  const [selColor, setSelColor] = useState(0);
  const [selSize, setSelSize] = useState(0);
  const [ordering, setOrdering] = useState(false);

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
      const bySlug = await firebase.entities.Product.filter({ slug });
      if (bySlug.length > 0) return bySlug;
      return firebase.entities.Product.filter({ id: slug });
    },
    enabled: !!slug,
    initialData: cached?.product ? [cached.product] : undefined,
    staleTime: 2 * 60 * 1000,
  });

  const product = products[0];

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => firebase.entities.Shop.filter({ is_active: true }),
    staleTime: 10 * 60 * 1000,
  });

  const shop = shops.find(s => s.id === product?.shop_id);

  const { data: sameShopProducts = [] } = useQuery({
    queryKey: ['sameShop', product?.shop_id],
    queryFn: () => firebase.entities.Product.filter({ shop_id: product.shop_id, is_available: true }, '-created_date', 20),
    enabled: !!product?.shop_id,
  });

  const { data: similarProducts = [] } = useQuery({
    queryKey: ['similar', product?.category],
    queryFn: () => firebase.entities.Product.filter({ category: product.category, is_available: true }, '-created_date', 30),
    enabled: !!product?.category,
  });

  // LOGIQUE DE PARTAGE (PREVIEW WHATSAPP)
  const getShareUrl = useCallback(() => {
    if (!product) return window.location.href;
    return `${window.location.origin}/product/${encodeURIComponent(product.slug || product.id)}`;
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

  useEffect(() => {
    if (!product) return;
    try { setSaved(JSON.parse(localStorage.getItem('saved_products') || '[]').includes(product.id)); } catch (_) {}
  }, [product]);

  if (isLoading) return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-10 h-10 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (!product) return <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4"><p className="text-gray-500">Produit introuvable</p><button onClick={() => navigate(-1)} className="text-blue-600 font-semibold">← Retour</button></div>;

  const price = applyClientMargin(product.promo_price || product.price, shop?.company_name || product.shop_name);
  const originalPrice = product.promo_price ? applyClientMargin(product.price, shop?.company_name || product.shop_name) : null;
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const allImages = [product.image_url, ...(product.additional_images || [])].filter(Boolean);
  const currentImg = allImages[imgIndex] || product.image_url;
  const imgSrc = currentImg ? `${currentImg}${currentImg.includes('?') ? '&' : '?'}width=800&quality=80` : null;

  const toggleSave = () => {
    try {
      const list = JSON.parse(localStorage.getItem('saved_products') || '[]');
      const next = list.includes(product.id) ? list.filter(x => x !== product.id) : [...list, product.id];
      localStorage.setItem('saved_products', JSON.stringify(next));
      setSaved(next.includes(product.id));
    } catch (_) {}
  };
  const co = product.customization_options || {};
  const colors = co.colors || [];
  const sizes = co.sizes || [];
  const color = colors[selColor];
  const size = sizes[selSize];
  const extra = (color?.additional_price || 0) + (size?.additional_price || 0);
  const shopName = shop?.company_name || product.shop_name;
  const soldOut = product.is_available === false;

  // 3 clics : ouvrir le produit -> Commander -> Passer la commande
  const orderNow = async () => {
    if (!user) { firebase.auth.redirectToLogin(window.location.pathname); return; }
    setOrdering(true);
    try {
      const items = await firebase.entities.CartItem.filter({ user_id: user.id });
      const same = items.find(i => i.product_id === product.id && i.customization?.color?.name === color?.name && i.customization?.size?.name === size?.name);
      if (!same) {
        await firebase.entities.CartItem.create({
          user_id: user.id, product_id: product.id, product_name: product.name, product_image: product.image_url,
          quantity: 1, unit_price: getClientPrice(product), shop_id: product.shop_id,
          shop_name: shopName || '', shop_region: shop?.region || '',
          customization: { ...(color && { color }), ...(size && { size }) }, total_customization_price: extra,
        });
        queryClient.invalidateQueries({ queryKey: ['cart', user.id] });
      }
      trackMetaEvent('InitiateCheckout', { content_ids: [product.id], content_type: 'product', content_name: product.name, value: price + extra, currency: 'HTG' });
      navigate('/Cart?step=checkout');
    } catch (e) {
      toast.error("Impossible de lancer la commande. Réessayez.");
      setOrdering(false);
    }
  };
  const Select = ({ label, options, value, onChange }) => (
    <label className="relative block border-t border-b border-[#DBDBDB] py-2">
      <span className="block text-[11px] text-[#8E8E8E]">{label}</span>
      <select value={value} onChange={e => onChange(Number(e.target.value))} className="w-full appearance-none bg-transparent outline-none text-[14px] text-[#262626] pr-6">
        {options.map((o, i) => <option key={i} value={i}>{o.name}</option>)}
      </select>
      <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E8E] pointer-events-none" />
    </label>
  );

  return (
    <div className="min-h-screen pb-24 bg-white text-[#262626]">
      <Helmet>
        <title>{product.name} | Rapido Presto</title>
        <meta property="og:image" content={imgSrc} />
      </Helmet>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "Product", "name": product.name,
        "description": product.description || product.name, "image": imgSrc,
        "brand": { "@type": "Brand", "name": shopName || "RAPIDOPRESTO" },
        "offers": { "@type": "Offer", "priceCurrency": "HTG", "price": price + extra, "availability": soldOut ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", "url": window.location.href }
      }) }} />

      <div className="relative bg-[#EFEFEF]">
        <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar" style={{ aspectRatio: '4 / 5' }}
          onScroll={(e) => setImgIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}>
          {allImages.map((u, i) => (
            <img key={i} src={`${u}${u.includes('?') ? '&' : '?'}width=800&quality=80`} alt={`${product.name} ${i + 1}`} className="w-full h-full object-cover shrink-0 snap-center" />
          ))}
        </div>
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-3 text-white" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 10px)' }}>
          <button onClick={() => { saveScroll(); navigate(-1); }} aria-label="Retour"><ChevronLeft className="w-8 h-8 drop-shadow" strokeWidth={1.75} /></button>
          <button onClick={handleShare} aria-label="Plus"><MoreHorizontal className="w-6 h-6 drop-shadow" /></button>
        </div>
        {allImages.length > 1 && (
          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {allImages.map((_, i) => <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === imgIndex ? 'bg-[#262626]' : 'bg-white/80'}`} />)}
          </div>
        )}
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-[18px] font-semibold leading-snug">{product.name}</h1>
          <div className="flex items-center gap-4 pt-1 shrink-0">
            <button onClick={handleShare} aria-label="Partager"><Send className="w-6 h-6" strokeWidth={1.75} /></button>
            <button onClick={toggleSave} aria-label="Enregistrer"><Bookmark className="w-6 h-6" strokeWidth={1.75} fill={saved ? 'currentColor' : 'none'} /></button>
          </div>
        </div>
        <p className="text-[12px] text-[#8E8E8E] mt-0.5">
          De{' '}
          {shop ? <button onClick={() => navigate(`/ShopView?slug=${shop.slug || ''}&id=${shop.id}`)} className="font-semibold text-[#262626]">{shopName}</button> : <span className="font-semibold text-[#262626]">{shopName}</span>}
          {product.delivery_time && <> · Livraison {product.delivery_time}</>}
        </p>
        <p className="text-[16px] mt-1" style={{ color: '#3897F0' }}>
          {(price + extra).toLocaleString()} HTG
          {originalPrice && <span className="ml-2 text-[13px] text-[#8E8E8E] line-through">{(originalPrice + extra).toLocaleString()}</span>}
        </p>

        {(colors.length > 0 || sizes.length > 0) && (
          <div className="grid grid-cols-2 gap-4 mt-4">
            {colors.length > 0 && <Select label="Couleur" options={colors} value={selColor} onChange={setSelColor} />}
            {sizes.length > 0 && <Select label="Taille" options={sizes} value={selSize} onChange={setSelSize} />}
          </div>
        )}

        <button onClick={orderNow} disabled={ordering || soldOut}
          className="w-full mt-4 h-11 rounded-md text-white text-[14px] font-semibold disabled:opacity-50 active:opacity-80" style={{ backgroundColor: '#3897F0' }}>
          {soldOut ? 'Épuisé' : ordering ? 'Un instant...' : 'Commander sur Rapido'}
        </button>
        <button onClick={handleSendWhatsApp} className="w-full mt-3 text-[13px] font-semibold" style={{ color: '#3897F0' }}>Contacter le vendeur sur WhatsApp</button>

        {product.description && <p className="text-[14px] text-[#262626] mt-4 leading-relaxed whitespace-pre-line">{product.description}</p>}
      </div>

      <ProductReviews productId={product.id} productName={product.name} />
      <ProductFAQ product={product} shop={shop} />

      {relatedProducts.length > 0 && (
        <div className="px-4 mt-6 border-t border-[#DBDBDB] pt-4">
          <h2 className="text-[16px] font-semibold mb-3">Plus de produits</h2>
          <div className="grid grid-cols-2 gap-x-2.5">
            {relatedProducts.slice(0, relatedVisible).map(p => (
              <CompactProductCard key={p.id} product={p} shop={shops.find(sh => sh.id === p.shop_id)} onClick={() => navigate(`/product/${p.slug || p.id}`)} />
            ))}
          </div>
          {relatedVisible < relatedProducts.length && (
            <button onClick={() => setRelatedVisible(v => v + 12)} className="w-full my-3 py-2.5 rounded-lg bg-[#EFEFEF] text-sm font-semibold">Voir plus</button>
          )}
        </div>
      )}
    </div>
  );
}
