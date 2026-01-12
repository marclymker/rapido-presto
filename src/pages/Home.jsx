import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, ShoppingCart, ArrowLeft } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

import ShopCard from '@/components/ui/ShopCard';
import GooglePlaceCard from '@/components/ui/GooglePlaceCard';
import ProductCard from '@/components/ui/ProductCard';
import ProductDetailModal from '@/components/modals/ProductDetailModal';
import StoreMapView from '@/components/maps/StoreMapView';
import { useAutoRefresh } from '@/components/realtime/useWebSocket';
import RealtimeIndicator from '@/components/realtime/RealtimeIndicator';
import { getClientPrice } from '@/components/utils/priceCalculation';
import ProfileCompletionModal from '@/components/modals/ProfileCompletionModal';
import ProductRecommendations from '@/components/recommendations/ProductRecommendations';
import SEO from '@/components/SEO';
import SmallStories from '@/components/home/SmallStories';
import CreditBanner from '@/components/home/CreditBanner';
import RecruitmentBanner from '@/components/home/RecruitmentBanner';
import ProductFormModal from '@/components/enterprise/modals/ProductFormModal';
import FloatingMerchantBanner from '@/components/home/FloatingMerchantBanner';
import MerchantProfileAlert from '@/components/home/MerchantProfileAlert';
import FlashBanner from '@/components/home/FlashBanner';
import FlowersBanner from '@/components/home/FlowersBanner';
import GiftBanner from '@/components/home/GiftBanner';

