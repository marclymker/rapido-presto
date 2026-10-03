import React, { useState, useEffect, useMemo, Suspense, lazy, useCallback } from 'react';
import { firebase } from '@/api/firebaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Store, ShoppingBag, X, Bell, Bookmark, ChevronLeft, ChevronsRight } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { useAuth } from '@/components/auth/useAuth';
const ProductDetailModal = lazy(() => import('@/components/modals/ProductDetailModal'));
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import { useActivityTracker } from '@/components/tracking/useActivityTracker';
import { trackMetaEvent } from '@/components/utils/metaTracking';
import { createPageUrl } from '@/utils';
import { useGuestCart } from '@/components/cart/useGuestCart';
import { FB_TAXONOMY, findById } from '@/lib/fbTaxonomy';
import { getClientPrice } from '@/components/utils/priceCalculation';
import PullToRefresh from '@/components/mobile/PullToRefresh';

const MerchantProfileAlert = lazy(() => import('@/components/home/MerchantProfileAlert'));


// Tuile "Suggestions pour vous" : image, boutique + chevrons rouges, nom, prix, signet à droite
const ShopTile = React.memo(({ product, shop, saved, onSave, onClick }) => {
  const shopName = shop?.company_name || product.shop_name;
  const price = applyClientMargin(product.promo_price || product.price, shopName);
  const img = product.image_url ? `${product.image_url}${product.image_url.includes('?') ? '&' : '?'}width=400&quality=70&resize=cover` : null;
  return (
    <div className="cursor-pointer" onClick={onClick}>
      <div className="w-full bg-[#EFEFEF] overflow-hidden" style={{ aspectRatio: '10 / 11' }}>
        {img ? <img src={img} alt={product.image_alt || product.name} loading="lazy" className="w-full h-full object-cover" />
             : <div className="w-full h-full flex items-center justify-center text-neutral-300"><ShoppingBag className="w-8 h-8" /></div>}
      </div>
      <div className="flex items-start justify-between gap-1 pt-1.5">
        <div className="min-w-0 text-[13px] leading-[17px]">
          <p className="font-semibold text-[#262626] truncate">{shopName}<ChevronsRight className="inline w-3.5 h-3.5 text-red-500 -mt-0.5" /></p>
          <p className="text-[#8E8E8E] truncate">{product.name}</p>
          <p className="text-[#8E8E8E]">{price.toLocaleString()} HTG</p>
        </div>
        <button aria-label="Enregistrer" onClick={(e) => { e.stopPropagation(); onSave(product.id); }} className="p-0.5 shrink-0">
          <Bookmark className="w-[22px] h-[22px] text-[#262626]" fill={saved ? 'currentColor' : 'none'} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
});
ShopTile.displayName = 'ShopTile';

export default function Home() {
  const { user } = useAuth();
  const { addToGuestCart } = useGuestCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { trackProductView, trackCategoryView, trackSearch, trackAddToCart } = useActivityTracker();

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [selectedFbCatId, setSelectedFbCatId] = useState(null);
  const [fbLevel1Id, setFbLevel1Id] = useState(null);
  const [showCartReminder, setShowCartReminder] = useState(false);
  const [visibleCount, setVisibleCount] = useState(40);

  // Track PageView Meta Pixel
  useEffect(() => {
    trackMetaEvent('PageView');
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'Marketplace - Rapido Presto',
        page_location: window.location.href,
      });
    }
  }, []);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => firebase.entities.Product.filter({ is_available: true }, '-created_date', 1000),
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => firebase.entities.Shop.filter({ is_active: true }),
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => firebase.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id,
  });

  const cartCount = useMemo(() =>
    cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const cartTotal = useMemo(() =>
    cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
    [cartItems]
  );

  useEffect(() => {
    if (cartItems.length > 0) {
      const timer = setTimeout(() => setShowCartReminder(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [cartItems.length]);

  const addToCartMutation = useMutation({
    mutationFn: async ({ product, quantity }) => {
      const existing = cartItems.find(item => item.product_id === product.id);
      const price = getClientPrice(product);
      const shop = shops.find(s => s.id === product.shop_id);
      if (existing) {
        return firebase.entities.CartItem.update(existing.id, { quantity: existing.quantity + quantity });
      }
      return firebase.entities.CartItem.create({
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
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
      toast.success('Ajouté au panier !');
    },
  });

  const handleAddToCart = (product, quantity = 1) => {
    trackAddToCart(product);
    if (!user) {
      const shop = shops.find(s => s.id === product.shop_id);
      addToGuestCart({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        quantity,
        unit_price: getClientPrice(product),
        shop_id: shop?.id,
        shop_name: shop?.company_name,
        shop_region: shop?.region,
      });
      toast.success('Ajouté au panier');
      return;
    }
    addToCartMutation.mutate({ product, quantity });
  };

  // Algorithme de personnalisation basé sur le dernier produit visualisé
  // IDs de la branche FB sélectionnée (inclut tous les enfants)
  // Reset visible count when category changes
  useEffect(() => { setVisibleCount(40); }, [selectedFbCatId]);

  const selectedFbBranchIds = useMemo(() => {
    if (!selectedFbCatId) return null;
    const ids = new Set();
    function collect(nodes) {
      for (const n of nodes) {
        ids.add(n.id);
        if (n.children?.length) collect(n.children);
      }
    }
    function findAndCollect(nodes, targetId) {
      for (const n of nodes) {
        if (n.id === targetId) { collect([n]); return true; }
        if (n.children?.length && findAndCollect(n.children, targetId)) return true;
      }
      return false;
    }
    findAndCollect(FB_TAXONOMY, selectedFbCatId);
    return ids;
  }, [selectedFbCatId]);

  const filteredProducts = useMemo(() => {
    const base = allProducts.filter(p => {
      if (selectedFbBranchIds && !selectedFbBranchIds.has(p.fb_category_id)) return false;

      // Recherche hybride multi-mots : titre + description + nom boutique + tags SEO
      if (searchQuery.trim()) {
        const keywords = searchQuery.toLowerCase().trim().split(/\s+/).filter(w => w.length > 1);
        const title = (p.name || '').toLowerCase();
        const desc = (p.description || '').toLowerCase();
        const shopName = (p.shop_name || '').toLowerCase();
        const tags = (p.seo_tags || []).map(t => t.toLowerCase());

        return keywords.every(keyword =>
          title.includes(keyword) ||
          desc.includes(keyword) ||
          shopName.includes(keyword) ||
          tags.some(tag => tag.includes(keyword))
        );
      }

      return true;
    });

    // Si recherche ou catégorie active, pas de personnalisation
    if (searchQuery || selectedFbCatId) return base;

    // Récupérer le dernier produit visualisé
    let lastViewed = null;
    try {
      const raw = localStorage.getItem('last_viewed_product');
      if (raw) lastViewed = JSON.parse(raw);
    } catch (_) {}

    // Fonction de mélange aléatoire
    const shuffle = (arr) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };

    if (!lastViewed) return shuffle(base);

    const nameWords = (lastViewed.name || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const tags = lastViewed.seo_tags || [];
    const category = lastViewed.category || '';

    const scored = base
      .filter(p => p.id !== lastViewed.id)
      .map(p => {
        let score = 0;
        const pName = (p.name || '').toLowerCase();
        const pTags = p.seo_tags || [];
        nameWords.forEach(w => { if (pName.includes(w)) score += 2; });
        tags.forEach(t => { if (pTags.includes(t)) score += 3; });
        if (p.category === category) score += 1;
        return { ...p, _score: score };
      });

    const top10 = scored.filter(p => p._score > 0).sort((a, b) => b._score - a._score).slice(0, 10);
    const top10Ids = new Set(top10.map(p => p.id));
    const rest = shuffle(scored.filter(p => !top10Ids.has(p.id)));

    return [...top10, ...rest];
  }, [allProducts, searchQuery, selectedFbCatId]);

  const handleProductClick = useCallback((product) => {
    const shop = shops.find(s => s.id === product.shop_id);
    trackProductView(product, shop);
    try { localStorage.setItem('last_viewed_product', JSON.stringify({ id: product.id, name: product.name, seo_tags: product.seo_tags, category: product.category })); } catch (_) {}
    navigate(`/product/${product.slug || product.id}`);
  }, [shops, trackProductView, navigate]);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setVisibleCount(40); // reset pagination on new search
    if (value.length > 2) trackSearch(value);
  };

  const visibleProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);

  const shopsMap = useMemo(() => {
    const m = {};
    shops.forEach(s => { m[s.id] = s; });
    return m;
  }, [shops]);

  const isFiltered = !!(searchQuery || selectedFbCatId);

  // Group products by category for horizontal sections
  const categoryGroups = useMemo(() => {
    if (isFiltered) return {};
    const groups = {};
    allProducts.forEach(p => {
      if (!p.category) return;
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    // Sort each group by newest
    Object.keys(groups).forEach(k => {
      groups[k].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    });
    return groups;
  }, [allProducts, isFiltered]);

  const [savedIds, setSavedIds] = useState(() => { try { return JSON.parse(localStorage.getItem('saved_products') || '[]'); } catch (_) { return []; } });
  const [allShops, setAllShops] = useState(false);
  const toggleSave = useCallback((id) => {
    setSavedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try { localStorage.setItem('saved_products', JSON.stringify(next)); } catch (_) {}
      return next;
    });
  }, []);
  const featured = useMemo(() => allProducts.filter(p => p.image_url).slice(0, 3), [allProducts]);
  const collage = useMemo(() => {
    const imgs = [...cartItems.map(i => i.product_image), ...allProducts.filter(p => savedIds.includes(p.id)).map(p => p.image_url), ...allProducts.slice(0, 8).map(p => p.image_url)].filter(Boolean);
    return [...new Set(imgs)].slice(0, 4);
  }, [cartItems, allProducts, savedIds]);
  return (
    <div className="flex flex-col min-h-screen bg-white pb-20 text-[#262626]">
      <Helmet><meta name="google-adsense-account" content="ca-pub-2183521622591299" /></Helmet>
      <SEO
        title={selectedFbCatId ? `${findById(selectedFbCatId)?.name} - Shop Rapido Presto` : 'Shop - Tous les produits | Rapido Presto'}
        description="Découvrez les produits des boutiques haïtiennes sur Rapido Presto. Livraison rapide en Haïti."
        keywords={['marketplace haïti', 'boutique en ligne haïti', 'livraison rapide']}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />
      <header className="bg-white sticky top-0 z-40 border-b border-[#DBDBDB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="h-11 px-3 grid grid-cols-3 items-center">
          <button onClick={() => navigate(-1)} aria-label="Retour" className="justify-self-start"><ChevronLeft className="w-7 h-7" strokeWidth={1.75} /></button>
          <h1 className="text-[16px] font-semibold text-center">Rapido Shop</h1>
          <div className="justify-self-end flex items-center gap-4">
            <button onClick={() => navigate(createPageUrl('Orders'))} aria-label="Notifications"><Bell className="w-6 h-6" strokeWidth={1.75} /></button>
            <button onClick={() => navigate(createPageUrl('Cart'))} aria-label="Panier" className="flex items-center gap-1">
              <ShoppingBag className="w-6 h-6" strokeWidth={1.75} /><span className="text-[15px]">{cartCount}</span>
            </button>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={async () => { queryClient.invalidateQueries(['all-products']); queryClient.invalidateQueries(['shops']); }}>
        <main className="flex-1">
          <div className="px-4 pt-3">
            <div className="flex items-center bg-[#EFEFEF] rounded-lg px-3 py-2 gap-2">
              <Search className="w-4 h-4 text-[#8E8E8E]" />
              <input type="text" placeholder="Rechercher" value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} className="bg-transparent outline-none w-full text-sm" />
              {searchQuery && <button onClick={() => setSearchQuery('')}><X className="w-4 h-4 text-[#8E8E8E]" /></button>}
            </div>
          </div>
          <Suspense fallback={null}><MerchantProfileAlert user={user} /></Suspense>

          {!isFiltered && featured.length > 0 && (
            <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory no-scrollbar px-4 pt-3">
              {featured.map(p => (
                <button key={p.id} onClick={() => handleProductClick(p)} className="relative shrink-0 w-full snap-center overflow-hidden rounded-lg bg-[#EFEFEF]" style={{ height: 150 }}>
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                  <span className="absolute inset-x-0 bottom-0 p-3 text-left text-white bg-gradient-to-t from-black/60 to-transparent">
                    <span className="block text-[17px] font-semibold leading-tight">{p.name}</span>
                    <span className="block text-[12px] opacity-90">Sélectionné par Rapido Presto</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {!isFiltered && shops.length > 0 && (
            <section className="pt-5">
              <div className="flex items-center justify-between px-4 mb-3">
                <h2 className="text-[16px] font-semibold">Boutiques</h2>
                <button onClick={() => setAllShops(v => !v)} className="text-[14px]" style={{ color: '#3897F0' }}>{allShops ? 'Réduire' : 'Voir tout'}</button>
              </div>
              <div className={allShops ? 'flex flex-wrap gap-x-3 gap-y-4 px-4' : 'flex gap-3 overflow-x-auto no-scrollbar px-4'}>
                {shops.map(s => (
                  <button key={s.id} onClick={() => handleSearchChange(s.company_name || '')} className="shrink-0 w-[72px] flex flex-col items-center gap-1.5">
                    {s.company_logo_url
                      ? <img src={s.company_logo_url} alt={s.company_name} loading="lazy" className="w-16 h-16 rounded-full object-cover border border-[#DBDBDB]" />
                      : <span className="w-16 h-16 rounded-full bg-[#EFEFEF] flex items-center justify-center"><Store className="w-6 h-6 text-[#8E8E8E]" /></span>}
                    <span className="text-[12px] w-full truncate text-center">{s.company_name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="px-4 pt-5">
            <h2 className="text-[16px] font-semibold mb-3">{selectedFbCatId ? findById(selectedFbCatId)?.name : searchQuery ? 'Résultats' : 'Suggestions pour vous'}</h2>
            {!searchQuery && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-3">
                {FB_TAXONOMY.map(c => (
                  <button key={c.id} onClick={() => { const on = selectedFbCatId === c.id; setFbLevel1Id(on ? null : c.id); setSelectedFbCatId(on ? null : c.id); }}
                    className={`shrink-0 px-3 py-1.5 rounded-lg text-[13px] font-semibold ${selectedFbCatId === c.id ? 'bg-[#262626] text-white' : 'bg-[#EFEFEF]'}`}>{c.name}</button>
                ))}
              </div>
            )}
            {isLoading ? (
              <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#262626]" /></div>
            ) : visibleProducts.length === 0 ? (
              <p className="text-center text-[#8E8E8E] py-16 text-sm">Aucun produit trouvé</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-5">
                {!isFiltered && collage.length > 0 && (
                  <div className="cursor-pointer" onClick={() => navigate(createPageUrl('Cart'))}>
                    <div className="grid grid-cols-2 gap-[2px] overflow-hidden bg-[#EFEFEF]" style={{ aspectRatio: '10 / 11' }}>
                      {[0, 1, 2, 3].map(i => collage[i] ? <img key={i} src={collage[i]} alt="" className="w-full h-full object-cover" loading="lazy" /> : <span key={i} />)}
                    </div>
                    <div className="pt-1.5 text-[13px] leading-[17px]">
                      <p className="font-semibold">Continuer vos achats</p>
                      <p className="text-[#8E8E8E]">Panier, enregistrés et vus récemment</p>
                    </div>
                  </div>
                )}
                {visibleProducts.map(p => (
                  <ShopTile key={p.id} product={p} shop={shopsMap[p.shop_id]} saved={savedIds.includes(p.id)} onSave={toggleSave} onClick={() => handleProductClick(p)} />
                ))}
              </div>
            )}
            {visibleCount < filteredProducts.length && (
              <div className="flex justify-center my-5"><button onClick={() => setVisibleCount(c => c + 60)} className="px-6 py-2 rounded-lg bg-[#EFEFEF] text-sm font-semibold">Voir plus</button></div>
            )}
          </section>
        </main>
      </PullToRefresh>
    </div>
  );
}
