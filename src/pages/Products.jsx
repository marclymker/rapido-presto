import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, X, MapPin, MessageCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from "@/components/ui/button";
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
import { FB_TAXONOMY, findById } from '@/lib/fbTaxonomy';
import { MARKETPLACE_SPACES, getMarketplaceSpace } from '@/lib/marketplaceSpaces';

const CATEGORIES = [
  ...MARKETPLACE_SPACES.map((space) => space.id)
];

const REGIONS = [
  "Port-au-Prince", "Kenscoff", "Pétion-Ville", "Delmas", "Tabarre",
  "Clercine", "Cité Soleil", "Croix des Bouquets", "Lilavois",
  "Fontamara", "Carrefour", "Gressier", "Léogâne",
  "Ennery", "L'Estère", "Gonaïves", "Plaine du Nord", "Vaudreuil",
  "Cap-Haïtien", "Madeline", "Limonade", "Pignon", "Hinche"
];

const SELLER_PROFILE_DISMISS_KEY = 'rapido_seller_profile_prompt_dismissed_until';
const SELLER_PROFILE_REOPEN_DELAY = 60 * 60 * 1000;

const normalizeForRegion = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const REGION_DATA = {
  'port-au-prince': { index: 0, section: 1 },
  'kenscoff': { index: 0, section: 1 },
  'petion-ville': { index: 1, section: 1 },
  'delmas': { index: 2, section: 1 },
  'tabarre': { index: 3, section: 1 },
  'clercine': { index: 4, section: 1 },
  'cite soleil': { index: 5, section: 1 },
  'croix des bouquets': { index: 6, section: 1 },
  'lilavois': { index: 7, section: 1 },
  'fontamara': { index: 8, section: 1 },
  'carrefour': { index: 9, section: 2 },
  'gressier': { index: 10, section: 2 },
  'leogane': { index: 11, section: 2 },
  'ennery': { index: 12, section: 3 },
  "l'estere": { index: 13, section: 3 },
  'gonaives': { index: 14, section: 3 },
  'les gonaives': { index: 14, section: 3 },
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
  let penalty = target.section !== shop.section ? 50 : 0;
  return diff + penalty;
};

const sortWithProximityAndDiversity = (products, shopsMap, targetRegion, nowMs) => {
  if (!products.length) return [];
  const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
  const scored = products.map(p => {
    const shop = shopsMap[p.shop_id];
    const proximityScore = calculateProximityScore(targetRegion, shop?.region);
    const ageMs = nowMs - new Date(p.created_date).getTime();
    const recencyScore = Math.max(0, 1 - ageMs / NINETY_DAYS_MS);
    return { product: p, proximityScore, recencyScore, shopId: p.shop_id || '__no_shop__' };
  });

  const proximityBuckets = {};
  scored.forEach(item => {
    if (!proximityBuckets[item.proximityScore]) proximityBuckets[item.proximityScore] = [];
    proximityBuckets[item.proximityScore].push(item);
  });

  const finalArray = [];
  const sortedProximityScores = Object.keys(proximityBuckets).map(Number).sort((a, b) => a - b);

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
      queues.forEach(queue => { if (queue[i]) finalArray.push(queue[i].product); });
    }
  }
  return finalArray;
};

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

