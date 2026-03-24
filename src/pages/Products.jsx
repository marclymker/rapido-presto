import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Tag, Store, ShoppingBag, ChevronRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { useAuth } from '@/components/auth/useAuth';
const ProductDetailModal = lazy(() => import('@/components/modals/ProductDetailModal'));
import { toast } from 'sonner';
import CompactProductCard from '@/components/home/CompactProductCard';
import CategoryRow from '@/components/home/CategoryRow';
import SEO from '@/components/SEO';
import { useActivityTracker } from '@/components/tracking/useActivityTracker';
import { trackMetaEvent } from '@/components/utils/metaTracking';
import { FB_TAXONOMY, getChildren, findById } from '@/lib/fbTaxonomy';

const CATEGORIES = [
  'Pour Femme', 'Bijoux', 'Pour homme', 'Mariage', 'Boutique Fleurs',
  'Maison', 'Electronics', 'Fastfood', 'Restaurants', 'Pharmacie',
  'Epicerie', 'Café', 'Bébé', 'Outils', 'Matériels Décor'
];

const CATEGORY_ORDER = CATEGORIES;

export default function Products() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Restore scroll position when returning from a product page
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('marketplace_scroll');
      if (saved) {
        window.scrollTo(0, parseInt(saved, 10));
        sessionStorage.removeItem('marketplace_scroll');
      }
    } catch (_) {}
  }, []);
  const { trackProductView, trackCategoryView, trackSearch, trackAddToCart } = useActivityTracker();
  const [visibleCount, setVisibleCount] = useState(60);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategories, setShowCategories] = useState(false);
  const [selectedFbCatId, setSelectedFbCatId] = useState(null);
  const [fbLevel1Id, setFbLevel1Id] = useState(null);

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
    queryFn: () => base44.entities.Product.filter({ is_available: true }, '-created_date', 2000),
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ product, quantity }) => {
      if (!user) {
        base44.auth.redirectToLogin(window.location.pathname);
        return;
      }
      const price = applyClientMargin(product.promo_price || product.price);
      const shop = shops.find(s => s.id === product.shop_id);
      await base44.entities.CartItem.create({
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
    addToCartMutation.mutate({ product, quantity });
  };

  // IDs de la branche FB sélectionnée (pour inclure tous les enfants)
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

  // Algorithme de personnalisation basé sur le dernier produit visualisé
  const filteredProducts = React.useMemo(() => {
    const base = allProducts.filter(p => {
      const matchCategory = !selectedCategory || p.category === selectedCategory;
      if (!matchCategory) return false;
      // Filtre taxonomie FB (inclut tous les sous-niveaux)
      if (selectedFbBranchIds && !selectedFbBranchIds.has(p.fb_category_id)) return false;

      // Recherche hybride multi-mots : titre + nom + description + tags SEO
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

    // Scorer les produits similaires
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
  }, [allProducts, searchQuery, selectedCategory]);

  const handleProductClick = (product) => {
    const shop = shops.find(s => s.id === product.shop_id);
    trackProductView(product, shop);
    try { localStorage.setItem('last_viewed_product', JSON.stringify({ id: product.id, name: product.name, seo_tags: product.seo_tags, category: product.category })); } catch (_) {}
    navigate(`/product/${product.slug || product.id}`);
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    setVisibleCount(60);
    if (value.length > 2) trackSearch(value);
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setVisibleCount(60);
    setShowCategories(false);
    if (cat) trackCategoryView(cat);
  };

  const shopsMap = React.useMemo(() => {
    const m = {};
    shops.forEach(s => { m[s.id] = s; });
    return m;
  }, [shops]);

  const isFiltered = !!(searchQuery || selectedCategory || selectedFbCatId);

  const visibleProducts = React.useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);

  const categoryGroups = React.useMemo(() => {
    if (isFiltered) return {};
    const groups = {};
    allProducts.forEach(p => {
      if (!p.category) return;
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    });
    Object.keys(groups).forEach(k => {
      groups[k].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    });
    // Sort categories by priority order
    const sorted = {};
    CATEGORY_ORDER.forEach(cat => { if (groups[cat]) sorted[cat] = groups[cat]; });
    Object.keys(groups).forEach(cat => { if (!sorted[cat]) sorted[cat] = groups[cat]; });
    return sorted;
  }, [allProducts, isFiltered]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-20">

      <Helmet>
        <meta name="google-adsense-account" content="ca-pub-2183521622591299" />
      </Helmet>
      <SEO
        title={selectedCategory ? `${selectedCategory} - Marketplace Rapido Presto` : 'Marketplace - Tous les produits | Rapido Presto'}
        description={selectedCategory ? `Découvrez tous nos produits ${selectedCategory} disponibles en Haïti - Livraison rapide avec Rapido Presto` : 'Découvrez tous les produits disponibles sur Rapido Presto - Mode, Mariage, Fleurs, Electronics et plus. Livraison rapide en Haïti.'}
        keywords={['marketplace haïti', 'boutique en ligne haïti', 'livraison rapide', selectedCategory || 'produits'].filter(Boolean)}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Marketplace</h1>

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

        {/* Action Buttons */}
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => {
              if (user) {
                navigate('/Dashboard');
              } else {
                base44.auth.redirectToLogin('/Dashboard');
              }
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white py-2 px-4 rounded-full text-sm font-semibold hover:bg-orange-600 transition"
          >
            <Store className="w-4 h-4" />
            <span>Ma boutique</span>
          </button>
          <button
            onClick={() => setShowCategories(!showCategories)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-semibold transition ${
              showCategories || selectedCategory
                ? 'bg-orange-500 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>{selectedCategory || 'Catégories'}</span>
          </button>
        </div>

        {/* Categories dropdown */}
        {showCategories && (
          <div className="px-4 pb-3 space-y-3">
            {/* Catégories app */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleCategorySelect(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  !selectedCategory ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Tous
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleCategorySelect(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    selectedCategory === cat ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Filtre hiérarchique Facebook Taxonomy */}
            <div className="border-t pt-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Taxonomy Facebook/Google</p>
              {/* Niveau 1 */}
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {FB_TAXONOMY.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setFbLevel1Id(fbLevel1Id === cat.id ? null : cat.id);
                      if (selectedFbCatId && !String(selectedFbCatId).startsWith(String(cat.id))) setSelectedFbCatId(null);
                    }}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                      fbLevel1Id === cat.id ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>

              {/* Niveau 2 (enfants du niveau 1 sélectionné) */}
              {fbLevel1Id && getChildren(fbLevel1Id).length > 0 && (
                <div className="flex flex-wrap gap-1.5 ml-3 mb-1.5">
                  <ChevronRight className="w-3 h-3 text-slate-400 self-center" />
                  {getChildren(fbLevel1Id).map(child => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedFbCatId(selectedFbCatId === child.id ? null : child.id)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                        selectedFbCatId === child.id ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}
                    >
                      {child.name}
                      {child.children?.length > 0 && ' ›'}
                    </button>
                  ))}
                </div>
              )}

              {/* Niveau 3 */}
              {selectedFbCatId && getChildren(selectedFbCatId).length > 0 && (
                <div className="flex flex-wrap gap-1.5 ml-6">
                  <ChevronRight className="w-3 h-3 text-slate-400 self-center" />
                  {getChildren(selectedFbCatId).map(child => (
                    <button
                      key={child.id}
                      onClick={() => setSelectedFbCatId(selectedFbCatId === child.id ? fbLevel1Id : child.id)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 transition"
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Badge filtre actif */}
              {selectedFbCatId && (
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    ID {selectedFbCatId} · {findById(selectedFbCatId)?.name}
                    <button onClick={() => { setSelectedFbCatId(null); }} className="ml-0.5 hover:text-blue-900">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 pt-2 pb-4">
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
          <div className="px-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">
                {selectedFbCatId ? findById(selectedFbCatId)?.name : selectedCategory || 'Résultats'}
              </span>
              <span className="text-xs text-slate-400">{filteredProducts.length} produits</span>
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
        ) : (
          <div>
            {/* Sections horizontales par catégorie */}
            {Object.entries(categoryGroups).map(([cat, products]) => (
              <CategoryRow
                key={cat}
                title={cat}
                products={products}
                shops={shops}
                onProductClick={handleProductClick}
                onSeeAll={() => handleCategorySelect(cat)}
              />
            ))}

            {/* Grille globale compacte */}
            <div className="px-3 mt-2">
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
    </div>
  );
}