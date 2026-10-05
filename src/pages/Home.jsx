import React, { useState, useEffect, useMemo, lazy, useCallback } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ShoppingCart, X } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '@/components/auth/useAuth';
const ProductDetailModal = lazy(() => import('@/components/modals/ProductDetailModal'));
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import { useActivityTracker } from '@/components/tracking/useActivityTracker';
import { trackMetaEvent } from '@/components/utils/metaTracking';
import { createPageUrl } from '@/utils';
import { useGuestCart } from '@/components/cart/useGuestCart';
import { FB_TAXONOMY, findById } from '@/lib/fbTaxonomy';
import CompactProductCard from '@/components/home/CompactProductCard';
import CategoryRow from '@/components/home/CategoryRow';
import { getClientPrice } from '@/components/utils/priceCalculation';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { MARKETPLACE_SPACES, getMarketplaceSpace } from '@/lib/marketplaceSpaces';

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
  const [visibleCount, setVisibleCount] = useState(40);

  // Track PageView Meta Pixel
  useEffect(() => {
    trackMetaEvent('PageView');
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'Marketplace - Kairos',
        page_location: window.location.href,
      });
    }
  }, []);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => firebaseApi.entities.Product.filter({ is_available: true }, '-created_date', 60),
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => firebaseApi.entities.Shop.filter({ is_active: true }, '-created_date', 60),
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => firebaseApi.entities.CartItem.filter({ user_id: user?.id }),
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

  const addToCartMutation = useMutation({
    mutationFn: async ({ product, quantity }) => {
      const existing = cartItems.find(item => item.product_id === product.id);
      const price = getClientPrice(product);
      const shop = shops.find(s => s.id === product.shop_id);
      if (existing) {
        return firebaseApi.entities.CartItem.update(existing.id, { quantity: existing.quantity + quantity });
      }
      return firebaseApi.entities.CartItem.create({
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
      if (selectedCategory && getMarketplaceSpace(p) !== selectedCategory) return false;
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
    if (searchQuery || selectedCategory || selectedFbCatId) return base;

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
  }, [allProducts, searchQuery, selectedCategory, selectedFbCatId]);

  const handleProductClick = useCallback((product) => {
    const shop = shops.find(s => s.id === product.shop_id);
    trackProductView(product, shop);
    try { localStorage.setItem('last_viewed_product', JSON.stringify({ id: product.id, name: product.name, seo_tags: product.seo_tags, category: product.category })); } catch (_) {}
    navigate(`/product/${product.id}`);
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

  const isFiltered = !!(searchQuery || selectedCategory || selectedFbCatId);

  // Group products by category for horizontal sections
  const categoryGroups = useMemo(() => {
    if (isFiltered) return {};
    const groups = {};
    allProducts.forEach(p => {
      const space = getMarketplaceSpace(p);
      if (!groups[space]) groups[space] = [];
      groups[space].push(p);
    });
    // Sort each group by newest
    Object.keys(groups).forEach(k => {
      groups[k].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    });
    return Object.fromEntries(MARKETPLACE_SPACES.map(({ id }) => [id, groups[id] || []]).filter(([, products]) => products.length));
  }, [allProducts, isFiltered]);

  return (
    <div className="rp-marketplace rp-dark-shop flex flex-col min-h-screen pb-20">


      <Helmet>
        <meta name="google-adsense-account" content="ca-pub-2183521622591299" />
      </Helmet>

      <SEO
        title={selectedFbCatId ? `${findById(selectedFbCatId)?.name} - Marketplace Kairos` : 'Marketplace - Tous les produits | Kairos'}
        description={selectedFbCatId ? `Découvrez tous nos produits ${findById(selectedFbCatId)?.name} disponibles en Haïti - Marketplace, réservations et billetterie avec Kairos` : 'Découvrez tous les produits disponibles sur Kairos - Mode, Mariage, Fleurs, Electronics et plus. Marketplace, réservations et billetterie en Haïti.'}
        keywords={['marketplace haïti', 'boutique en ligne haïti', 'marketplace, réservations et billetterie', selectedFbCatId ? findById(selectedFbCatId)?.name : 'produits'].filter(Boolean)}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />

      {/* Header */}
      <header className="rp-marketplace-header rp-shop-header sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex flex-col leading-tight cursor-pointer" onClick={() => window.location.reload()}>
            <h1 className="text-xl font-bold tracking-tight leading-none m-0 p-0 text-slate-900">Kairos</h1>
          </div>
          <div
            className="relative flex items-center cursor-pointer"
            onClick={() => window.location.href = createPageUrl('Cart')}
          >
            <ShoppingCart className="w-6 h-6 text-slate-700" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center bg-slate-100 rounded-full px-4 py-2.5 gap-2">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-transparent outline-none w-full text-sm text-slate-700 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            )}
          </div>
        </div>

        <nav className="rp-space-tabs px-4 pb-3" aria-label="Grands espaces Kairos">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {MARKETPLACE_SPACES.map((space) => (
              <button
                key={space.id}
                type="button"
                onClick={() => { setSelectedCategory(selectedCategory === space.id ? null : space.id); setSearchQuery(''); setShowCategories(false); }}
                aria-pressed={selectedCategory === space.id}
                className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold transition ${selectedCategory === space.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
              >
                <span className="mr-1.5">{space.icon}</span>{space.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <PullToRefresh onRefresh={async () => { queryClient.invalidateQueries(['all-products']); queryClient.invalidateQueries(['shops']); }}>
        <main className="rp-feed flex-1 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">
              {selectedCategory || 'Sélection du jour'}
            </h2>
            <span className="text-xs text-slate-400">{filteredProducts.length} produits</span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
              <p className="text-sm text-slate-500">Chargement...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-slate-500">Aucun produit trouvé</p>
            </div>
          ) : isFiltered ? (
            /* Grille filtrée compacte */
            <div className="grid grid-cols-3 gap-1.5">
              {visibleProducts.map(product => (
                <CompactProductCard
                  key={product.id}
                  product={product}
                  shop={shopsMap[product.shop_id]}
                  onClick={() => handleProductClick(product)}
                />
              ))}
            </div>
          ) : (
            /* Mode sections horizontales par catégorie */
            <div className="-mx-4">
              {/* Sections catégories horizontales */}
              {Object.entries(categoryGroups).map(([cat, products]) => (
                <CategoryRow
                  key={cat}
                  title={cat}
                  products={products}
                  shops={shops}
                  onProductClick={handleProductClick}
                  onSeeAll={() => {
                    setSelectedCategory(cat);
                    setShowCategories(false);
                  }}
                />
              ))}

              {/* Grille globale compacte en bas */}
              <div className="px-4 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-800">🔀 Tout voir</h3>
                  <span className="text-[11px] text-slate-400">{filteredProducts.length} produits</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {visibleProducts.map(product => (
                    <CompactProductCard
                      key={product.id}
                      product={product}
                      shop={shopsMap[product.shop_id]}
                      onClick={() => handleProductClick(product)}
                    />
                  ))}
                </div>
                {visibleCount < filteredProducts.length && (
                  <div className="flex justify-center mt-4">
                    <button
                      onClick={() => setVisibleCount(c => c + 60)}
                      className="bg-orange-500 text-white font-semibold px-8 py-2.5 rounded-full text-sm"
                    >
                      Voir plus ({filteredProducts.length - visibleCount} restants)
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </PullToRefresh>

      {/* Floating cart button */}
      {user && cartCount > 0 && (
        <div
          className="fixed bottom-24 right-4 z-40 cursor-pointer"
          onClick={() => window.location.href = createPageUrl('Cart')}
        >
          <div className="bg-white border-2 border-orange-500 rounded-full p-3 shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform">
            <div className="relative">
              <ShoppingCart className="w-6 h-6 text-gray-800" />
              <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                {cartCount}
              </span>
            </div>
            <span className="font-bold text-sm text-gray-900 pr-2">{cartTotal.toFixed(0)} G</span>
          </div>
        </div>
      )}

    </div>
  );
}
