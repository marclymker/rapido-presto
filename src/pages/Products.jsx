import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Tag, Store, ChevronRight, X, MapPin, MessageCircle, Ticket } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ProductFormModal from '@/components/enterprise/modals/ProductFormModal';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { useAuth } from '@/components/auth/useAuth';
import { toast } from 'sonner';
import CompactProductCard from '@/components/home/CompactProductCard';
import CategoryRow from '@/components/home/CategoryRow';
import TrendingSection from '@/components/home/TrendingSection';
import SEO from '@/components/SEO';
import { useActivityTracker } from '@/components/tracking/useActivityTracker';
import { trackMetaEvent } from '@/components/utils/metaTracking';
import { FB_TAXONOMY, getChildren, findById } from '@/lib/fbTaxonomy';

const CATEGORIES = [
  'Pour Femme', 'Bijoux', 'Pour homme', 'Mariage', 'Boutique Fleurs',
  'Maison', 'Electronics', 'Mode', 'Pharmacie',
  'Epicerie', 'Café', 'Bébé', 'Outils', 'Matériels Décor'
];

// La liste originale exacte pour le Dropdown
const REGIONS = [
  'Port-au-Prince', 'Carrefour', 'Delmas', 'Pétion-Ville', 'Cité Soleil',
  'Tabarre', 'Clercine', 'Croix des Bouquets', 'Kenscoff', 'Gressier',
  'Cap-Haïtien', 'Limonade', 'Quartier-Morin', 'Les Gonaïves', 'Ennery', "L'Estère"
];

// ---------------------------------------------------------------------------
// MOTEUR DE PROXIMITÉ (SYSTEMS THINKING)
// ---------------------------------------------------------------------------
// Normalisation stricte pour éviter que les accents ne cassent l'algorithme
const normalizeForRegion = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const REGION_DATA = {
  // Section 1 : Port-au-Prince
  'port-au-prince': { index: 0, section: 1 },
  'kenscoff': { index: 0, section: 1 },
  'petion-ville': { index: 1, section: 1 },
  'delmas': { index: 2, section: 1 },
  'tabarre': { index: 3, section: 1 },
  'clercine': { index: 4, section: 1 },
  'cite soleil': { index: 5, section: 1 },
  'croix des bouquets': { index: 6, section: 1 },
  'lilavois': { index: 7, section: 1 },
  
  // Section 2 : Carrefour
  'fontamara': { index: 8, section: 2 },
  'carrefour': { index: 9, section: 2 },
  'gressier': { index: 10, section: 2 },
  'leogane': { index: 11, section: 2 },
  
  // Section 3 : Artibonite et Nord
  'ennery': { index: 12, section: 3 },
  "l'estere": { index: 13, section: 3 },
  'gonaives': { index: 14, section: 3 },
  'les gonaives': { index: 14, section: 3 }, // Gestion des variations
  'plaine du nord': { index: 15, section: 3 },
  'vaudreuil': { index: 16, section: 3 },
  'cap-haitien': { index: 17, section: 3 }, 
  'quartier-morin': { index: 17, section: 3 },
  'madeline': { index: 18, section: 3 },
  'limonade': { index: 19, section: 3 },
  'pignon': { index: 20, section: 3 },
  'hinche': { index: 21, section: 3 }
};

const calculateProximityScore = (targetRegionName, shopRegionName) => {
  if (!targetRegionName || !shopRegionName) return 999; 
  
  const target = REGION_DATA[normalizeForRegion(targetRegionName)];
  const shop = REGION_DATA[normalizeForRegion(shopRegionName)];
  
  if (!target || !shop) return 999;

  let diff = Math.abs(target.index - shop.index);
  // Pénalité Asymétrique : 50 points si on change de macro-région
  let penalty = target.section !== shop.section ? 50 : 0; 
  return diff + penalty;
};