export default function Home() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [selectedShop, setSelectedShop] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [googlePlaces, setGooglePlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const queryClient = useQueryClient();

  // État pour la rotation de la section "Meilleures Ventes"
  const [topSellers, setTopSellers] = useState([]);
  
  // Auto-refresh des données
  useAutoRefresh({ 
    queryKey: ['shops'], 
    refetchInterval: 60000,
    enabled: !selectedShop 
  });
  
  useAutoRefresh({ 
    queryKey: ['products'], 
    refetchInterval: 60000,
    enabled: !!selectedShop 
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
    }).catch(() => {
      setUser(null);
    });

    const handleCategorySelect = (e) => {
      setSelectedCategory(e.detail);
      setSelectedShop(null);
      setGooglePlaces([]);
    };

    const handleSearchQuery = (e) => {
      setSearchQuery(e.detail);
    };

    window.addEventListener('selectCategory', handleCategorySelect);
    window.addEventListener('setSearchQuery', handleSearchQuery);

    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => console.log('Géolocalisation refusée:', error),
        { enableHighAccuracy: true }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
        window.removeEventListener('selectCategory', handleCategorySelect);
        window.removeEventListener('setSearchQuery', handleSearchQuery);
      };
    }

    return () => {
      window.removeEventListener('selectCategory', handleCategorySelect);
      window.removeEventListener('setSearchQuery', handleSearchQuery);
    };
  }, []);

  // Fetch all shops
  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
    refetchInterval: 60000
  });

  // Fetch all products
  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => base44.entities.Product.list(),
    enabled: !selectedShop,
    refetchInterval: 60000
  });

  // LOGIQUE : MEILLEURE VENTE (Rotation 30s)
  useEffect(() => {
    const updateTopSellers = () => {
      if (allProducts.length > 0 && shops.length > 0) {
        // Trier les boutiques par popularité (simulée ici par index ou visits si dispo)
        const activeShops = shops.slice(0, 15); 
        const shuffledShops = [...activeShops].sort(() => 0.5 - Math.random()).slice(0, 6);
        
        const newSelection = shuffledShops.map(shop => {
          const shopProducts = allProducts.filter(p => p.shop_id === shop.id && p.is_available !== false);
          return shopProducts[Math.floor(Math.random() * shopProducts.length)];
        }).filter(Boolean);
        
        setTopSellers(newSelection);
      }
    };

    updateTopSellers();
    const interval = setInterval(updateTopSellers, 30000); // 30 secondes
    return () => clearInterval(interval);
  }, [allProducts, shops]);

  const handleProfileComplete = (profileType) => {
    setShowProfileModal(false);
    const redirectPages = { client: 'Home', entreprise: 'EnterpriseDashboard', livreur: 'Home' };
    window.location.href = createPageUrl(redirectPages[profileType]);
  };

  const filteredProductsByType = React.useMemo(() => {
    if (selectedCategory === 'Tout') return allProducts;
    return allProducts.filter(p => p.category === selectedCategory && p.is_available !== false);
  }, [allProducts, selectedCategory]);

  const shopsWithProducts = React.useMemo(() => {
    if (selectedCategory === 'Tout') return shops;
    const shopIds = new Set(filteredProductsByType.map(p => p.shop_id));
    return shops.filter(s => shopIds.has(s.id));
  }, [shops, filteredProductsByType, selectedCategory]);

  const { data: products = [] } = useQuery({
    queryKey: ['products', selectedShop?.id, selectedCategory],
    queryFn: () => {
      if (selectedCategory === 'Tout') return base44.entities.Product.filter({ shop_id: selectedShop?.id });
      return base44.entities.Product.filter({ shop_id: selectedShop?.id, category: selectedCategory });
    },
    enabled: !!selectedShop && !selectedShop.is_google_place
  });

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ product, quantity = 1 }) => {
      const existing = cartItems.find(item => item.product_id === product.id);
      const clientPrice = getClientPrice(product);
      if (existing) {
        return base44.entities.CartItem.update(existing.id, { quantity: existing.quantity + quantity });
      } else {
        return base44.entities.CartItem.create({
          user_id: user.id,
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          quantity: quantity,
          unit_price: clientPrice,
          shop_id: selectedShop.id,
          shop_name: selectedShop.company_name,
          shop_region: selectedShop.region
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Article ajouté au panier');
    }
  });

  const handleAddToCart = (product, quantity = 1) => {
    if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
    if (!user.current_profile) { setShowProfileModal(true); return; }
    addToCartMutation.mutate({ product, quantity });
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // LOGIQUE : CATÉGORIES HORIZONTALES (Filtrées)
  const articleTypes = [
    { id: 'Fastfood', name: 'Fastfood', icon: '🍔', bgColor: 'bg-orange-50', textColor: 'text-orange-800' },
    { id: 'Pour Femme', name: 'Mode Femme', icon: '👗', bgColor: 'bg-purple-50', textColor: 'text-purple-800' },
    { id: 'Boutique Fleurs', name: 'Fleurs', icon: '💐', bgColor: 'bg-pink-50', textColor: 'text-pink-800' },
    { id: 'Mariage', name: 'Mariage', icon: '💍', bgColor: 'bg-rose-50', textColor: 'text-rose-800' },
    { id: 'Pour homme', name: 'Mode Homme', icon: '👔', bgColor: 'bg-blue-50', textColor: 'text-blue-800' },
    { id: 'Bébé', name: 'Bébé', icon: '👶', bgColor: 'bg-yellow-50', textColor: 'text-yellow-800' }
  ];

  return (
    <div className="min-h-screen bg-white pb-20">
      <Helmet>
        <meta name="google-adsense-account" content="ca-pub-2183521622591299" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2183521622591299" crossOrigin="anonymous"></script>
      </Helmet>
      
      <RecruitmentBanner />
      <FloatingMerchantBanner user={user} />
      <MerchantProfileAlert user={user} />
      
      <SEO 
        title={selectedShop ? selectedShop.company_name : "Commandez et faites-vous livrer rapidement"}
        description="Rapido Presto - Livraison rapide en Haïti."
      />

      {/* Header */}
      <div className="sticky top-0 bg-white z-50 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          {selectedShop || selectedCategory !== 'Tout' ? (
            <Button variant="ghost" size="icon" onClick={() => { setSelectedShop(null); setSelectedCategory('Tout'); }}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          ) : (
            <h1 className="text-xl font-bold text-orange-500">Rapido Presto</h1>
          )}
          <div className="flex items-center gap-2">
            {user ? (
              <Link to={createPageUrl('Cart')}>
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="w-5 h-5" />
                  {cartCount > 0 && <Badge className="absolute -top-1 -right-1 h-5 w-5 bg-orange-500 text-white text-xs">{cartCount}</Badge>}
                </Button>
              </Link>
            ) : (
              <Button size="sm" onClick={() => base44.auth.redirectToLogin(window.location.pathname)} className="bg-orange-500 hover:bg-orange-600">Se connecter</Button>
            )}
          </div>
        </div>
        <div className="flex items-center bg-slate-100 rounded-full px-4 py-3">
          <Search className="text-slate-400 mr-2 w-5 h-5" />
          <input 
            type="text" 
            placeholder='Rechercher "pizza"...' 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent outline-none w-full text-slate-700"
          />
        </div>
      </div>

      <main className="pb-32">
        {selectedCategory === 'Tout' && !selectedShop && !searchQuery ? (
          <div>
            <FlashBanner />
            <FlowersBanner />
            <GiftBanner />

            {/* Catégories Horizontales (SANS Pharmacie, Resto, etc) */}
            <div className="grid grid-cols-2 gap-3 p-4">
              {articleTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => { setSelectedCategory(type.id); }}
                  className={`${type.bgColor} rounded-3xl p-4 flex flex-col items-center transition-transform hover:scale-105`}
                >
                  <div className="text-4xl mb-1">{type.icon}</div>
                  <span className={`${type.textColor} font-bold text-base`}>{type.name}</span>
                </button>
              ))}
            </div>

            <SmallStories onCategorySelect={setSelectedCategory} />
            <CreditBanner />

            {/* SECTION MEILLEURES VENTES (Rotation 30s - 6 articles) */}
            <div className="px-4 mb-8">
              <div className="flex items-baseline gap-2 mb-4 pb-2 border-b-2 border-orange-500">
                <h2 className="text-lg font-black text-slate-900">🔥 Meilleures Ventes</h2>
                <span className="text-xs text-slate-500">Actualisé en temps réel</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {topSellers.map((product, idx) => (
                  <div 
                    key={product.id + idx}
                    onClick={() => { setSelectedProduct(product); setSelectedShop(shops.find(s => s.id === product.shop_id)); }}
                    className="bg-white rounded-xl border border-slate-200 overflow-hidden cursor-pointer"
                  >
                    <div className="aspect-square bg-slate-50 relative">
                      <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} />
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium line-clamp-1">{product.name}</p>
                      <p className="text-sm font-black text-orange-600">{getClientPrice(product)} HTG</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION HISTORIQUE ET CLIENTS ONT ACHETÉ */}
            <div className="px-4 mb-8">
              <h2 className="text-lg font-bold mb-4">Inspiré de votre historique</h2>
              <ProductRecommendations type="history" allProducts={allProducts} shops={shops} />
            </div>

            <div className="px-4 mb-8">
              <h2 className="text-lg font-bold mb-4">Les clients ont aussi acheté</h2>
              <div className="grid grid-cols-2 gap-3">
                {allProducts.sort(() => 0.5 - Math.random()).slice(0, 4).map(product => (
                  <ProductCard key={product.id} product={product} shop={shops.find(s => s.id === product.shop_id)} onAdd={handleAddToCart} />
                ))}
              </div>
            </div>

            {/* SECTION RECOMMANDÉ POUR VOUS (3 LIGNES SPÉCIFIQUES) */}
            <div className="px-4 mt-8">
              <h2 className="text-xl font-black text-slate-900 mb-4 pb-2 border-b-2 border-orange-500">Recommandé pour vous</h2>
              
              {/* Ligne 1: MAKARIOS BRIDAL */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase">Collection Makarios Bridal</h3>
                <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar">
                  {allProducts.filter(p => shops.find(s => s.id === p.shop_id)?.company_name?.toUpperCase().includes('MAKARIOS')).map(p => (
                    <div key={p.id} className="min-w-[140px] w-[140px]"><ProductCard product={p} shop={shops.find(s => s.id === p.shop_id)} onAdd={handleAddToCart} /></div>
                  ))}
                </div>
              </div>

              {/* Ligne 2: FLEURS (Aléatoire) */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase">Nos plus belles fleurs</h3>
                <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar">
                  {allProducts.filter(p => p.category === 'Boutique Fleurs').sort(() => 0.5 - Math.random()).map(p => (
                    <div key={p.id} className="min-w-[140px] w-[140px]"><ProductCard product={p} shop={shops.find(s => s.id === p.shop_id)} onAdd={handleAddToCart} /></div>
                  ))}
                </div>
              </div>

              {/* Ligne 3: AUTRES BOUTIQUES (Sauf Makarios et Fleurs) */}
              <div className="mb-6">
                <h3 className="text-sm font-bold text-slate-500 mb-2 uppercase">Découvertes</h3>
                <div className="flex overflow-x-auto gap-4 pb-2 no-scrollbar">
                  {allProducts.filter(p => {
                    const s = shops.find(sh => sh.id === p.shop_id);
                    return !s?.company_name?.toUpperCase().includes('MAKARIOS') && p.category !== 'Boutique Fleurs';
                  }).sort(() => 0.5 - Math.random()).slice(0, 10).map(p => (
                    <div key={p.id} className="min-w-[140px] w-[140px]"><ProductCard product={p} shop={shops.find(s => s.id === p.shop_id)} onAdd={handleAddToCart} /></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VUE CATÉGORIE FILTRÉE AVEC BOUTONS VERTICAUX RÉDUITS */
          <div className="flex h-[calc(100vh-140px)] overflow-hidden">
            <aside className="w-[12%] min-w-[70px] border-r bg-slate-50 overflow-y-auto">
              <div className="p-1">
                {shopsWithProducts.map(shop => (
                  <button
                    key={shop.id}
                    onClick={() => setSelectedShop(shop)}
                    className="w-full flex flex-col items-center mb-3 p-1 rounded-lg hover:bg-white transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden border">
                      {shop.company_logo_url ? <img src={shop.company_logo_url} className="w-full h-full object-cover" /> : <span className="text-xs">{shop.company_name?.charAt(0)}</span>}
                    </div>
                    <span className="text-[8px] text-center font-bold text-slate-600 truncate w-full px-1">{shop.company_name}</span>
                  </button>
                ))}
              </div>
            </aside>

            <main className="flex-1 overflow-y-auto p-4">
              {selectedShop ? (
                <div className="grid grid-cols-2 gap-4">
                  {products.map(p => <ProductCard key={p.id} product={p} shop={selectedShop} onAdd={handleAddToCart} />)}
                </div>
              ) : (
                <div className="text-center py-20 text-slate-400">Sélectionnez une boutique à gauche</div>
              )}
            </main>
          </div>
        )}
      </main>

      {/* Modals & Panier */}
      {user && cartCount > 0 && (
        <div className="fixed bottom-20 left-4 right-4 bg-white rounded-2xl p-4 flex justify-between items-center z-40 shadow-2xl border-2 border-orange-200">
          <div className="flex items-center gap-4">
            <div className="relative border-2 p-2 rounded-lg"><ShoppingCart className="w-6 h-6 text-orange-500" /><span className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">{cartCount}</span></div>
            <p className="text-xl font-bold">{cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)} HTG</p>
          </div>
          <Link to={createPageUrl('Cart')}><Button className="bg-[#25D366] text-white px-6 rounded-full font-bold">Voir le panier</Button></Link>
        </div>
      )}

      <ProductDetailModal product={selectedProduct} open={!!selectedProduct} onClose={() => setSelectedProduct(null)} onAddToCart={handleAddToCart} user={user} />
      <ProfileCompletionModal user={user} open={showProfileModal} onComplete={handleProfileComplete} />
    </div>
  );
}