export default function Products() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mountTimeRef = useRef(Date.now());
  const connection = typeof navigator !== 'undefined' ? navigator.connection : undefined;
  const constrainedNetwork = Boolean(connection?.saveData || ['slow-2g', '2g'].includes(connection?.effectiveType));

  const { trackProductView, trackCategoryView, trackSearch, trackAddToCart } = useActivityTracker();

  const [visibleCount, setVisibleCount] = useState(24);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategories, setShowCategories] = useState(false);
  const [selectedFbCatId, setSelectedFbCatId] = useState(null);
  const [fbLevel1Id, setFbLevel1Id] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [editingProduct, setEditingProduct] = useState(null);
  const [showSellerProfilePrompt, setShowSellerProfilePrompt] = useState(false);
  const [sellerProfile, setSellerProfile] = useState({ phone: '', address: '', region: '' });

  const isAdmin = user?.role === 'admin';
  const referenceRegion = selectedRegion || user?.region || 'Port-au-Prince';


  useEffect(() => {
    try {
      const savedSearch = sessionStorage.getItem('marketplace_search');
      if (savedSearch) setSearchQuery(savedSearch);
      const savedCategory = sessionStorage.getItem('marketplace_category');
      if (savedCategory && MARKETPLACE_SPACES.some((space) => space.id === savedCategory)) {
        setSelectedCategory(savedCategory);
      } else if (savedCategory) {
        sessionStorage.removeItem('marketplace_category');
        setSelectedCategory(null);
      }
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
        page_title: 'Marketplace - Kairos',
        page_location: window.location.href,
      });
    }
  }, []);

  // --- CHARGEMENT PROGRESSIF : 60 produits immédiats, reste différé après 1.5s ---
  const [loadAll, setLoadAll] = useState(false);

  const { data: firstProducts = [], isLoading } = useQuery({
    queryKey: ['products-initial'],
    queryFn: () => base44.entities.Product.filter({ is_available: true }, '-created_date', 30),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  useEffect(() => {
    if (firstProducts.length > 0 && !loadAll) {
      // Délai plus long sur connexion lente (détection via navigator.connection)
      if (constrainedNetwork) return;
      const delay = 2000;
      const t = setTimeout(() => setLoadAll(true), delay);
      return () => clearTimeout(t);
    }
  }, [firstProducts.length, loadAll, constrainedNetwork]);

  const { data: fullProducts = [] } = useQuery({
    queryKey: ['products-all'],
    queryFn: () => base44.entities.Product.filter({ is_available: true }, '-created_date', 200),
    enabled: loadAll && !constrainedNetwork,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const allProducts = (loadAll && fullProducts.length > 0) ? fullProducts : firstProducts;

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }, '-created_date', 60),
  });

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const r = await base44.functions.invoke('chatService', { action: 'list' });
      return Array.isArray(r.data) ? r.data : (r.data?.data || []);
    },
    // Ne charger les conversations qu'après les produits initiaux, et seulement si pas en économie de données
    enabled: !!user?.id && firstProducts.length > 0 && !constrainedNetwork,
    refetchInterval: 60000, // Réduit à 60s pour économiser la data
    staleTime: 40 * 1000,
  });

  const unreadCount = useMemo(() => conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0), [conversations]);

  const shopsMap = useMemo(() => {
    const m = {};
    shops.forEach(s => { m[s.id] = s; });
    return m;
  }, [shops]);

  const isSeller = useMemo(() => {
    if (!user || !shops.length) return false;
    return shops.some(shop => shop.user_id === user.id);
  }, [user, shops]);

  useEffect(() => {
    if (!isSeller || !user) {
      setShowSellerProfilePrompt(false);
      return;
    }

    const missingContact = !user.phone || !user.address || !user.region;
    if (!missingContact) {
      setShowSellerProfilePrompt(false);
      return;
    }

    const dismissedUntil = Number(localStorage.getItem(SELLER_PROFILE_DISMISS_KEY) || 0);
    const openPrompt = () => {
      setSellerProfile({
        phone: user.phone || '',
        address: user.address || '',
        region: user.region || ''
      });
      setShowSellerProfilePrompt(true);
    };

    if (dismissedUntil > Date.now()) {
      setShowSellerProfilePrompt(false);
      const timer = window.setTimeout(openPrompt, dismissedUntil - Date.now());
      return () => window.clearTimeout(timer);
    }

    openPrompt();
  }, [isSeller, user]);

  const dismissSellerProfilePrompt = () => {
    const dismissedUntil = Date.now() + SELLER_PROFILE_REOPEN_DELAY;
    localStorage.setItem(SELLER_PROFILE_DISMISS_KEY, String(dismissedUntil));
    setShowSellerProfilePrompt(false);
  };

  const updateSellerProfileMutation = useMutation({
    mutationFn: async (data) => {
      if (!user?.id) throw new Error('Session utilisateur expirée.');
      const saved = await base44.auth.updateMe(data);
      if (!saved) throw new Error('Impossible de sauvegarder le profil vendeur.');
      return saved;
    },
    onSuccess: () => {
      toast.success('Profil vendeur enregistré.');
      setShowSellerProfilePrompt(false);
    },
    onError: (error) => toast.error(error.message || 'Impossible d’enregistrer le profil.')
  });

  const handleSellerProfileSubmit = (event) => {
    event.preventDefault();
    const { phone, address, region } = sellerProfile;
    if (!phone.trim() || !address.trim() || !region.trim()) {
      toast.error('Le WhatsApp, l’adresse et la région sont obligatoires.');
      return;
    }
    updateSellerProfileMutation.mutate({
      phone: phone.trim(),
      address: address.trim(),
      region: region.trim()
    });
  };


  const addToCartMutation = useMutation({
    mutationFn: async ({ product, quantity }) => {
      if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
      const price = applyClientMargin(product.promo_price || product.price, product.shop_name);
      const shop = shopsMap[product.shop_id];
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
      if (selectedCategory && getMarketplaceSpace(p) !== selectedCategory) return false;
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
          const tagMatch = normTags.some(t => t.includes(normKw));
          const fuzzy = !titleMatch && !tagMatch && fuzzyMatch(p.name + ' ' + (p.seo_tags || []).join(' '), kw);
          if (titleMatch) score += 100;
          else if (tagMatch) score += 10;
          else if (fuzzy) score += 1;
          else { allMatch = false; break; }
        }
        return allMatch ? score : -1;
      };
      const scored = baseFiltered.map(p => ({ p, score: scoreProduct(p) })).filter(({ score }) => score >= 0);
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
    const tags = lastViewed.seo_tags || [];
    const category = lastViewed.category || '';

    const scoredView = baseFiltered
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

    const top10 = scoredView.filter(p => p._score > 0).sort((a, b) => b._score - a._score).slice(0, 10);
    const top10Ids = new Set(top10.map(p => p.id));
    const rest = sortWithProximityAndDiversity(
      baseFiltered.filter(p => !top10Ids.has(p.id)),
      shopsMap, referenceRegion, mountTimeRef.current
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
      const space = getMarketplaceSpace(p);
      if (!byCategory[space]) byCategory[space] = [];
      byCategory[space].push(p);
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
    navigate(`/product/${product.id}`);
  }, [isAdmin, shopsMap, trackProductView, navigate]);

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    setVisibleCount(24);
    try { sessionStorage.setItem('marketplace_search', value); } catch (_) {}
    if (value.length > 2) trackSearch(value);
  }, [trackSearch]);

  const handleCategorySelect = useCallback((cat) => {
    setSelectedCategory(cat);
    setVisibleCount(24);
    setShowCategories(false);
    try { sessionStorage.setItem('marketplace_category', cat || ''); } catch (_) {}
    if (cat) trackCategoryView(cat);
  }, [trackCategoryView]);

  return (
    <div className="rp-products-page rp-dark-shop flex flex-col min-h-screen pb-20">
      {isAdmin && editingProduct && (
        <ProductFormModal
          product={editingProduct}
          shopId={editingProduct.shop_id}
          open={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          onSuccess={() => {
            setEditingProduct(null);
            queryClient.invalidateQueries({ queryKey: ['products-initial'] });
            queryClient.invalidateQueries({ queryKey: ['products-all'] });
          }}
        />
      )}

      <Helmet>
        <meta name="google-adsense-account" content="ca-pub-2183521622591299" />
      </Helmet>
      <SEO
        title={selectedCategory ? `${selectedCategory} - Marketplace Kairos` : 'Marketplace - Tous les produits | Kairos'}
        description={selectedCategory ? `Découvrez tous nos produits ${selectedCategory} disponibles en Haïti - Marketplace, réservations et billetterie avec Kairos` : 'Découvrez tous les produits disponibles sur Kairos - Mode, Mariage, Fleurs, Electronics et plus. Marketplace, réservations et billetterie en Haïti.'}
        keywords={['marketplace haïti', 'boutique en ligne haïti', 'marketplace, réservations et billetterie', selectedCategory || 'produits'].filter(Boolean)}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />

      <header className="rp-products-header rp-shop-header sticky top-0 z-40">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-black tracking-tight">Kairos</h1>
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

        <nav className="rp-space-tabs px-4 pb-3" aria-label="Grands espaces Kairos">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {MARKETPLACE_SPACES.map((space) => (
              <button
                key={space.id}
                type="button"
                onClick={() => handleCategorySelect(selectedCategory === space.id ? null : space.id)}
                aria-pressed={selectedCategory === space.id}
                className={`shrink-0 rounded-xl px-4 py-3 text-sm font-bold transition ${selectedCategory === space.id ? 'bg-white text-slate-950' : 'bg-[#20242b] text-white hover:bg-[#2a3038]'}`}
              >
                <span className="mr-1.5">{space.icon}</span>{space.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex items-center justify-between px-4 pb-3">
          <span className="text-xs text-slate-400">{selectedCategory || 'Tous les espaces'}</span>
          <Select
            value={selectedRegion}
            onValueChange={(v) => { setSelectedRegion(v === '__all__' ? '' : v); setVisibleCount(60); }}
          >
            <SelectTrigger className="h-9 w-auto min-w-[150px] border-0 bg-[#20242b] px-3 text-xs text-white shadow-none focus:ring-0">
              <MapPin className="mr-1.5 h-4 w-4" fill="currentColor" stroke="none" />
              <SelectValue placeholder="Toutes les zones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les zones</SelectItem>
              {REGIONS.map((region) => <SelectItem key={region} value={region}>{region}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
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
                  onClick={() => setVisibleCount(c => c + 36)}
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
              shopsMap={shopsMap}
              onProductClick={handleProductClick}
            />

            {Object.entries(categoryGroups).map(([cat, products]) => (
              <CategoryRow
                key={`${cat}-${referenceRegion}`}
                title={cat}
                products={products}
                shopsMap={shopsMap}
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
                    onClick={() => setVisibleCount(c => c + 36)}
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

        {showSellerProfilePrompt && (
          <div
            className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/60 p-3 sm:items-center sm:p-6"
            role="presentation"
          >
            <div
              className="my-3 w-full max-w-md rounded-2xl bg-white p-5 text-slate-900 shadow-2xl sm:my-6 sm:p-6"
              role="dialog"
              aria-modal="true"
              aria-labelledby="seller-profile-title"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 id="seller-profile-title" className="text-xl font-black text-slate-900">Finalisez votre profil vendeur</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Ajoutez vos coordonnées pour recevoir les commandes et organiser la livraison.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={dismissSellerProfilePrompt}
                  aria-label="Fermer et rappeler dans une heure"
                  title="Fermer pour une heure"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSellerProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="seller-phone" className="font-bold text-slate-700">Numéro WhatsApp *</Label>
                  <Input
                    id="seller-phone"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="Ex: +509 3000 0000"
                    value={sellerProfile.phone}
                    onChange={(event) => setSellerProfile((current) => ({ ...current, phone: event.target.value }))}
                    className="h-12 bg-white text-black caret-black font-bold text-lg placeholder:text-slate-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="seller-address" className="font-bold text-slate-700">Adresse de livraison / collecte *</Label>
                  <Input
                    id="seller-address"
                    type="text"
                    autoComplete="street-address"
                    placeholder="Rue, zone, repère"
                    value={sellerProfile.address}
                    onChange={(event) => setSellerProfile((current) => ({ ...current, address: event.target.value }))}
                    className="h-12 bg-white text-black caret-black font-bold placeholder:text-slate-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-slate-700">Votre région / commune *</Label>
                  <Select
                    value={sellerProfile.region}
                    onValueChange={(region) => setSellerProfile((current) => ({ ...current, region }))}
                  >
                    <SelectTrigger className="h-12 bg-slate-50 border border-slate-200 text-slate-900 font-bold">
                      <SelectValue placeholder="Sélectionnez votre zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map((region) => <SelectItem key={region} value={region}>{region}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg mt-6"
                  disabled={updateSellerProfileMutation.isPending}
                >
                  {updateSellerProfileMutation.isPending ? 'Enregistrement...' : 'Enregistrer et continuer'}
                </Button>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