// Algorithme : Proximité >> Récence >> Diversité (Round Robin)
const sortWithProximityAndDiversity = (products, shopsMap, targetRegion, nowMs) => {
  if (!products.length) return [];
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

  // 1. Scoring
  const scored = products.map(p => {
    const shop = shopsMap[p.shop_id];
    const shopRegion = shop?.region;
    const proximityScore = calculateProximityScore(targetRegion, shopRegion);
    const ageMs = nowMs - new Date(p.created_date).getTime();
    const recencyScore = Math.max(0, 1 - ageMs / NINETY_DAYS_MS); 
    
    return { product: p, proximityScore, recencyScore, shopId: p.shop_id || '__no_shop__' };
  });

  // 2. Bucketing par score de proximité
  const proximityBuckets = {};
  scored.forEach(item => {
    if (!proximityBuckets[item.proximityScore]) proximityBuckets[item.proximityScore] = [];
    proximityBuckets[item.proximityScore].push(item);
  });

  const finalArray = [];
  const sortedProximityScores = Object.keys(proximityBuckets).map(Number).sort((a, b) => a - b);

  // 3. Distribution équitable par boutique pour chaque niveau de proximité
  for (const score of sortedProximityScores) {
    const itemsInBucket = proximityBuckets[score];
    const shopQueuesMap = {};
    
    itemsInBucket.forEach(item => {
       if (!shopQueuesMap[item.shopId]) shopQueuesMap[item.shopId] = [];
       shopQueuesMap[item.shopId].push(item);
    });

    const queues = Object.values(shopQueuesMap).map(queue => 
      queue.sort((a, b) => b.recencyScore - a.recencyScore)
    );

    let maxLen = Math.max(...queues.map(q => q.length));
    for (let i = 0; i < maxLen; i++) {
      queues.forEach(queue => {
        if (queue[i]) finalArray.push(queue[i].product);
      });
    }
  }

  return finalArray;
};

// ---------------------------------------------------------------------------
// UTILITAIRES DE RECHERCHE
// ---------------------------------------------------------------------------
const normalize = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const fuzzyMatch = (text, keyword) => {
  const t = normalize(text), k = normalize(keyword);
  if (t.includes(k)) return true;
  if (k.length <= 3) return false;
  for (let i = 0; i <= t.length - k.length + 1; i++) {
    let diff = 0;
    for (let j = 0; j < k.length; j++) {
      if (t[i + j] !== k[j]) diff++;
      if (diff > 1) break;
    }
    if (diff <= 1) return true;
  }
  return false;
};

