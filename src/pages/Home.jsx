import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Tag, Store, ShoppingBag, ShoppingCart, X, Clock, ChevronRight } from 'lucide-react';

import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { useAuth } from '@/components/auth/useAuth';
import ProductDetailModal from '@/components/modals/ProductDetailModal';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import { useActivityTracker } from '@/components/tracking/useActivityTracker';
import { trackMetaEvent } from '@/components/utils/metaTracking';
import { createPageUrl } from '@/utils';
import { useGuestCart } from '@/components/cart/useGuestCart';
import { FB_TAXONOMY, getChildren, findById } from '@/lib/fbTaxonomy';
import { useTranslation } from 'react-i18next';
import { getClientPrice } from '@/components/utils/priceCalculation';
import PullToRefresh from '@/components/mobile/PullToRefresh';
import { Button } from "@/components/ui/button";

const MerchantProfileAlert = lazy(() => import('@/components/home/MerchantProfileAlert'));

const ProductCard = ({ product, shop, onClick }) => {
  const price = applyClientMargin(product.promo_price || product.price);
  const originalPrice = product.promo_price ? applyClientMargin(product.price) : null;
  const hasPromo = product.promo_price && product.promo_price < product.price;

  return (
    <div
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="relative aspect-square bg-slate-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ShoppingBag className="w-10 h-10" />
          </div>
        )}
        {hasPromo && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            -{Math.round((1 - product.promo_price / product.price) * 100)}%
          </div>
        )}
        {product.is_available === false && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full">Rupture de stock</span>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[11px] text-slate-400 truncate">{shop?.company_name || ''}</p>
        <p className="text-sm font-semibold text-slate-800 truncate leading-tight mt-0.5">{product.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-sm font-black text-orange-500">{price.toLocaleString()} HTG</span>
          {originalPrice && (
            <span className="text-[11px] text-slate-400 line-through">{originalPrice.toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const { user } = useAuth();
  const { addToGuestCart } = useGuestCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { trackProductView, trackCategoryView, trackSearch, trackAddToCart } = useActivityTracker();

  const [searchQuery, setSearchQuery] = useState('');
  const [showCategories, setShowCategories] = useState(false);
  const [selectedFbCatId, setSelectedFbCatId] = useState(null);
  const [fbLevel1Id, setFbLevel1Id] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [showCartReminder, setShowCartReminder] = useState(false);

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
    queryFn: () => base44.entities.Product.filter({ is_available: true }, '-created_date', 200),
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
    staleTime: 10 * 60 * 1000,
    refetchInterval: false,
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
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

  const handleProductClick = (product) => {
    const shop = shops.find(s => s.id === product.shop_id);
    trackProductView(product, shop);
    trackMetaEvent('ViewContent', {
      content_ids: [product.id],
      content_type: 'product',
      content_name: product.name,
      value: applyClientMargin(product.promo_price || product.price),
      currency: 'HTG',
    });
    // Sauvegarder pour personnalisation future
    try { localStorage.setItem('last_viewed_product', JSON.stringify({ id: product.id, name: product.name, seo_tags: product.seo_tags, category: product.category })); } catch (_) {}
    setSelectedProduct(product);
    setSelectedShop(shop || null);
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    if (value.length > 2) trackSearch(value);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-20">
      <ProductDetailModal
        product={selectedProduct}
        shop={selectedShop}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        user={user}
        allProducts={allProducts}
        onProductChange={(p) => {
          setSelectedProduct(p);
          setSelectedShop(shops.find(s => s.id === p.shop_id) || null);
        }}
      />

      <Helmet>
        <meta name="google-adsense-account" content="ca-pub-2183521622591299" />
      </Helmet>

      <SEO
        title={selectedFbCatId ? `${findById(selectedFbCatId)?.name} - Marketplace Rapido Presto` : 'Marketplace - Tous les produits | Rapido Presto'}
        description={selectedFbCatId ? `Découvrez tous nos produits ${findById(selectedFbCatId)?.name} disponibles en Haïti - Livraison rapide avec Rapido Presto` : 'Découvrez tous les produits disponibles sur Rapido Presto - Mode, Mariage, Fleurs, Electronics et plus. Livraison rapide en Haïti.'}
        keywords={['marketplace haïti', 'boutique en ligne haïti', 'livraison rapide', selectedFbCatId ? findById(selectedFbCatId)?.name : 'produits'].filter(Boolean)}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="flex flex-col leading-tight cursor-pointer" onClick={() => window.location.reload()}>
            <h1 className="text-xl font-bold tracking-tight leading-none m-0 p-0 text-slate-900">Rapido</h1>
            <span className="text-sm text-orange-400 -mt-1 ml-4">Presto</span>
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
              placeholder={t('search_placeholder')}
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

        {/* Action Buttons */}
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => navigate('/Dashboard')}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white py-2 px-4 rounded-full text-sm font-semibold hover:bg-orange-600 transition"
          >
            <Store className="w-4 h-4" />
            <span>Ma boutique</span>
          </button>
          <button
            onClick={() => setShowCategories(!showCategories)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-semibold transition ${
              showCategories || selectedFbCatId
                ? 'bg-orange-500 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>{selectedFbCatId ? findById(selectedFbCatId)?.name : 'Catégories'}</span>
          </button>
        </div>

        {/* Categories dropdown - Taxonomy Facebook/Google uniquement */}
        {showCategories && (
          <div className="px-4 pb-3 space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {FB_TAXONOMY.map(cat => (
                <button key={cat.id} onClick={() => { setFbLevel1Id(fbLevel1Id === cat.id ? null : cat.id); if (selectedFbCatId) setSelectedFbCatId(null); }}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${fbLevel1Id === cat.id ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200'}`}>
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
            {fbLevel1Id && getChildren(fbLevel1Id).length > 0 && (
              <div className="flex flex-wrap gap-1.5 ml-3 items-center">
                <ChevronRight className="w-3 h-3 text-slate-400" />
                {getChildren(fbLevel1Id).map(child => (
                  <button key={child.id} onClick={() => setSelectedFbCatId(selectedFbCatId === child.id ? null : child.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${selectedFbCatId === child.id ? 'bg-orange-500 text-white border-orange-500' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                    {child.name}{child.children?.length > 0 && ' ›'}
                  </button>
                ))}
              </div>
            )}
            {selectedFbCatId && getChildren(selectedFbCatId).length > 0 && (
              <div className="flex flex-wrap gap-1.5 ml-6 items-center">
                <ChevronRight className="w-3 h-3 text-slate-400" />
                {getChildren(selectedFbCatId).map(child => (
                  <button key={child.id} onClick={() => setSelectedFbCatId(child.id)}
                    className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 transition">
                    {child.name}
                  </button>
                ))}
              </div>
            )}
            {selectedFbCatId && (
              <div className="mt-1">
                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                  {findById(selectedFbCatId)?.name}
                  <button onClick={() => { setSelectedFbCatId(null); setFbLevel1Id(null); }}><X className="w-2.5 h-2.5" /></button>
                </span>
              </div>
            )}
          </div>
        )}
      </header>

      <Suspense fallback={null}>
        <MerchantProfileAlert user={user} />
      </Suspense>

      {/* Main Content */}
      <PullToRefresh onRefresh={async () => { queryClient.invalidateQueries(['all-products']); queryClient.invalidateQueries(['shops']); }}>
        <main className="flex-1 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-800">
              {selectedFbCatId ? findById(selectedFbCatId)?.name : 'Sélection du jour'}
            </h2>
            <span className="text-xs text-slate-400">{filteredProducts.length} produits</span>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
              <p className="text-sm text-slate-500">Chargement des produits...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📦</div>
              <p className="text-slate-500">Aucun produit trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map(product => {
                const shop = shops.find(s => s.id === product.shop_id);
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    shop={shop}
                    onClick={() => handleProductClick(product)}
                  />
                );
              })}
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

      {/* Cart reminder */}
      {showCartReminder && cartCount > 0 && (
        <div className="fixed top-32 right-4 z-50 animate-in slide-in-from-right duration-500 max-w-sm w-full md:w-80">
          <div className="bg-white border-l-4 border-orange-500 shadow-2xl rounded-lg p-4 relative">
            <button onClick={() => setShowCartReminder(false)} className="absolute top-2 right-2 text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 p-2 rounded-full">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">N'oubliez pas vos achats !</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Il vous reste <span className="font-bold">{cartCount} article{cartCount > 1 ? 's' : ''}</span> dans votre panier.
                </p>
              </div>
            </div>
            <Button
              className="w-full mt-3 bg-orange-500 hover:bg-orange-600 text-white font-bold"
              onClick={() => window.location.href = createPageUrl('Cart')}
            >
              Finaliser ma commande
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}