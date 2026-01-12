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

    // Écouter les événements de sélection de catégorie
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

    // Suivi en temps réel de la géolocalisation
    if (navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Géolocalisation refusée:', error);
        },
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

  const handleProfileComplete = (profileType) => {
    setShowProfileModal(false);
    const redirectPages = {
      client: 'Home',
      entreprise: 'EnterpriseDashboard',
      livreur: 'Home'
    };
    window.location.href = createPageUrl(redirectPages[profileType]);
  };

  // Fetch all shops
  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  // Fetch all products
  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => base44.entities.Product.list(),
    enabled: !selectedShop,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  // Filter products by selected article type
  const filteredProductsByType = React.useMemo(() => {
    if (selectedCategory === 'Tout') return allProducts;
    return allProducts.filter(p => p.category === selectedCategory && p.is_available !== false);
  }, [allProducts, selectedCategory]);

  // Get unique shops from filtered products
  const shopsWithProducts = React.useMemo(() => {
    if (selectedCategory === 'Tout') return shops;
    const shopIds = new Set(filteredProductsByType.map(p => p.shop_id));
    return shops.filter(s => shopIds.has(s.id));
  }, [shops, filteredProductsByType, selectedCategory]);

  // Fetch products for selected shop, filtered by category if applicable
  const { data: products = [] } = useQuery({
    queryKey: ['products', selectedShop?.id, selectedCategory],
    queryFn: () => {
      if (selectedCategory === 'Tout') {
        return base44.entities.Product.filter({ shop_id: selectedShop?.id });
      }
      return base44.entities.Product.filter({ 
        shop_id: selectedShop?.id,
        category: selectedCategory
      });
    },
    enabled: !!selectedShop && !selectedShop.is_google_place,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  // Fonction pour rechercher les lieux Google Places
  const fetchGooglePlaces = async (categoryType) => {
    if (!userLocation) {
      toast.error('Veuillez activer la géolocalisation pour voir les commerces à proximité');
      return;
    }

    setLoadingPlaces(true);
    try {
      const response = await base44.functions.invoke('getNearbyPlaces', {
        lat: userLocation.lat,
        lng: userLocation.lng,
        type: categoryType,
        radius: 3000
      });

      setGooglePlaces(response.data.places || []);
    } catch (error) {
      console.error('Erreur Google Places:', error);
      setGooglePlaces([]);
    } finally {
      setLoadingPlaces(false);
    }
  };

  // Combiner boutiques locales filtrées et Google Places
  const allShops = [...shopsWithProducts, ...googlePlaces];

  // Fetch cart items
  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ product, quantity = 1 }) => {
      // Check if item exists in cart
      const existing = cartItems.find(item => item.product_id === product.id);
      const clientPrice = getClientPrice(product);
      
      if (existing) {
        return base44.entities.CartItem.update(existing.id, {
          quantity: existing.quantity + quantity
        });
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
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }
    
    // Show profile completion modal if not set
    if (!user.current_profile) {
      setShowProfileModal(true);
      return;
    }
    
    // Multi-boutique autorisé
    addToCartMutation.mutate({ product, quantity });
  };

    const filteredProducts = products.filter(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Pour l'onglet "Tout", afficher un produit aléatoire par boutique
    const randomProductsByShop = React.useMemo(() => {
      if (selectedCategory !== 'Tout' || selectedShop) return [];

      const productsByShop = {};
      allProducts.forEach(product => {
        if (product.is_available !== false) {
          if (!productsByShop[product.shop_id]) {
            productsByShop[product.shop_id] = [];
          }
          productsByShop[product.shop_id].push(product);
        }
      });

      return Object.values(productsByShop).map(shopProducts => {
        const randomIndex = Math.floor(Math.random() * shopProducts.length);
        return shopProducts[randomIndex];
      });
    }, [allProducts, selectedCategory, selectedShop]);

    // Filtrer les produits aléatoires si recherche active
    const filteredRandomProducts = randomProductsByShop.filter(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

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
      
      {/* Bannière Recrutement */}
      <RecruitmentBanner />
      
      {/* Floating Merchant Banner */}
      <FloatingMerchantBanner user={user} />
      
      {/* Merchant Profile Alert */}
      <MerchantProfileAlert user={user} />
      
      {/* SEO Meta Tags */}
      <SEO 
        title={selectedShop ? selectedShop.company_name : "Commandez et faites-vous livrer rapidement"}
        description={
          selectedShop 
            ? `Commandez chez ${selectedShop.company_name} sur Rapido Presto. Livraison rapide de ${selectedShop.company_category} ${selectedShop.region ? `à ${selectedShop.region}` : 'en Haïti'}.`
            : "Rapido Presto - Plateforme de livraison rapide en Haïti. Restaurants, fastfood, pharmacies, épiceries et plus encore. Commandez en ligne et recevez vos produits rapidement."
        }
        image={selectedShop?.company_logo_url}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />

      {/* Header - Sticky */}
      <div className="sticky top-0 bg-white z-50 shadow-sm">
        <div className="p-4">
          {/* Titre et Login */}
          <div className="flex items-center justify-between mb-3">
            {selectedShop || selectedCategory !== 'Tout' ? (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => {
                  if (selectedShop) {
                    setSelectedShop(null);
                  } else {
                    setSelectedCategory('Tout');
                    setGooglePlaces([]);
                  }
                }}
              >
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
                    {cartCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-orange-500 text-white text-xs">
                        {cartCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              ) : (
                <Button 
                  size="sm"
                  onClick={() => base44.auth.redirectToLogin(window.location.pathname)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  Se connecter
                </Button>
              )}
            </div>
          </div>

          {/* Barre de recherche */}
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
      </div>

      {/* Main Content */}
      <main className="pb-32">
        {searchQuery.trim() ? (
          /* SEARCH RESULTS - Tous les articles */
          <div className="p-4">
            <h2 className="text-lg font-bold text-slate-800 mb-4">
              Résultats pour "{searchQuery}"
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {allProducts
                .filter(p => 
                  p.is_available !== false && 
                  p.name?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(product => {
                  const shop = shops.find(s => s.id === product.shop_id);
                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      shop={shop}
                      onAdd={(p) => {
                        if (!user) {
                          base44.auth.redirectToLogin(window.location.pathname);
                          return;
                        }
                        if (shop) {
                          setSelectedShop(shop);
                          handleAddToCart(p);
                        }
                      }}
                      onClick={() => {
                        if (!user) {
                          base44.auth.redirectToLogin(window.location.pathname);
                          return;
                        }
                        const shop = shops.find(s => s.id === product.shop_id);
                        if (shop) setSelectedShop(shop);
                        setSelectedProduct(product);
                      }}
                    />
                  );
                })}
            </div>
            {allProducts.filter(p => 
              p.is_available !== false && 
              p.name?.toLowerCase().includes(searchQuery.toLowerCase())
            ).length === 0 && (
              <div className="text-center py-12 text-slate-500">
                Aucun article trouvé
              </div>
            )}
          </div>
        ) : selectedCategory === 'Tout' && !selectedShop ? (
          <div>
            {/* Flash Marketing Banner */}
            <FlashBanner />

            {/* Flowers Banner */}
            <FlowersBanner />

            {/* Gift Banner */}
            <GiftBanner />

            {/* Boutons de Types d'Articles (Grid) */}
            <div className="grid grid-cols-2 gap-3 p-4">
              {articleTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    if (!user) {
                      base44.auth.redirectToLogin(window.location.pathname);
                      return;
                    }
                    setSelectedCategory(type.id);
                    setSelectedShop(null);
                    setGooglePlaces([]);
                  }}
                  className={`${type.bgColor} rounded-3xl p-4 flex flex-col items-center transition-transform hover:scale-105 active:scale-95`}
                >
                  <div className="text-4xl mb-1">{type.icon}</div>
                  <span className={`${type.textColor} font-bold text-base text-center`}>
                    {type.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Horizontal Stories */}
            <SmallStories 
              onCategorySelect={(category) => {
                if (!user) {
                  base44.auth.redirectToLogin(window.location.pathname);
                  return;
                }
                setSelectedCategory(category);
                setSelectedShop(null);
              }}
            />

            {/* Bouton Marchand - Visible uniquement pour les entreprises */}
            {user?.profiles?.entreprise?.is_active && (
              <div className="px-4 mb-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                      <span className="text-2xl">🏪</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Vous êtes marchand ?</p>
                      <p className="text-xs text-gray-600">Ajoutez vos produits maintenant</p>
                    </div>
                  </div>
                  <Button 
                    onClick={() => setShowAddProductModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
                  >
                    Vendre mes produits
                  </Button>
                </div>
              </div>
            )}

            {/* Credit Banner */}
            <CreditBanner />

            {/* Deal of the Day - Amazon Style */}
            <div className="px-4 mb-6">
              <div className="bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-2xl p-5 shadow-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                    <span className="text-white text-xs font-bold">⚡ DEAL DU JOUR</span>
                  </div>
                  <span className="text-white/80 text-xs">Se termine dans 4h 23m</span>
                </div>
                <h2 className="text-white text-3xl font-black mb-1">Jusqu'à 60% OFF</h2>
                <p className="text-white/90 font-medium">Sélection spéciale restaurants</p>
              </div>
            </div>

            {/* Trust Badges - Alibaba Style */}
            <div className="px-4 mb-6 grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                <div className="text-2xl mb-1">🚚</div>
                <p className="text-[10px] font-bold text-slate-700">Livraison</p>
                <p className="text-[9px] text-slate-500">Express</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                <div className="text-2xl mb-1">🔒</div>
                <p className="text-[10px] font-bold text-slate-700">Paiement</p>
                <p className="text-[9px] text-slate-500">Sécurisé</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-100 text-center">
                <div className="text-2xl mb-1">⭐</div>
                <p className="text-[10px] font-bold text-slate-700">Service</p>
                <p className="text-[9px] text-slate-500">Premium</p>
              </div>
            </div>

            {/* Top Sellers - Amazon Style Section */}
            <div className="px-4 mb-8">
              <div className="flex items-baseline gap-2 mb-4 pb-2 border-b-2 border-orange-500">
                <h2 className="text-lg font-black text-slate-900">🔥 Meilleures Ventes</h2>
                <span className="text-xs text-slate-500">Mis à jour toutes les heures</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {allProducts.filter(p => p.is_available !== false && p.image_url).slice(0, 4).map((product, idx) => {
                  const shop = shops.find(s => s.id === product.shop_id);
                  return (
                    <div 
                      key={product.id}
                      onClick={() => {
                        if (!user) {
                          base44.auth.redirectToLogin(window.location.pathname);
                          return;
                        }
                        if (shop) setSelectedShop(shop);
                        setSelectedProduct(product);
                      }}
                      className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    >
                      <div className="relative">
                        <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full z-10">
                          #{idx + 1}
                        </div>
                        <div className="aspect-square bg-slate-50">
                          <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} />
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="text-xs text-slate-700 font-medium line-clamp-2 h-8 mb-2">{product.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-orange-600">{getClientPrice(product)} HTG</span>
                          <Button 
                            size="sm"
                            className="h-7 bg-orange-500 hover:bg-orange-600 text-white text-[10px] px-3"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!user) {
                                base44.auth.redirectToLogin(window.location.pathname);
                                return;
                              }
                              if (shop) {
                                setSelectedShop(shop);
                                handleAddToCart(product);
                              }
                            }}
                          >
                            Ajouter
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION "RECOMMANDE POUR VOUS" MODIFIÉE */}
            <RecommendedSection 
              allProducts={allProducts} 
              shops={shops}
              user={user}
              setSelectedShop={setSelectedShop}
              setSelectedProduct={setSelectedProduct}
              handleAddToCart={handleAddToCart}
              getClientPrice={getClientPrice}
              base44={base44}
            />
          </div>
        ) : selectedCategory !== 'Tout' && !selectedShop ? (
          /* TWO-PANE LAYOUT pour catégorie sélectionnée */
          <div className="flex h-[calc(100vh-140px)] overflow-hidden">
            {/* SIDEBAR - Liste des boutiques */}
            <aside className="w-[15%] min-w-[120px] border-r bg-slate-50 overflow-y-auto">
              <div className="p-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 px-2">
                  Boutiques
                </h3>
                {loadingPlaces && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-xs text-slate-500 mt-2">Recherche...</p>
                  </div>
                )}
                {shopsWithProducts.map(shop => (
                  <button
                    key={shop.id}
                    onClick={() => {
                      if (!user) {
                        base44.auth.redirectToLogin(window.location.pathname);
                        return;
                      }
                      setSelectedShop(shop);
                    }}
                    className="w-full flex flex-col items-center mb-4 p-3 rounded-2xl hover:bg-white transition-colors cursor-pointer group"
                  >
                    <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 overflow-hidden group-hover:scale-110 transition-transform">
                      {shop.company_logo_url ? (
                        <img src={shop.company_logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-orange-400">
                          {shop.company_name?.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-center font-bold text-slate-700 leading-tight">
                      {shop.company_name}
                    </span>
                  </button>
                ))}
                {googlePlaces.map(place => (
                  <button
                    key={place.id}
                    onClick={() => {
                      if (!user) {
                        base44.auth.redirectToLogin(window.location.pathname);
                        return;
                      }
                      setSelectedShop(place);
                    }}
                    className="w-full flex flex-col items-center mb-4 p-3 rounded-2xl hover:bg-white transition-colors cursor-pointer group"
                  >
                    <div className="w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 overflow-hidden group-hover:scale-110 transition-transform border-2 border-blue-200">
                      {place.company_logo_url ? (
                        <img src={place.company_logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">🏪</span>
                      )}
                    </div>
                    <span className="text-[10px] text-center font-bold text-blue-600 leading-tight">
                      {place.company_name}
                    </span>
                  </button>
                ))}
                {shopsWithProducts.length === 0 && !loadingPlaces && (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Aucune boutique avec ce type d'article
                  </div>
                )}
              </div>
            </aside>

            {/* MAIN CONTENT - Carte + Liste des Google Places */}
            <main className="flex-1 overflow-hidden flex flex-col">
              {googlePlaces.length > 0 ? (
                <>
                  {/* Carte Interactive (35% de l'écran) */}
                  <div className="h-[35vh] w-full shadow-lg relative">
                    <StoreMapView
                      stores={[...shops, ...googlePlaces]}
                      userLocation={userLocation}
                      onStoreSelect={(shop) => {
                        if (!user) {
                          base44.auth.redirectToLogin(window.location.pathname);
                          return;
                        }
                        setSelectedShop(shop);
                      }}
                    />
                  </div>

                  {/* Liste défilante (65% de l'écran) */}
                  <div className="flex-1 overflow-y-auto rounded-t-3xl -mt-4 bg-white z-10 p-4 shadow-xl">
                    <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-black text-slate-800">
                        📍 Boutiques à proximité
                      </h3>
                      {user?.profiles?.entreprise?.is_active && (
                        <Button 
                          onClick={() => setShowAddProductModal(true)}
                          variant="outline" 
                          size="sm"
                          className="border-blue-200 text-blue-600 hover:bg-blue-50 rounded-full text-xs"
                        >
                          Vendre mes produits
                        </Button>
                      )}
                    </div>
                    <div className="flex flex-col gap-3">
                      {googlePlaces.map(place => (
                        <GooglePlaceCard
                          key={place.id}
                          place={place}
                          userLocation={userLocation}
                          onClick={() => {
                            if (!user) {
                              base44.auth.redirectToLogin(window.location.pathname);
                              return;
                            }
                            setSelectedShop(place);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-full p-4 bg-slate-50">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🏪</div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">
                      {selectedCategory}
                    </h2>
                    <p className="text-slate-500 mb-4">
                      {shopsWithProducts.length > 0 
                        ? 'Sélectionnez une boutique pour voir les produits'
                        : 'Aucun article de ce type disponible'}
                    </p>
                    {user?.profiles?.entreprise?.is_active && (
                      <Button 
                        onClick={() => setShowAddProductModal(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6"
                      >
                        Vendre mes produits
                      </Button>
                    )}
                  </div>
                </div>
              )}
              </main>
              </div>
              ) : (
          /* TWO-PANE LAYOUT avec boutique sélectionnée */
          <div className="flex h-[calc(100vh-140px)] overflow-hidden">
            {/* SIDEBAR - Liste des boutiques */}
            <aside className="w-[15%] min-w-[120px] border-r bg-slate-50 overflow-y-auto">
              <div className="p-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 px-2">
                  Boutiques
                </h3>
                {loadingPlaces && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-xs text-slate-500 mt-2">Recherche...</p>
                  </div>
                )}
                {shopsWithProducts.map(shop => (
                  <button
                    key={shop.id}
                    onClick={() => {
                      if (!user) {
                        base44.auth.redirectToLogin(window.location.pathname);
                        return;
                      }
                      setSelectedShop(shop);
                    }}
                    className={`w-full flex flex-col items-center mb-4 p-3 rounded-2xl transition-colors cursor-pointer group ${
                      selectedShop?.id === shop.id ? 'bg-white shadow-md' : 'hover:bg-white'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 overflow-hidden transition-transform ${
                      selectedShop?.id === shop.id ? 'scale-110 border-2 border-orange-500' : 'group-hover:scale-110'
                    }`}>
                      {shop.company_logo_url ? (
                        <img src={shop.company_logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-orange-400">
                          {shop.company_name?.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className={`text-[10px] text-center font-bold leading-tight ${
                      selectedShop?.id === shop.id ? 'text-orange-600' : 'text-slate-700'
                    }`}>
                      {shop.company_name}
                    </span>
                  </button>
                ))}
                {googlePlaces.map(place => (
                  <button
                    key={place.id}
                    onClick={() => {
                      if (!user) {
                        base44.auth.redirectToLogin(window.location.pathname);
                        return;
                      }
                      setSelectedShop(place);
                    }}
                    className={`w-full flex flex-col items-center mb-4 p-3 rounded-2xl transition-colors cursor-pointer group ${
                      selectedShop?.id === place.id ? 'bg-white shadow-md' : 'hover:bg-white'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-full bg-white shadow-sm flex items-center justify-center mb-2 overflow-hidden transition-transform ${
                      selectedShop?.id === place.id ? 'scale-110 border-2 border-blue-500' : 'group-hover:scale-110 border-2 border-blue-200'
                    }`}>
                      {place.company_logo_url ? (
                        <img src={place.company_logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">🏪</span>
                      )}
                    </div>
                    <span className={`text-[10px] text-center font-bold leading-tight ${
                      selectedShop?.id === place.id ? 'text-blue-600' : 'text-blue-600'
                    }`}>
                      {place.company_name}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            {/* MAIN CONTENT - Produits de la boutique */}
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 capitalize">
                  {selectedShop.company_name}
                </h2>
                <div className="flex items-center gap-2">
                  {selectedShop.is_google_place && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                      📍 Google Places
                    </span>
                  )}
                  {user?.profiles?.entreprise?.is_active && (
                    <Button 
                      onClick={() => setShowAddProductModal(true)}
                      variant="outline" 
                      size="sm"
                      className="border-blue-200 text-blue-600 hover:bg-blue-50 rounded-full text-xs"
                    >
                      Vendre mes produits
                    </Button>
                  )}
                </div>
              </div>

              {selectedShop.is_google_place ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🏪</div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Commerce Google Places</h3>
                  <p className="text-slate-500 mb-4">{selectedShop.vicinity}</p>
                  <p className="text-sm text-slate-400">
                    Ce commerce n'est pas encore sur Rapido Presto.<br/>
                    Les produits ne sont pas disponibles en ligne.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    shop={selectedShop}
                    onAdd={handleAddToCart}
                    onClick={() => {
                      if (!user) {
                        base44.auth.redirectToLogin(window.location.pathname);
                        return;
                      }
                      setSelectedProduct(product);
                    }}
                  />
                ))}
                </div>
              )}
              {!selectedShop.is_google_place && filteredProducts.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  Aucun article trouvé
                </div>
              )}
            </main>
          </div>
        )}
                </main>



                {/* Panier Flottant */}
                {user && cartCount > 0 && (
                  <div className="fixed bottom-20 left-4 right-4 bg-white rounded-2xl p-4 flex justify-between items-center z-40 shadow-2xl border-2 border-orange-200">
                <div className="flex items-center gap-4">
                <div className="relative border-2 border-slate-200 p-2 rounded-lg bg-white">
                <ShoppingCart className="w-6 h-6 text-orange-500" />
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                {cartCount}
                </span>
                </div>
                <div>
                <p className="text-sm text-slate-500">{cartCount} article{cartCount > 1 ? 's' : ''}</p>
                <p className="text-xl font-bold text-slate-800">
                {cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toFixed(0)} HTG
                </p>
                </div>
                </div>

                <Link to={createPageUrl('Cart')}>
                <Button className="bg-[#25D366] hover:bg-green-600 text-white px-8 py-6 rounded-full font-bold text-lg shadow-xl">
                Voir le panier
                </Button>
                </Link>
                </div>
                )}

                {/* Product Detail Modal */}
                <ProductDetailModal
                  product={selectedProduct}
                  shop={selectedProduct ? shops.find(s => s.id === selectedProduct.shop_id) : null}
                  open={!!selectedProduct}
                  onClose={() => setSelectedProduct(null)}
                  onAddToCart={handleAddToCart}
                  user={user}
                  similarProducts={[]}
                />

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        user={user}
        open={showProfileModal}
        onComplete={handleProfileComplete}
      />

      {/* Product Form Modal */}
      {user?.profiles?.entreprise && (
        <ProductFormModal
          open={showAddProductModal}
          onClose={() => setShowAddProductModal(false)}
          onSubmit={() => {
            queryClient.invalidateQueries(['products']);
            queryClient.invalidateQueries(['all-products']);
            setShowAddProductModal(false);
          }}
          shop={{ id: user.profiles.entreprise.shop_id }}
        />
      )}
      </div>
      );
      }

// Section Recommandé - Style Amazon avec titres et scroll horizontal
function RecommendedSection({ 
  allProducts, 
  shops, 
  user, 
  setSelectedShop, 
  setSelectedProduct, 
  handleAddToCart, 
  getClientPrice,
  base44 
}) {
  const [currentRowIndexes, setCurrentRowIndexes] = useState([0, 0, 0]);
  const [isPaused, setIsPaused] = useState([false, false, false]);
  const rowContainers = [useRef(null), useRef(null), useRef(null)];

  // Générer les rangées de produits avec 50% Makarios Bridal, 50% autres boutiques
  const productRows = React.useMemo(() => {
    // 1. Filtrer les produits qui ont des photos
    const productsWithPhotos = allProducts.filter(p => 
      p.image_url && p.image_url.trim() !== '' && p.is_available !== false
    );
    
    // 2. Séparer les produits de Makarios Bridal des autres boutiques
    const makariosProducts = [];
    const otherProducts = [];
    
    productsWithPhotos.forEach(product => {
      const shop = shops.find(s => s.id === product.shop_id);
      if (shop && shop.company_name && 
          (shop.company_name.toLowerCase().includes('makarios bridal') || 
           shop.company_name.toLowerCase().includes('makarios'))) {
        makariosProducts.push(product);
      } else {
        otherProducts.push(product);
      }
    });
    
    // 3. Créer 3 rangées avec 50% Makarios, 50% autres
    const rows = [];
    const productsPerRow = 15; // Nombre de produits par rangée
    const makariosPerRow = Math.floor(productsPerRow / 2); // 50% arrondi à l'inférieur
    const othersPerRow = productsPerRow - makariosPerRow; // Le reste
    
    for (let i = 0; i < 3; i++) {
      const selectedProducts = [];
      
      // Sélectionner aléatoirement les produits Makarios pour cette rangée
      if (makariosProducts.length > 0) {
        const shuffledMakarios = [...makariosProducts].sort(() => Math.random() - 0.5);
        const count = Math.min(makariosPerRow, shuffledMakarios.length);
        selectedProducts.push(...shuffledMakarios.slice(0, count));
      }
      
      // Sélectionner aléatoirement les produits d'autres boutiques pour cette rangée
      if (otherProducts.length > 0) {
        const shuffledOthers = [...otherProducts].sort(() => Math.random() - 0.5);
        const remainingCount = productsPerRow - selectedProducts.length;
        if (remainingCount > 0) {
          selectedProducts.push(...shuffledOthers.slice(0, Math.min(remainingCount, shuffledOthers.length)));
        }
      }
      
      // Si nous n'avons pas assez de produits, compléter avec ceux de l'autre catégorie
      if (selectedProducts.length < productsPerRow) {
        const neededCount = productsPerRow - selectedProducts.length;
        
        if (makariosProducts.length > 0) {
          // Prendre plus de produits Makarios
          const shuffledMakarios = [...makariosProducts].sort(() => Math.random() - 0.5);
          // Éviter les doublons
          const existingIds = new Set(selectedProducts.map(p => p.id));
          const additionalMakarios = shuffledMakarios
            .filter(p => !existingIds.has(p.id))
            .slice(0, neededCount);
          selectedProducts.push(...additionalMakarios);
        }
        
        if (selectedProducts.length < productsPerRow && otherProducts.length > 0) {
          // Prendre plus d'autres produits
          const neededCount2 = productsPerRow - selectedProducts.length;
          const shuffledOthers = [...otherProducts].sort(() => Math.random() - 0.5);
          const existingIds = new Set(selectedProducts.map(p => p.id));
          const additionalOthers = shuffledOthers
            .filter(p => !existingIds.has(p.id))
            .slice(0, neededCount2);
          selectedProducts.push(...additionalOthers);
        }
      }
      
      // Mélanger les produits pour éviter le regroupement
      const shuffledRow = [...selectedProducts].sort(() => Math.random() - 0.5);
      rows.push(shuffledRow.slice(0, productsPerRow));
    }
    
    return rows;
  }, [allProducts, shops]);

  // Gérer le défilement automatique toutes les 60 secondes
  useEffect(() => {
    const intervals = productRows.map((row, rowIndex) => {
      return setInterval(() => {
        if (!isPaused[rowIndex] && row.length > 0) {
          setCurrentRowIndexes(prev => {
            const newIndexes = [...prev];
            newIndexes[rowIndex] = (newIndexes[rowIndex] + 1) % row.length;
            
            // Faire défiler le conteneur
            if (rowContainers[rowIndex].current) {
              const container = rowContainers[rowIndex].current;
              const scrollAmount = newIndexes[rowIndex] * (170 + 12); // largeur produit + gap
              container.scrollTo({
                left: scrollAmount,
                behavior: 'smooth'
              });
            }
            
            return newIndexes;
          });
        }
      }, 60000); // 60 secondes
    });

    return () => intervals.forEach(interval => clearInterval(interval));
  }, [productRows, isPaused]);

  const handleMouseEnter = (rowIndex) => {
    const newPaused = [...isPaused];
    newPaused[rowIndex] = true;
    setIsPaused(newPaused);
  };

  const handleMouseLeave = (rowIndex) => {
    const newPaused = [...isPaused];
    newPaused[rowIndex] = false;
    setIsPaused(newPaused);
  };

  const handleManualScroll = (rowIndex, direction) => {
    const newIndex = direction === 'next' 
      ? (currentRowIndexes[rowIndex] + 1) % productRows[rowIndex].length
      : (currentRowIndexes[rowIndex] - 1 + productRows[rowIndex].length) % productRows[rowIndex].length;
    
    setCurrentRowIndexes(prev => {
      const newIndexes = [...prev];
      newIndexes[rowIndex] = newIndex;
      return newIndexes;
    });

    if (rowContainers[rowIndex].current) {
      const container = rowContainers[rowIndex].current;
      const scrollAmount = newIndex * (170 + 12);
      container.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  if (productRows[0].length === 0 && productRows[1].length === 0 && productRows[2].length === 0) {
    return null;
  }

  const rowTitles = [
    "Inspiré de vos achats récents",
    "Tendances du moment",
    "Sélection exclusive"
  ];

  return (
    <div className="px-4 mt-8 mb-12">
      <div className="space-y-8">
        {productRows.map((rowProducts, rowIndex) => {
          if (rowProducts.length === 0) return null;
          
          return (
            <div key={rowIndex} className="relative">
              {/* Titre de section - Style Amazon */}
              <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-slate-200">
                <h3 className="text-base font-black text-slate-900">{rowTitles[rowIndex]}</h3>
                <button className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline">
                  Voir tout
                </button>
              </div>
              
              {/* Rangée de produits avec défilement horizontal */}
              <div className="relative overflow-hidden">
                <div 
                  ref={rowContainers[rowIndex]}
                  className="flex overflow-x-auto pb-4 gap-3 scroll-smooth no-scrollbar"
                  style={{ 
                    WebkitOverflowScrolling: 'touch'
                  }}
                >
                  {rowProducts.map((product, productIndex) => {
                    const shop = shops.find(s => s.id === product.shop_id);
                    const isMakarios = shop && shop.company_name && 
                      (shop.company_name.toLowerCase().includes('makarios bridal') || 
                       shop.company_name.toLowerCase().includes('makarios'));
                    
                    return (
                      <div 
                        key={`${product.id}-${productIndex}`}
                        className="flex-shrink-0 w-[155px] snap-start"
                        onClick={() => {
                          if (!user) {
                            base44.auth.redirectToLogin(window.location.pathname);
                            return;
                          }
                          if (shop) setSelectedShop(shop);
                          setSelectedProduct(product);
                        }}
                      >
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-xl hover:border-orange-300 transition-all cursor-pointer group">
                          {/* Image Container */}
                          <div className="relative h-40 overflow-hidden bg-slate-50">
                            {product.image_url ? (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                <span className="text-3xl text-slate-300">🛍️</span>
                              </div>
                            )}
                            
                            {/* Sponsored Badge pour Makarios */}
                            {isMakarios && (
                              <div className="absolute top-2 left-2 bg-purple-600 text-white text-[8px] font-bold px-2 py-0.5 rounded">
                                SPONSORISÉ
                              </div>
                            )}
                          </div>
                          
                          {/* Contenu */}
                          <div className="p-2.5 space-y-1.5">
                            <h4 className="text-xs font-medium text-slate-800 line-clamp-2 h-8 leading-tight group-hover:text-orange-600">
                              {product.name}
                            </h4>
                            
                            <div className="flex items-center gap-1">
                              <div className="flex text-yellow-400">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i} className="text-[10px]">★</span>
                                ))}
                              </div>
                              <span className="text-[9px] text-slate-500">(234)</span>
                            </div>
                            
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base font-black text-slate-900">
                                {getClientPrice(product).toLocaleString()}
                              </span>
                              <span className="text-[9px] text-slate-500">HTG</span>
                            </div>
                            
                            <div className="flex items-center gap-1 text-[9px] text-green-700 font-medium">
                              <span>✓</span> Livraison Express
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation simplifiée */}
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => handleManualScroll(rowIndex, 'prev')}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium hover:underline"
                >
                  ← Précédent
                </button>
                <span className="text-slate-300 text-xs">|</span>
                <button
                  onClick={() => handleManualScroll(rowIndex, 'next')}
                  className="text-blue-600 hover:text-blue-700 text-xs font-medium hover:underline"
                >
                  Suivant →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}