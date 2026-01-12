import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, ShoppingCart, ArrowLeft, Menu, MapPin, Star, ChevronRight } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Helmet } from 'react-helmet-async';

// Composants internes
import ShopCard from '@/components/ui/ShopCard';
import GooglePlaceCard from '@/components/ui/GooglePlaceCard';
import ProductCard from '@/components/ui/ProductCard';
import ProductDetailModal from '@/components/modals/ProductDetailModal';
import StoreMapView from '@/components/maps/StoreMapView';
import { useAutoRefresh } from '@/components/realtime/useWebSocket';
import { getClientPrice } from '@/components/utils/priceCalculation';
import ProfileCompletionModal from '@/components/modals/ProfileCompletionModal';
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
  const [googlePlaces, setGooglePlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const queryClient = useQueryClient();
  
  // --- CONFIGURATION CATÉGORIES (Modifiée) ---
  // Suppression de: Fastfood, Pharmacie, Cafe, Restaurant, Epicerie
  const articleTypes = [
    { id: 'Pour Femme', name: 'Mode Femme', icon: '👗' },
    { id: 'Boutique Fleurs', name: 'Fleurs', icon: '💐' },
    { id: 'Mariage', name: 'Mariage', icon: '💍' },
    { id: 'Pour homme', name: 'Mode Homme', icon: '👔' },
    { id: 'Bébé', name: 'Bébé', icon: '👶' },
    { id: 'Maison', name: 'Maison & Déco', icon: '🏠' }
  ];

  // --- LOGIQUE MÉTIER ---

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
    base44.auth.me().then(u => setUser(u)).catch(() => setUser(null));

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
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
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

  const handleProfileComplete = (profileType) => {
    setShowProfileModal(false);
    const redirectPages = {
      client: 'Home',
      entreprise: 'EnterpriseDashboard',
      livreur: 'Home'
    };
    window.location.href = createPageUrl(redirectPages[profileType]);
  };

  // Queries
  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
    refetchInterval: 60000
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => base44.entities.Product.list(),
    enabled: !selectedShop,
    refetchInterval: 60000
  });

  // Filtrage pour la vue "Tout"
  const filteredProductsByType = React.useMemo(() => {
    if (selectedCategory === 'Tout') return allProducts;
    return allProducts.filter(p => p.category === selectedCategory && p.is_available !== false);
  }, [allProducts, selectedCategory]);

  const shopsWithProducts = React.useMemo(() => {
    if (selectedCategory === 'Tout') return shops;
    const shopIds = new Set(filteredProductsByType.map(p => p.shop_id));
    return shops.filter(s => shopIds.has(s.id));
  }, [shops, filteredProductsByType, selectedCategory]);

  // Produits de la boutique sélectionnée
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
    refetchInterval: 60000
  });

  // --- NOUVELLE LOGIQUE : GROUPER PAR BOUTIQUE POUR UNE CATÉGORIE ---
  const productsByShopInCategory = React.useMemo(() => {
    if (selectedCategory === 'Tout' || selectedShop) return [];

    return shopsWithProducts.map(shop => {
      // Filtrer les produits de cette boutique qui correspondent à la catégorie
      const shopProducts = allProducts.filter(p => 
        p.shop_id === shop.id && 
        p.category === selectedCategory && 
        p.is_available !== false
      );
      
      return {
        shop,
        products: shopProducts
      };
    }).filter(group => group.products.length > 0); // Garder uniquement si produits dispo
  }, [selectedCategory, selectedShop, shopsWithProducts, allProducts]);

  // Google Places (Seulement si pertinent pour les catégories restantes)
  const fetchGooglePlaces = async (categoryType) => {
    if (!userLocation) {
      toast.error('Activez la géolocalisation');
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
      setGooglePlaces([]);
    } finally {
      setLoadingPlaces(false);
    }
  };

  // Panier
  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ product, quantity = 1 }) => {
      const existing = cartItems.find(item => item.product_id === product.id);
      const clientPrice = getClientPrice(product);
      
      // On s'assure d'avoir l'info de la boutique
      const productShop = shops.find(s => s.id === product.shop_id);
      
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
          shop_id: productShop?.id || selectedShop?.id,
          shop_name: productShop?.company_name || selectedShop?.company_name,
          shop_region: productShop?.region || selectedShop?.region
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Ajouté au panier');
    }
  });

  const handleAddToCart = (product, quantity = 1) => {
    if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
    if (!user.current_profile) { setShowProfileModal(true); return; }
    addToCartMutation.mutate({ product, quantity });
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Thème
  const theme = {
    darkBlue: '#232F3E',
    lightBlue: '#37475A',
    amazonOrange: '#FF9900',
    linkBlue: '#007185',
    bgGray: '#EAEDED'
  };

  return (
    <div className="min-h-screen pb-20 font-sans" style={{ backgroundColor: theme.bgGray }}>
      <Helmet>
        <meta name="google-adsense-account" content="ca-pub-2183521622591299" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2183521622591299" crossOrigin="anonymous"></script>
      </Helmet>
      
      {/* HEADER FIXE */}
      <header className="sticky top-0 z-50 flex flex-col shadow-md">
        <div className="text-white px-4 py-2 flex items-center gap-4" style={{ backgroundColor: theme.darkBlue }}>
            <div className="flex-shrink-0 flex items-center">
               {selectedShop || selectedCategory !== 'Tout' ? (
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="text-white hover:bg-white/10"
                  onClick={() => {
                    if (selectedShop) {
                      setSelectedShop(null);
                    } else {
                      setSelectedCategory('Tout');
                      setGooglePlaces([]);
                    }
                  }}
                >
                  <ArrowLeft className="w-6 h-6" />
                </Button>
              ) : (
                <div className="flex flex-col leading-tight cursor-pointer" onClick={() => window.location.reload()}>
                    <span className="text-xl font-bold tracking-tight">Rapido</span>
                    <span className="text-sm text-orange-400 -mt-1 ml-4">Presto</span>
                </div>
              )}
            </div>

            {/* Barre de Recherche */}
            <div className="flex-1 max-w-3xl mx-auto hidden md:flex h-10 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-orange-500">
                <div className="bg-gray-100 text-gray-600 px-3 flex items-center text-xs border-r border-gray-300 cursor-pointer hover:bg-gray-200">
                    {selectedCategory === 'Tout' ? 'Tout' : selectedCategory}
                </div>
                <input 
                    type="text" 
                    placeholder="Rechercher..." 
                    className="flex-1 px-4 text-black outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="px-5 hover:bg-orange-600 transition-colors" style={{ backgroundColor: theme.amazonOrange }}>
                    <Search className="w-5 h-5 text-gray-900" />
                </button>
            </div>

            {/* Version Mobile Search */}
            <div className="flex-1 md:hidden">
                 <div className="flex items-center bg-white rounded-md px-2 py-1.5">
                    <Search className="text-gray-500 w-4 h-4 mr-2" />
                    <input 
                      type="text" 
                      placeholder="Rechercher..." 
                      className="bg-transparent outline-none w-full text-black text-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                 </div>
            </div>

            {/* Compte & Panier */}
            <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">
                <div className="hidden lg:flex items-end flex-col text-xs leading-none cursor-pointer hover:outline outline-1 outline-white p-1 rounded-sm">
                    <span className="text-gray-300 text-[10px]">Livrer à</span>
                    <div className="flex items-center font-bold">
                        <MapPin className="w-3 h-3 mr-1" />
                        {userLocation ? 'Ma Position' : 'Haïti'}
                    </div>
                </div>

                <div 
                    className="cursor-pointer hover:outline outline-1 outline-white p-1 rounded-sm"
                    onClick={() => !user && base44.auth.redirectToLogin(window.location.pathname)}
                >
                    <div className="text-[10px] text-gray-300">Bonjour, {user ? user.first_name : 'Identifiez-vous'}</div>
                    <div className="text-xs font-bold md:text-sm flex items-center">Compte</div>
                </div>

                <Link to={createPageUrl('Cart')} className="relative flex items-end cursor-pointer hover:outline outline-1 outline-white p-1 rounded-sm">
                    <div className="relative">
                        <ShoppingCart className="w-7 h-7 md:w-8 md:h-8" />
                        <span 
                            className="absolute -top-1 -right-1 md:top-0 md:right-0 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold text-gray-900"
                            style={{ backgroundColor: theme.amazonOrange }}
                        >
                            {cartCount}
                        </span>
                    </div>
                    <span className="hidden md:block font-bold text-sm ml-1 mb-1">Panier</span>
                </Link>
            </div>
        </div>

        {/* Menu Catégories (Sous-header) */}
        <nav className="text-white text-sm px-4 py-2 flex items-center gap-4 overflow-x-auto no-scrollbar whitespace-nowrap" style={{ backgroundColor: theme.lightBlue }}>
            <div className="flex items-center font-bold gap-1 cursor-pointer hover:text-white/80" onClick={() => setSelectedCategory('Tout')}>
                <Menu className="w-5 h-5" />
                <span>Toutes</span>
            </div>
            {articleTypes.map((type) => (
                <button 
                    key={type.id}
                    onClick={() => {
                        if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
                        setSelectedCategory(type.id);
                        setSelectedShop(null);
                        setGooglePlaces([]);
                    }}
                    className={`hover:outline outline-1 outline-white px-2 py-1 rounded-sm transition-colors ${selectedCategory === type.id ? 'font-bold underline text-orange-400' : ''}`}
                >
                    {type.name}
                </button>
            ))}
        </nav>
      </header>
      
      {/* Bannières Globales */}
      <div className="max-w-[1500px] mx-auto">
        <RecruitmentBanner />
        <FloatingMerchantBanner user={user} />
        <MerchantProfileAlert user={user} />
      </div>

      <SEO 
        title={selectedShop ? selectedShop.company_name : "Rapido Presto - Shopping en ligne"}
        description="La meilleure plateforme e-commerce en Haïti."
        image={selectedShop?.company_logo_url}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />

      <main className="max-w-[1500px] mx-auto p-2 md:p-4 pb-32">
        
        {/* --- CAS 1: RECHERCHE ACTIVE --- */}
        {searchQuery.trim() ? (
          <div className="bg-white p-4 rounded shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4 border-b pb-2">
              Résultats pour "{searchQuery}"
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {allProducts
                .filter(p => p.is_available !== false && p.name?.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(product => {
                  const shop = shops.find(s => s.id === product.shop_id);
                  return (
                    <div className="hover:scale-[1.01] transition-transform" key={product.id}>
                        <ProductCard
                          product={product}
                          shop={shop}
                          onAdd={(p) => {
                            if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
                            if (shop) { setSelectedShop(shop); handleAddToCart(p); }
                          }}
                          onClick={() => {
                            if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
                            const shop = shops.find(s => s.id === product.shop_id);
                            if (shop) setSelectedShop(shop);
                            setSelectedProduct(product);
                          }}
                        />
                    </div>
                  );
                })}
            </div>
             {allProducts.filter(p => p.is_available !== false && p.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <p>Aucun article trouvé.</p>
                </div>
             )}
          </div>

        /* --- CAS 2: PAGE D'ACCUEIL (Dashboard) --- */
        ) : selectedCategory === 'Tout' && !selectedShop ? (
          <div className="space-y-6">
            
            <div className="grid gap-4">
                <FlashBanner />
                <div className="hidden md:grid grid-cols-2 gap-4">
                    <FlowersBanner />
                    <GiftBanner />
                </div>
            </div>

            {/* Grille Catégories (Sans Food/Pharma) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {articleTypes.map((type) => (
                <div 
                    key={type.id} 
                    className="bg-white p-4 cursor-pointer hover:shadow-lg transition-shadow flex flex-col justify-between h-36 rounded-md border border-gray-100"
                    onClick={() => {
                        if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
                        setSelectedCategory(type.id);
                        setSelectedShop(null);
                        setGooglePlaces([]);
                    }}
                >
                   <h3 className="font-bold text-base text-slate-900 leading-tight mb-2">{type.name}</h3>
                   <div className="flex-1 flex items-center justify-center text-4xl">{type.icon}</div>
                </div>
              ))}
            </div>

            <SmallStories onCategorySelect={(c) => setSelectedCategory(c)} />

            {user?.profiles?.entreprise?.is_active && (
                <div className="bg-white p-4 border rounded-lg flex items-center justify-between shadow-sm border-l-4 border-l-orange-500">
                    <div>
                      <h3 className="font-bold text-lg">Espace Vendeur</h3>
                      <p className="text-sm text-gray-600">Gérez votre boutique</p>
                    </div>
                    <Button 
                        onClick={() => setShowAddProductModal(true)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-black border border-yellow-500 shadow-sm"
                    >
                        Vendre
                    </Button>
                </div>
            )}

            <CreditBanner />

            {/* Deal du Jour */}
            <div className="bg-white p-4 border border-gray-200 rounded-sm">
                 <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold">Offre du jour</h2>
                    <span className="text-xs text-blue-600 hover:underline cursor-pointer">Voir tout</span>
                 </div>
                 <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/3 bg-gray-100 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        <Badge className="bg-red-600 text-white mb-2">-45%</Badge>
                        <h3 className="text-2xl font-black text-slate-800 mb-1">Mariage & Events</h3>
                        <Button className="w-full mt-4 bg-yellow-400 text-black">Voir l'offre</Button>
                    </div>
                    <div className="flex-1 grid grid-cols-3 gap-4">
                        <div className="border p-4 text-center bg-gray-50"><span className="text-2xl">🚚</span><p className="text-xs font-bold mt-1">Rapide</p></div>
                        <div className="border p-4 text-center bg-gray-50"><span className="text-2xl">🔒</span><p className="text-xs font-bold mt-1">Sécurisé</p></div>
                        <div className="border p-4 text-center bg-gray-50"><span className="text-2xl">⭐</span><p className="text-xs font-bold mt-1">Top Qualité</p></div>
                    </div>
                 </div>
            </div>

            {/* Meilleures Ventes */}
            <div className="bg-white p-4 relative rounded-sm">
                <h2 className="text-xl font-bold mb-4">Meilleures Ventes</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-0 border-t border-l border-gray-200">
                {allProducts.filter(p => p.is_available !== false && p.image_url).slice(0, 5).map((product, idx) => {
                  const shop = shops.find(s => s.id === product.shop_id);
                  const price = getClientPrice(product);
                  const isMakarios = shop?.company_name?.toLowerCase().includes('makarios');

                  return (
                    <div 
                      key={product.id}
                      onClick={() => {
                        if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
                        if (shop) setSelectedShop(shop);
                        setSelectedProduct(product);
                      }}
                      className="bg-white p-4 border-r border-b border-gray-200 hover:shadow-xl hover:z-10 relative cursor-pointer group transition-all"
                    >
                      <div className="absolute top-0 left-0 bg-[#C45500] text-white text-xs px-2 py-1 z-20 font-bold rounded-br-md">#{idx + 1}</div>
                      <div className="relative h-40 mb-3 overflow-hidden">
                        <img src={product.image_url} className="w-full h-full object-contain group-hover:scale-105 transition-transform" alt={product.name} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-[#007185] group-hover:text-[#C7511F] hover:underline leading-snug line-clamp-2 h-9 overflow-hidden">{product.name}</p>
                        <div className="flex items-center gap-1">
                             <div className="flex text-orange-400 text-xs"><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current"/><Star className="w-3 h-3 fill-current opacity-50"/></div>
                             <span className="text-xs text-blue-600">104</span>
                        </div>
                        <div className="flex items-start mt-1 font-medium">
                            <span className="text-xs relative top-0.5">$</span>
                            <span className="text-lg leading-none">{Math.floor(price)}</span>
                            <span className="text-xs relative top-0.5">{(price % 1).toFixed(2).substring(2)}</span>
                            <span className="text-gray-500 text-xs self-center ml-1">HTG</span>
                        </div>
                        {isMakarios && <span className="text-[10px] text-gray-500 block">Sponsorisé</span>}
                        <Button 
                            className="w-full mt-2 h-7 text-xs bg-[#FFD814] hover:bg-[#F7CA00] text-black border border-[#FCD200] rounded-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
                              if (shop) { setSelectedShop(shop); handleAddToCart(product); }
                            }}
                        >
                            Ajouter
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <RecommendedSection 
              allProducts={allProducts} 
              shops={shops}
              user={user}
              setSelectedShop={setSelectedShop}
              setSelectedProduct={setSelectedProduct}
              getClientPrice={getClientPrice}
            />
          </div>

        /* --- CAS 3: NAVIGATION PAR CATÉGORIE (CLASSIFIÉ PAR BOUTIQUE) --- */
        ) : (
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            
            {/* SIDEBAR NAVIGATION RAPIDE */}
            <aside className="hidden md:block w-64 flex-shrink-0 bg-white p-4 h-fit border-r border-gray-200 sticky top-20 rounded-sm">
               <div className="mb-4">
                    <h3 className="font-bold text-lg mb-2 text-orange-500">{selectedCategory}</h3>
                    
                    {!selectedShop && (
                        <>
                            <p className="text-xs text-gray-500 mb-4">{productsByShopInCategory.length} vendeurs trouvés</p>
                            <h4 className="font-bold text-sm mb-2">Vendeurs</h4>
                            <div className="space-y-1 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                {productsByShopInCategory.map(({ shop }) => (
                                    <div 
                                        key={shop.id}
                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 p-2 rounded text-sm"
                                        onClick={() => {
                                            document.getElementById(`shop-section-${shop.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }}
                                    >
                                        <ChevronRight className="w-3 h-3 text-gray-400" />
                                        <span className="truncate">{shop.company_name}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {selectedShop && (
                        <div className="mt-4">
                            <Button 
                                variant="outline" 
                                className="w-full text-xs"
                                onClick={() => setSelectedShop(null)}
                            >
                                <ArrowLeft className="w-3 h-3 mr-2" /> Retour liste
                            </Button>
                        </div>
                    )}
               </div>
            </aside>

            {/* CONTENU PRINCIPAL */}
            <main className="flex-1 min-w-0">
               
               {/* 3.1: UNE BOUTIQUE SÉLECTIONNÉE */}
               {selectedShop ? (
                   <div className="bg-white p-4 rounded-lg shadow-sm min-h-[500px]">
                        <div className="flex items-center gap-4 mb-6 border-b pb-4">
                            <div className="w-16 h-16 rounded-full border-2 border-orange-100 overflow-hidden">
                                {selectedShop.company_logo_url ? 
                                    <img src={selectedShop.company_logo_url} className="w-full h-full object-cover" alt="" /> : 
                                    <div className="w-full h-full bg-orange-50 flex items-center justify-center text-2xl">🏪</div>
                                }
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800">{selectedShop.company_name}</h2>
                                <p className="text-sm text-gray-500">{selectedShop.region || 'Haïti'}</p>
                            </div>
                        </div>
                        
                        {selectedShop.is_google_place ? (
                            <div className="text-center py-12 bg-gray-50 rounded-lg">
                                <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                                <h3 className="text-lg font-bold">Commerce listé sur Maps</h3>
                                <p className="text-gray-500">Produits non disponibles à la commande.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {products.map(product => (
                                    <ProductCard
                                        key={product.id}
                                        product={product}
                                        shop={selectedShop}
                                        onAdd={handleAddToCart}
                                        onClick={() => setSelectedProduct(product)}
                                    />
                                ))}
                            </div>
                        )}
                   </div>
               ) : (
                   /* 3.2: LISTE DE TOUTES LES BOUTIQUES DE LA CATÉGORIE */
                   <div className="space-y-6">
                        <div className="bg-white p-4 rounded shadow-sm">
                            <h2 className="text-xl font-bold text-slate-800">
                                Boutique : {selectedCategory}
                            </h2>
                        </div>

                        {productsByShopInCategory.length > 0 ? (
                            productsByShopInCategory.map(({ shop, products }) => (
                                <div 
                                    id={`shop-section-${shop.id}`}
                                    key={shop.id} 
                                    className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
                                >
                                    {/* Header Boutique */}
                                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                                        <div 
                                            className="flex items-center gap-3 cursor-pointer group"
                                            onClick={() => setSelectedShop(shop)}
                                        >
                                            <div className="w-12 h-12 rounded-full border border-gray-200 overflow-hidden">
                                                {shop.company_logo_url ? (
                                                    <img src={shop.company_logo_url} className="w-full h-full object-cover" alt="" />
                                                ) : (
                                                    <div className="bg-slate-100 w-full h-full flex items-center justify-center font-bold">{shop.company_name[0]}</div>
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-lg text-slate-900 group-hover:text-orange-600">
                                                    {shop.company_name}
                                                </h3>
                                                <div className="flex text-xs text-gray-500 gap-2">
                                                    <span>Livraison standard</span>
                                                    <span>•</span>
                                                    <span className="text-green-600">En stock</span>
                                                </div>
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm"
                                            className="hidden md:flex bg-white border border-gray-300 text-black hover:bg-gray-50"
                                            onClick={() => setSelectedShop(shop)}
                                        >
                                            Visiter la boutique
                                        </Button>
                                    </div>

                                    {/* Aperçu Produits (Max 4) */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {products.slice(0, 4).map(product => (
                                            <div key={product.id}>
                                                <ProductCard
                                                    product={product}
                                                    shop={shop}
                                                    onAdd={(p) => {
                                                        setSelectedShop(shop); 
                                                        handleAddToCart(p);
                                                    }}
                                                    onClick={() => {
                                                        setSelectedShop(shop);
                                                        setSelectedProduct(product);
                                                    }}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {products.length > 4 && (
                                        <div className="mt-4 text-center">
                                            <button 
                                                onClick={() => setSelectedShop(shop)}
                                                className="text-sm text-[#007185] hover:text-[#C7511F] hover:underline font-medium"
                                            >
                                                Voir les {products.length - 4} autres produits de {shop.company_name}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 bg-white rounded-lg shadow-sm">
                                <div className="text-4xl mb-4">📦</div>
                                <h3 className="text-lg font-bold text-gray-800">Aucun produit disponible</h3>
                                <p className="text-gray-500 text-sm mt-2">Aucune boutique ne propose d'articles dans "{selectedCategory}" actuellement.</p>
                                <Button className="mt-4 bg-orange-400" onClick={() => setSelectedCategory('Tout')}>Retour</Button>
                            </div>
                        )}
                   </div>
               )}
            </main>
          </div>
        )}
      </main>

      {/* Panier Flottant Mobile */}
      {user && cartCount > 0 && (
        <div className="fixed bottom-4 right-4 z-40 animate-bounce-subtle">
           <Link to={createPageUrl('Cart')}>
                <div className="bg-white border-2 border-orange-500 rounded-full p-3 shadow-2xl flex items-center gap-2 hover:scale-105 transition-transform">
                    <div className="relative">
                        <ShoppingCart className="w-6 h-6 text-gray-800" />
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                            {cartCount}
                        </span>
                    </div>
                    <span className="font-bold text-sm text-gray-900 pr-2">
                         {cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toFixed(0)} G
                    </span>
                </div>
           </Link>
        </div>
      )}

      {/* Modals */}
      <ProductDetailModal
        product={selectedProduct}
        shop={selectedProduct ? shops.find(s => s.id === selectedProduct.shop_id) : null}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        user={user}
        similarProducts={[]}
      />
      <ProfileCompletionModal
        user={user}
        open={showProfileModal}
        onComplete={handleProfileComplete}
      />
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

// Carousel Recommandations
function RecommendedSection({ allProducts, shops, user, setSelectedShop, setSelectedProduct, getClientPrice }) {
  const [currentRowIndexes, setCurrentRowIndexes] = useState([0, 0, 0]);
  const rowContainers = [useRef(null), useRef(null), useRef(null)];

  const productRows = React.useMemo(() => {
    const productsWithPhotos = allProducts.filter(p => p.image_url && p.is_available !== false);
    const makariosProducts = productsWithPhotos.filter(p => shops.find(s => s.id === p.shop_id)?.company_name?.toLowerCase().includes('makarios'));
    const otherProducts = productsWithPhotos.filter(p => !shops.find(s => s.id === p.shop_id)?.company_name?.toLowerCase().includes('makarios'));
    
    const rows = [];
    for (let i = 0; i < 3; i++) {
        const selected = [...makariosProducts.slice(0, 8), ...otherProducts.slice(0, 8)].sort(() => Math.random() - 0.5);
        rows.push(selected);
    }
    return rows;
  }, [allProducts, shops]);

  const handleScroll = (index, direction) => {
      if(rowContainers[index].current) {
          rowContainers[index].current.scrollBy({ left: direction === 'left' ? -300 : 300, behavior: 'smooth' });
      }
  };

  if (!productRows[0]?.length) return null;
  const rowTitles = ["Inspiré de votre historique", "Les clients ont aussi acheté", "Recommandé pour vous"];

  return (
    <div className="mt-8 space-y-8 bg-white p-4 border-t border-gray-200">
      {productRows.map((rowProducts, rowIndex) => (
          <div key={rowIndex} className="relative group/carousel">
            <h3 className="text-xl font-bold text-slate-900 mb-2">{rowTitles[rowIndex]}</h3>
            <button onClick={() => handleScroll(rowIndex, 'left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 h-24 w-10 shadow-md border rounded-r-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:bg-white"><ArrowLeft className="w-6 h-6 text-gray-600" /></button>
            <button onClick={() => handleScroll(rowIndex, 'right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 h-24 w-10 shadow-md border rounded-l-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:bg-white"><ArrowLeft className="w-6 h-6 text-gray-600 rotate-180" /></button>

            <div ref={rowContainers[rowIndex]} className="flex overflow-x-auto gap-4 pb-4 scroll-smooth no-scrollbar">
              {rowProducts.map((product, idx) => {
                const shop = shops.find(s => s.id === product.shop_id);
                return (
                  <div key={`${product.id}-${idx}`} className="flex-shrink-0 w-[180px] bg-white p-2 cursor-pointer hover:bg-gray-50" onClick={() => {
                       if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
                       if (shop) setSelectedShop(shop); setSelectedProduct(product);
                    }}>
                    <div className="h-40 bg-gray-50 mb-2 p-2"><img src={product.image_url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" /></div>
                    <div className="text-sm text-[#007185] hover:text-[#C7511F] line-clamp-2 h-10 mb-1">{product.name}</div>
                    <div className="font-medium text-lg text-[#B12704]">${Math.floor(getClientPrice(product))}</div>
                  </div>
                );
              })}
            </div>
          </div>
      ))}
    </div>
  );
}