// ---------------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// ---------------------------------------------------------------------------
export default function Products() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const queryClient = useQueryClient();
  const mountTimeRef = useRef(Date.now());

  const { trackProductView, trackCategoryView, trackSearch, trackAddToCart } = useActivityTracker();

  const [visibleCount,      setVisibleCount]      = useState(60);
  const [searchQuery,       setSearchQuery]       = useState('');
  const [selectedCategory,  setSelectedCategory]  = useState(null);
  const [showCategories,    setShowCategories]    = useState(false);
  const [selectedFbCatId,   setSelectedFbCatId]   = useState(null);
  const [fbLevel1Id,        setFbLevel1Id]        = useState(null);
  const [selectedRegion,    setSelectedRegion]    = useState('');
  const [editingProduct,    setEditingProduct]    = useState(null);

  const isAdmin = user?.role === 'admin';
  // Le centre de gravité de l'algorithme
  const referenceRegion = selectedRegion || user?.region || 'Port-au-Prince';

  useEffect(() => {
    try {
      const savedSearch = sessionStorage.getItem('marketplace_search');
      if (savedSearch) setSearchQuery(savedSearch);
      const savedCategory = sessionStorage.getItem('marketplace_category');
      if (savedCategory) setSelectedCategory(savedCategory);
      const savedScroll = sessionStorage.getItem('marketplace_scroll');
      if (savedScroll) {
        window.scrollTo(0, parseInt(savedScroll, 10));
        sessionStorage.removeItem('marketplace_scroll');
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    trackMetaEvent('PageView');
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title:    'Marketplace - Rapido Presto',
        page_location: window.location.href,
      });
    }
  }, []);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['all-products'],
    queryFn:  () => base44.entities.Product.filter({ is_available: true }, '-created_date', 2000),
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn:  () => base44.entities.Shop.filter({ is_active: true }),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke('chatService', { action: 'list' });
      return Array.isArray(r.data) ? r.data : (r.data?.data || []);
    },
    enabled: !!user?.id,
    refetchInterval: 15000,
  });

  const unreadCount = useMemo(() => conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0), [conversations]);

  const shopsMap = useMemo(() => {
    const m = {};
    shops.forEach(s => { m[s.id] = s; });
    return m;
  }, [shops]);

  const addToCartMutation = useMutation({
    mutationFn: async ({ product, quantity }) => {
      if (!user) {
        base44.auth.redirectToLogin(window.location.pathname);
        return;
      }
      const price = applyClientMargin(product.promo_price || product.price);
      const shop  = shopsMap[product.shop_id];
      await base44.entities.CartItem.create({
        user_id:       user.id,
        product_id:    product.id,
        product_name:  product.name,
        product_image: product.image_url,
        quantity,
        unit_price:    price,
        shop_id:       product.shop_id,
        shop_name:     shop?.company_name || '',
        shop_region:   shop?.region       || '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart', user?.id] });
      toast.success('Ajouté au panier !');
    },
  });

  const handleAddToCart = useCallback((product, quantity = 1) => {
    trackAddToCart(product);
    addToCartMutation.mutate({ product, quantity });
  }, [addToCartMutation, trackAddToCart]);

  const selectedFbBranchIds = useMemo(() => {
    if (!selectedFbCatId) return null;
    const ids = new Set();
    const collect = (nodes) => {
      for (const n of nodes) {
        ids.add(n.id);
        if (n.children?.length) collect(n.children);
      }
    };
    const findAndCollect = (nodes, targetId) => {
      for (const n of nodes) {
        if (n.id === targetId) { collect([n]); return true; }
        if (n.children?.length && findAndCollect(n.children, targetId)) return true;
      }
      return false;
    };
    findAndCollect(FB_TAXONOMY, selectedFbCatId);
    return ids;
  }, [selectedFbCatId]);

  const isFiltered = !!(searchQuery || selectedCategory || selectedFbCatId);

  const filteredProducts = useMemo(() => {
    const baseFiltered = allProducts.filter(p => {
      if (selectedCategory && p.category !== selectedCategory) return false;
      if (selectedFbBranchIds && !selectedFbBranchIds.has(p.fb_category_id)) return false;
      return true;
    });

    if (searchQuery.trim()) {
      const keywords = searchQuery.trim().split(/\s+/).filter(w => w.length > 1);
      const scoreProduct = (p) => {
        const normName = normalize(p.name || '');
        const normTags = (p.seo_tags || []).map(t => normalize(t));
        let score = 0;
        let allMatch = true;

        for (const kw of keywords) {
          const normKw = normalize(kw);
          const titleMatch = normName.includes(normKw);
          const tagMatch   = normTags.some(t => t.includes(normKw));
          const fuzzy      = !titleMatch && !tagMatch && fuzzyMatch(p.name + ' ' + (p.seo_tags || []).join(' '), kw);

          if (titleMatch)  score += 100;
          else if (tagMatch) score += 10;
          else if (fuzzy)   score += 1;
          else { allMatch = false; break; }
        }
        return allMatch ? score : -1;
      };

      const scored = baseFiltered
        .map(p => ({ p, score: scoreProduct(p) }))
        .filter(({ score }) => score >= 0);

      scored.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return normalize(a.p.name).localeCompare(normalize(b.p.name));
      });

      return scored.map(({ p }) => p);
    }

    if (isFiltered) return baseFiltered;

    let lastViewed = null;
    try {
      const raw = localStorage.getItem('last_viewed_product');
      if (raw) lastViewed = JSON.parse(raw);
    } catch (_) {}

    if (!lastViewed) {
      return sortWithProximityAndDiversity(baseFiltered, shopsMap, referenceRegion, mountTimeRef.current);
    }

    const nameWords = (lastViewed.name || '').toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const tags      = lastViewed.seo_tags || [];
    const category  = lastViewed.category || '';

    const scoredView = baseFiltered
      .filter(p => p.id !== lastViewed.id)
      .map(p => {
        let score = 0;
        const pName = (p.name || '').toLowerCase();
        const pTags = p.seo_tags || [];
        nameWords.forEach(w => { if (pName.includes(w)) score += 2; });
        tags.forEach(t      => { if (pTags.includes(t)) score += 3; });
        if (p.category === category) score += 1;
        return { ...p, _score: score };
      });

    const top10 = scoredView.filter(p => p._score > 0).sort((a, b) => b._score - a._score).slice(0, 10);
    const top10Ids = new Set(top10.map(p => p.id));
    
    const rest = sortWithProximityAndDiversity(
      baseFiltered.filter(p => !top10Ids.has(p.id)), 
      shopsMap, 
      referenceRegion, 
      mountTimeRef.current
    );

    return [...top10, ...rest];
  }, [allProducts, searchQuery, selectedCategory, selectedFbCatId, shopsMap, referenceRegion, isFiltered]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount]
  );

  const categoryGroups = useMemo(() => {
    if (isFiltered) return {};

    const byCategory = {};
    allProducts.forEach(p => {
      if (!p.category) return;
      if (!byCategory[p.category]) byCategory[p.category] = [];
      byCategory[p.category].push(p);
    });

    const result = {};
    Object.keys(byCategory).forEach(cat => {
      result[cat] = sortWithProximityAndDiversity(byCategory[cat], shopsMap, referenceRegion, mountTimeRef.current);
    });

    const sorted = {};
    CATEGORIES.forEach(cat => { if (result[cat]) sorted[cat] = result[cat]; });
    Object.keys(result).forEach(cat => { if (!sorted[cat]) sorted[cat] = result[cat]; });

    return sorted;
  }, [allProducts, isFiltered, shopsMap, referenceRegion]);

  const handleProductClick = useCallback((product) => {
    if (isAdmin) { setEditingProduct(product); return; }
    const shop = shopsMap[product.shop_id];
    trackProductView(product, shop);
    try {
      localStorage.setItem('last_viewed_product', JSON.stringify({
        id: product.id, name: product.name,
        seo_tags: product.seo_tags, category: product.category,
      }));
    } catch (_) {}
    navigate(`/product/${product.slug || product.id}`);
  }, [isAdmin, shopsMap, trackProductView, navigate]);

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    setVisibleCount(60);
    try { sessionStorage.setItem('marketplace_search', value); } catch (_) {}
    if (value.length > 2) trackSearch(value);
  }, [trackSearch]);

  const handleCategorySelect = useCallback((cat) => {
    setSelectedCategory(cat);
    setVisibleCount(60);
    setShowCategories(false);
    try { sessionStorage.setItem('marketplace_category', cat || ''); } catch (_) {}
    if (cat) trackCategoryView(cat);
  }, [trackCategoryView]);

  return (
    <div className="flex flex-col min-h-screen pb-20" style={{backgroundColor: '#f0f2f5'}}>
      {isAdmin && editingProduct && (
        <ProductFormModal
          product={editingProduct}
          shopId={editingProduct.shop_id}
          open={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            queryClient.invalidateQueries({ queryKey: ['all-products'] });
          }}
        />
      )}

      <Helmet>
        <meta name="google-adsense-account" content="ca-pub-2183521622591299" />
      </Helmet>
      <SEO
        title={selectedCategory ? `${selectedCategory} - Marketplace Rapido Presto` : 'Marketplace - Tous les produits | Rapido Presto'}
        description={selectedCategory ? `Découvrez tous nos produits ${selectedCategory} disponibles en Haïti - Livraison rapide avec Rapido Presto` : 'Découvrez tous les produits disponibles sur Rapido Presto - Mode, Mariage, Fleurs, Electronics et plus. Livraison rapide en Haïti.'}
        keywords={['marketplace haïti', 'boutique en ligne haïti', 'livraison rapide', selectedCategory || 'produits'].filter(Boolean)}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />

      <header className="sticky top-0 z-40 bg-white shadow-sm">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black tracking-tight">Marketplace</h1>
          
          <div className="flex items-center">
            <button
              onClick={() => user ? navigate('/Chat') : base44.auth.redirectToLogin('/Chat')}
              className="relative p-2.5 bg-[#E4E6EB] hover:bg-[#D8DADF] rounded-full transition-colors text-black active:scale-95"
              aria-label="Messages"
            >
              <MessageCircle className="w-5 h-5 text-[#0084FF]" fill="currentColor" stroke="none" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#E41E3F] text-white text-[11px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-[2px] border-white shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="flex items-center rounded-full px-4 py-2.5 gap-2 bg-[#F0F2F5]">
            <Search className="w-5 h-5 text-[#65676B] flex-shrink-0" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="bg-transparent outline-none w-full text-[15px] text-black placeholder:text-[#65676B]"
              aria-label="Rechercher un produit"
            />
            {searchQuery && (
              <button type="button" onClick={() => handleSearchChange('')} aria-label="Effacer la recherche">
                <X className="w-4 h-4 text-[#65676B]" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-gray-300 bg-white">
          <button
            type="button"
            onClick={() => user ? navigate('/Dashboard') : base44.auth.redirectToLogin('/Dashboard')}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-[#1877F2] font-semibold text-[14px] md:text-[15px] border-b-[3px] border-[#1877F2]"
          >
            <Store className="w-[18px] h-[18px] md:w-5 md:h-5" fill="currentColor" stroke="none" />
            <span className="whitespace-nowrap">Ma Boutique</span>
          </button>

          <div className="w-[1px] h-5 bg-gray-300"></div>

          <button
            type="button"
            onClick={() => setShowCategories(v => !v)}
            aria-pressed={showCategories || !!selectedCategory}
            className={`flex-1 flex items-center justify-center gap-2 py-3 font-semibold text-[14px] md:text-[15px] border-b-[3px] border-transparent ${showCategories || selectedCategory ? 'text-[#1877F2]' : 'text-[#65676B]'}`}
          >
            <Tag className="w-[18px] h-[18px] md:w-5 md:h-5" />
            <span className="whitespace-nowrap">{selectedCategory || 'Catégories'}</span>
          </button>

          <div className="w-[1px] h-5 bg-gray-300"></div>

          <button
            type="button"
            className="flex-1 flex items-center justify-center gap-2 py-3 font-semibold text-[14px] md:text-[15px] text-[#65676B] border-b-[3px] border-transparent"
          >
            <Ticket className="w-[18px] h-[18px] md:w-5 md:h-5" fill="currentColor" stroke="none" />
            <span className="whitespace-nowrap">Tickets</span>
          </button>

          <div className="w-[1px] h-5 bg-gray-300"></div>

          <Select
            value={selectedRegion}
            onValueChange={(v) => { setSelectedRegion(v === '__all__' ? '' : v); setVisibleCount(60); }}
          >
            <SelectTrigger
              className="flex-shrink-0 w-16 md:w-20 flex justify-center items-center py-3 border-0 bg-transparent shadow-none focus:ring-0 p-0 h-auto text-[#65676B] rounded-none border-b-[3px] border-transparent data-[state=open]:text-[#1877F2]"
              aria-label="Filtrer par région"
            >
              <MapPin className="w-5 h-5" fill="currentColor" stroke="none" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les zones</SelectItem>
              {REGIONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {showCategories && (
          <div className="px-4 py-3 space-y-3 animate-in fade-in duration-200 bg-white">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => handleCategorySelect(null)}
                aria-pressed={!selectedCategory}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition"
                style={!selectedCategory ? {backgroundColor: '#1877F2', color: '#fff', borderColor: '#1877F2'} : {backgroundColor: '#fff', color: '#050505', borderColor: '#ddd'}}
              >
                Tous
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  aria-pressed={selectedCategory === cat}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold border transition"
                  style={selectedCategory === cat ? {backgroundColor: '#1877F2', color: '#fff', borderColor: '#1877F2'} : {backgroundColor: '#fff', color: '#050505', borderColor: '#ddd'}}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Taxonomy Facebook / Google
              </p>

              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {FB_TAXONOMY.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setFbLevel1Id(fbLevel1Id === cat.id ? null : cat.id);
                      if (selectedFbCatId && !String(selectedFbCatId).startsWith(String(cat.id))) {
                        setSelectedFbCatId(null);
                      }
                    }}
                    aria-pressed={fbLevel1Id === cat.id}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                      fbLevel1Id === cat.id ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {cat.icon} {cat.name}
                  </button>
                ))}
              </div>

              {fbLevel1Id && getChildren(fbLevel1Id).length > 0 && (
                <div className="flex flex-wrap gap-1.5 ml-3 mb-1.5">
                  <ChevronRight className="w-3 h-3 text-slate-400 self-center" />
                  {getChildren(fbLevel1Id).map(child => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setSelectedFbCatId(selectedFbCatId === child.id ? null : child.id)}
                      aria-pressed={selectedFbCatId === child.id}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                        selectedFbCatId === child.id ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}
                    >
                      {child.name}{child.children?.length > 0 && ' ›'}
                    </button>
                  ))}
                </div>
              )}

              {selectedFbCatId && getChildren(selectedFbCatId).length > 0 && (
                <div className="flex flex-wrap gap-1.5 ml-6">
                  <ChevronRight className="w-3 h-3 text-slate-400 self-center" />
                  {getChildren(selectedFbCatId).map(child => (
                    <button
                      key={child.id}
                      type="button"
                      onClick={() => setSelectedFbCatId(prev => prev === child.id ? fbLevel1Id : child.id)}
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium border bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100 transition"
                    >
                      {child.name}
                    </button>
                  ))}
                </div>
              )}

              {selectedFbCatId && (
                <div className="mt-1.5 flex items-center gap-1">
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                    ID {selectedFbCatId} · {findById(selectedFbCatId)?.name}
                    <button
                      type="button"
                      onClick={() => setSelectedFbCatId(null)}
                      className="ml-0.5 hover:text-blue-900"
                      aria-label="Supprimer le filtre"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pt-2 pb-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
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
                  type="button"
                  onClick={() => setVisibleCount(c => c + 60)}
                  className="font-semibold px-8 py-2.5 rounded-full text-sm text-white transition-transform active:scale-95"
                  style={{backgroundColor: '#1877F2'}}
                >
                  Voir plus ({filteredProducts.length - visibleCount} restants)
                </button>
              </div>
            )}
          </div>

        ) : (
          <div>
            <TrendingSection
              allProducts={allProducts}
              shops={shops}
              onProductClick={handleProductClick}
            />

            {Object.entries(categoryGroups).map(([cat, products]) => (
              <CategoryRow
                // C'EST ICI LA MAGIE : La clé inclut la région.
                // React détruira et reconstruira la ligne entière au moindre changement de Dropdown.
                key={`${cat}-${referenceRegion}`}
                title={cat}
                products={products}
                shops={shops}
                onProductClick={handleProductClick}
                onSeeAll={() => handleCategorySelect(cat)}
              />
            ))}

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
                    type="button"
                    onClick={() => setVisibleCount(c => c + 60)}
                    className="font-semibold px-8 py-2.5 rounded-full text-sm text-white transition-transform active:scale-95"
                    style={{backgroundColor: '#1877F2'}}
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