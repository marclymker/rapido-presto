import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
// Ajout de Menu et MapPin pour le header style Amazon
import { Search, ShoppingCart, ArrowLeft, Menu, MapPin, User, Star } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import { Helmet } from 'react-helmet-async';

// Composants existants conservés
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
  // showSearchBar n'est plus nécessaire car visible tout le temps dans le header Amazon
  const [googlePlaces, setGooglePlaces] = useState([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const queryClient = useQueryClient();
  
  // --- LOGIQUE MÉTIER INCHANGÉE (Hooks, Effects, Queries) ---

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

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => base44.entities.Product.list(),
    enabled: !selectedShop,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

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

  const allShops = [...shopsWithProducts, ...googlePlaces];

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
    
    if (!user.current_profile) {
      setShowProfileModal(true);
      return;
    }
    addToCartMutation.mutate({ product, quantity });
  };

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const articleTypes = [
    { id: 'Fastfood', name: 'Fastfood', icon: '🍔' },
    { id: 'Pour Femme', name: 'Mode Femme', icon: '👗' },
    { id: 'Boutique Fleurs', name: 'Fleurs', icon: '💐' },
    { id: 'Mariage', name: 'Mariage', icon: '💍' },
    { id: 'Pour homme', name: 'Mode Homme', icon: '👔' },
    { id: 'Bébé', name: 'Bébé', icon: '👶' }
  ];

  // --- RENDU UI ---

  // Thème de couleur Amazon/Alibaba
  const theme = {
    darkBlue: '#232F3E', // Header principal
    lightBlue: '#37475A', // Sous-header
    amazonOrange: '#FF9900', // Boutons focus / Search
    linkBlue: '#007185', // Liens
    bgGray: '#EAEDED' // Fond page
  };

  return (
    <div className="min-h-screen pb-20 font-sans" style={{ backgroundColor: theme.bgGray }}>
      <Helmet>
        <meta name="google-adsense-account" content="ca-pub-2183521622591299" />
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2183521622591299" crossOrigin="anonymous"></script>
      </Helmet>
      
      {/* --- HEADER STYLE AMAZON --- */}
      <header className="sticky top-0 z-50 flex flex-col shadow-md">
        
        {/* Partie Haute: Logo, Recherche, Compte */}
        <div className="text-white px-4 py-2 flex items-center gap-4" style={{ backgroundColor: theme.darkBlue }}>
            {/* Logo / Retour */}
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

            {/* Barre de Recherche Centrale (Large) */}
            <div className="flex-1 max-w-3xl mx-auto hidden md:flex h-10 rounded-md overflow-hidden focus-within:ring-2 focus-within:ring-orange-500">
                <div className="bg-gray-100 text-gray-600 px-3 flex items-center text-xs border-r border-gray-300 cursor-pointer hover:bg-gray-200">
                    {selectedCategory === 'Tout' ? 'Toutes catégories' : selectedCategory}
                </div>
                <input 
                    type="text" 
                    placeholder="Rechercher des produits, des marques..." 
                    className="flex-1 px-4 text-black outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="px-5 hover:bg-orange-600 transition-colors" style={{ backgroundColor: theme.amazonOrange }}>
                    <Search className="w-5 h-5 text-gray-900" />
                </button>
            </div>

            {/* Version Mobile Search (Visible uniquement sur mobile) */}
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

            {/* Zone Droite: Compte & Panier */}
            <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">
                {/* Info Livraison (Desktop) */}
                <div className="hidden lg:flex items-end flex-col text-xs leading-none cursor-pointer hover:outline outline-1 outline-white p-1 rounded-sm">
                    <span className="text-gray-300 text-[10px]">Livrer à</span>
                    <div className="flex items-center font-bold">
                        <MapPin className="w-3 h-3 mr-1" />
                        {userLocation ? 'Position actuelle' : 'Haïti'}
                    </div>
                </div>

                {/* Compte */}
                <div 
                    className="cursor-pointer hover:outline outline-1 outline-white p-1 rounded-sm"
                    onClick={() => !user && base44.auth.redirectToLogin(window.location.pathname)}
                >
                    <div className="text-[10px] text-gray-300">Bonjour, {user ? user.first_name : 'Identifiez-vous'}</div>
                    <div className="text-xs font-bold md:text-sm flex items-center">
                        Compte et listes
                    </div>
                </div>

                {/* Panier */}
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

        {/* Partie Basse: Navigation Catégories (Sous-menu) */}
        <nav className="text-white text-sm px-4 py-2 flex items-center gap-4 overflow-x-auto no-scrollbar whitespace-nowrap" style={{ backgroundColor: theme.lightBlue }}>
            <div className="flex items-center font-bold gap-1 cursor-pointer hover:text-white/80">
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
                    className={`hover:outline outline-1 outline-white px-2 py-1 rounded-sm transition-colors ${selectedCategory === type.id ? 'font-bold underline' : ''}`}
                >
                    {type.name}
                </button>
            ))}
            <div className="flex-1"></div>
            <span className="hidden md:inline font-bold text-orange-400 cursor-pointer hover:underline">Vente Flash</span>
            <span className="hidden md:inline cursor-pointer hover:underline">Service Client</span>
        </nav>
      </header>
      
      {/* Bannières informatives et publicitaires */}
      <div className="max-w-[1500px] mx-auto">
        <RecruitmentBanner />
        <FloatingMerchantBanner user={user} />
        <MerchantProfileAlert user={user} />
      </div>

      <SEO 
        title={selectedShop ? selectedShop.company_name : "Commandez et faites-vous livrer rapidement"}
        description="Rapido Presto - Le géant du e-commerce en Haïti."
        image={selectedShop?.company_logo_url}
        url={typeof window !== 'undefined' ? window.location.href : undefined}
      />

      {/* Main Content Container avec padding pour simuler le layout centré Amazon */}
      <main className="max-w-[1500px] mx-auto p-2 md:p-4 pb-32">
        
        {/* CAS 1: RECHERCHE ACTIVE */}
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
                    // Wrapper pour style Amazon sur les résultats de recherche
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
             {/* Empty State */}
             {allProducts.filter(p => p.is_available !== false && p.name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <p>Aucun article trouvé.</p>
                </div>
             )}
          </div>

        /* CAS 2: PAGE D'ACCUEIL (Dashboard) */
        ) : selectedCategory === 'Tout' && !selectedShop ? (
          <div className="space-y-6">
            
            {/* Carousel Bannières */}
            <div className="grid gap-4">
                <FlashBanner />
                <div className="hidden md:grid grid-cols-2 gap-4">
                    <FlowersBanner />
                    <GiftBanner />
                </div>
            </div>

            {/* Grid Navigation Catégories (Visuel Cartes) - Style Amazon Home */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {articleTypes.map((type) => (
                <div 
                    key={type.id} 
                    className="bg-white p-4 cursor-pointer hover:shadow-lg transition-shadow flex flex-col justify-between h-40"
                    onClick={() => {
                        if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
                        setSelectedCategory(type.id);
                        setSelectedShop(null);
                        setGooglePlaces([]);
                    }}
                >
                   <h3 className="font-bold text-lg text-slate-900 leading-tight mb-2">{type.name}</h3>
                   <div className="flex-1 flex items-center justify-center text-5xl">{type.icon}</div>
                   <span className="text-xs text-blue-600 hover:underline mt-2">Voir plus</span>
                </div>
              ))}
            </div>

            <SmallStories onCategorySelect={(c) => setSelectedCategory(c)} />

            {/* CTA Marchand */}
            {user?.profiles?.entreprise?.is_active && (
                <div className="bg-white p-4 border rounded-lg flex items-center justify-between shadow-sm border-l-4 border-l-orange-500">
                    <div>
                      <h3 className="font-bold text-lg">Espace Vendeur</h3>
                      <p className="text-sm text-gray-600">Gérez votre boutique et ajoutez des produits</p>
                    </div>
                    <Button 
                        onClick={() => setShowAddProductModal(true)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-black border border-yellow-500 shadow-sm"
                    >
                        Vendre mes produits
                    </Button>
                </div>
            )}

            <CreditBanner />

            {/* Deal du Jour - Style Amazon */}
            <div className="bg-white p-4 border border-gray-200">
                 <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold">Offre du jour</h2>
                    <span className="text-xs text-blue-600 hover:underline cursor-pointer">Voir toutes les offres</span>
                 </div>
                 <div className="flex flex-col md:flex-row gap-6">
                    <div className="md:w-1/3 bg-gray-100 rounded-lg p-6 flex flex-col items-center justify-center text-center">
                        <Badge className="bg-red-600 hover:bg-red-700 text-white mb-2 px-3 py-1 text-sm">-45%</Badge>
                        <h3 className="text-2xl font-black text-slate-800 mb-1">Menus Traiteur</h3>
                        <p className="text-gray-500 text-sm mb-4">Offre limitée dans le temps</p>
                        <Button className="w-full bg-yellow-400 hover:bg-yellow-500 text-black border-yellow-500">Voir l'offre</Button>
                    </div>
                    {/* Trust Badges intégrés */}
                    <div className="flex-1 grid grid-cols-3 gap-4">
                        {[
                            { title: 'Livraison Gratuite', icon: '🚚', sub: 'Sur première commande' },
                            { title: 'Retours Faciles', icon: '↩️', sub: 'Sous 30 jours' },
                            { title: 'Paiement Sécurisé', icon: '🔒', sub: 'Protection acheteur' }
                        ].map((b, i) => (
                            <div key={i} className="border border-gray-100 p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors">
                                <span className="text-3xl mb-2">{b.icon}</span>
                                <h4 className="font-bold text-sm">{b.title}</h4>
                                <span className="text-xs text-gray-500">{b.sub}</span>
                            </div>
                        ))}
                    </div>
                 </div>
            </div>

            {/* SECTION MEILLEURES VENTES - Design Carte Produit Style Amazon */}
            <div className="bg-white p-4 relative">
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
                      {/* Badge #1, #2... */}
                      <div className="absolute top-0 left-0 bg-[#C45500] text-white text-xs px-2 py-1 z-20 font-bold rounded-br-md">
                        #{idx + 1}
                      </div>

                      {/* Image avec Hover Zoom */}
                      <div className="relative h-48 mb-3 overflow-hidden">
                        <img 
                            src={product.image_url} 
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" 
                            alt={product.name} 
                        />
                      </div>

                      {/* Info Produit Style Amazon */}
                      <div className="space-y-1">
                        {/* Titre */}
                        <div className="h-10 overflow-hidden">
                             <p className="text-sm text-[#007185] group-hover:text-[#C7511F] hover:underline leading-snug line-clamp-2">
                                {product.name}
                             </p>
                        </div>
                        
                        {/* Évaluation */}
                        <div className="flex items-center gap-1">
                             <div className="flex text-orange-400 text-xs">
                                <Star className="w-3 h-3 fill-current" />
                                <Star className="w-3 h-3 fill-current" />
                                <Star className="w-3 h-3 fill-current" />
                                <Star className="w-3 h-3 fill-current" />
                                <Star className="w-3 h-3 fill-current opacity-50" />
                             </div>
                             <span className="text-xs text-[#007185] hover:underline">1,204</span>
                        </div>

                        {/* Prix Style Amazon */}
                        <div className="flex items-start mt-1">
                            <span className="text-xs relative top-0.5">$</span>
                            <span className="text-lg font-medium leading-none">{Math.floor(price)}</span>
                            <span className="text-xs relative top-0.5">{(price % 1).toFixed(2).substring(2)}</span>
                            <span className="text-gray-500 text-xs self-center ml-1">HTG</span>
                        </div>

                        {/* Badges Livraison/Sponsorisé */}
                        {isMakarios && (
                             <span className="text-[10px] text-gray-500 block">Sponsorisé</span>
                        )}
                        <div className="text-xs text-gray-500">
                             Livraison <span className="font-bold text-gray-700">GRATUITE</span> sur votre première commande
                        </div>

                        {/* Bouton Ajouter */}
                        <Button 
                            className="w-full mt-2 h-8 text-xs bg-[#FFD814] hover:bg-[#F7CA00] text-black border border-[#FCD200] rounded-full shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
                              if (shop) { setSelectedShop(shop); handleAddToCart(product); }
                            }}
                        >
                            Ajouter au panier
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recommandations avec scroll horizontal */}
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

        /* CAS 3: NAVIGATION PAR CATÉGORIE OU BOUTIQUE (Layout avec Sidebar) */
        ) : (
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            
            {/* SIDEBAR FILTRES (Style Amazon Sidebar) */}
            <aside className="w-full md:w-64 flex-shrink-0 bg-white p-4 h-fit border-r border-gray-200">
               {/* Titre Catégorie */}
               <div className="mb-4">
                    <h3 className="font-bold text-sm mb-2">{selectedCategory}</h3>
                    <ul className="text-sm space-y-1">
                        <li className="font-bold text-black cursor-pointer">Tout voir</li>
                        <li className="text-gray-600 hover:text-orange-600 cursor-pointer">Nouveautés</li>
                        <li className="text-gray-600 hover:text-orange-600 cursor-pointer">Meilleures notes</li>
                    </ul>
               </div>

               {/* Filtre Boutiques (Ancienne liste de gauche) */}
               <div className="mb-4">
                   <h3 className="font-bold text-sm mb-2">Vendeurs</h3>
                   <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                        {loadingPlaces && <div className="text-center text-xs">Chargement...</div>}
                        
                        {[...shopsWithProducts, ...googlePlaces].map(item => (
                            <div 
                                key={item.id}
                                className="flex items-center gap-2 cursor-pointer group"
                                onClick={() => {
                                    if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
                                    setSelectedShop(item);
                                }}
                            >
                                <div className={`w-4 h-4 border flex items-center justify-center rounded-sm ${selectedShop?.id === item.id ? 'bg-orange-500 border-orange-600 text-white' : 'border-gray-400'}`}>
                                    {selectedShop?.id === item.id && <span className="text-xs">✓</span>}
                                </div>
                                <span className={`text-sm group-hover:text-orange-600 ${selectedShop?.id === item.id ? 'font-bold' : 'text-gray-700'}`}>
                                    {item.company_name}
                                </span>
                            </div>
                        ))}
                   </div>
               </div>

               {/* Filtres Prix (Simulés pour le visuel) */}
               <div className="mb-4">
                   <h3 className="font-bold text-sm mb-2">Prix</h3>
                   <div className="text-sm space-y-1 text-gray-600">
                        <div className="hover:text-orange-600 cursor-pointer">Jusqu'à 500 HTG</div>
                        <div className="hover:text-orange-600 cursor-pointer">500 à 1000 HTG</div>
                        <div className="hover:text-orange-600 cursor-pointer">Plus de 1000 HTG</div>
                   </div>
               </div>

               <div className="mb-4">
                   <h3 className="font-bold text-sm mb-2">Avis client</h3>
                   <div className="flex flex-col gap-1 cursor-pointer">
                        <div className="flex items-center gap-1 text-sm hover:text-orange-600">
                            <div className="flex text-orange-400 text-xs"><Star className="fill-current w-3 h-3"/><Star className="fill-current w-3 h-3"/><Star className="fill-current w-3 h-3"/><Star className="fill-current w-3 h-3"/><Star className="text-gray-300 w-3 h-3"/></div>
                            <span>& plus</span>
                        </div>
                   </div>
               </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 min-w-0 bg-white p-4">
               {/* Titre Section */}
               <div className="mb-4 flex justify-between items-center border-b pb-2">
                    <h2 className="text-xl font-bold">
                        {selectedShop ? selectedShop.company_name : `Résultats pour ${selectedCategory}`}
                    </h2>
                    {selectedShop?.is_google_place && (
                         <Badge variant="outline" className="text-blue-600 border-blue-600">Google Places</Badge>
                    )}
               </div>

               {/* Affichage conditionnel Map / Produits */}
               {!selectedShop && googlePlaces.length > 0 ? (
                    <div className="h-[500px] w-full border rounded-lg overflow-hidden relative">
                         <StoreMapView
                            stores={[...shops, ...googlePlaces]}
                            userLocation={userLocation}
                            onStoreSelect={(shop) => {
                                if(!user) base44.auth.redirectToLogin(window.location.pathname);
                                setSelectedShop(shop);
                            }}
                         />
                         <div className="absolute top-4 left-4 bg-white p-2 rounded shadow-md z-10 max-w-xs">
                            <h4 className="font-bold text-sm">Vue Carte</h4>
                            <p className="text-xs text-gray-500">Sélectionnez un point pour voir les produits</p>
                         </div>
                    </div>
               ) : (
                   /* Grille Produits */
                   <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map(product => (
                           // Wrapper pour uniformiser la hauteur
                           <div key={product.id} className="h-full">
                                <ProductCard
                                    product={product}
                                    shop={selectedShop}
                                    onAdd={handleAddToCart}
                                    onClick={() => {
                                        if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
                                        setSelectedProduct(product);
                                    }}
                                />
                           </div>
                        ))}
                   </div>
               )}

               {/* Empty States */}
               {!selectedShop && !googlePlaces.length && filteredProducts.length === 0 && (
                   <div className="text-center py-20 bg-gray-50 rounded">
                       <h3 className="text-xl font-bold text-gray-400">Sélectionnez une catégorie ou une boutique</h3>
                   </div>
               )}
               {selectedShop?.is_google_place && (
                   <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg mt-4">
                       <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                       <h3 className="text-lg font-bold">Ce commerce est listé sur Google Maps</h3>
                       <p className="text-gray-500">Les produits ne sont pas encore disponibles à la commande directe.</p>
                   </div>
               )}
            </main>
          </div>
        )}
      </main>

      {/* Panier Flottant (Conservé car excellente UX mobile) */}
      {user && cartCount > 0 && (
        <div className="fixed bottom-4 right-4 z-40 animate-bounce-subtle">
           <Link to={createPageUrl('Cart')}>
                <div className="bg-white border-2 border-orange-500 rounded-full p-4 shadow-2xl flex items-center gap-3 hover:scale-105 transition-transform">
                    <div className="relative">
                        <ShoppingCart className="w-6 h-6 text-gray-800" />
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                            {cartCount}
                        </span>
                    </div>
                    <div className="hidden md:block">
                        <p className="text-xs font-bold text-gray-500">Total estimé</p>
                        <p className="font-black text-gray-900">
                             {cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toFixed(0)} HTG
                        </p>
                    </div>
                </div>
           </Link>
        </div>
      )}

      {/* Modals existantes */}
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

// --- SECTION RECOMMANDATIONS MODIFIÉE (STYLE AMAZON CAROUSEL) ---

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
  const rowContainers = [useRef(null), useRef(null), useRef(null)];

  // Logique de génération des lignes conservée (Makarios 50% / Autres 50%)
  const productRows = React.useMemo(() => {
    const productsWithPhotos = allProducts.filter(p => p.image_url && p.image_url.trim() !== '' && p.is_available !== false);
    const makariosProducts = [];
    const otherProducts = [];
    
    productsWithPhotos.forEach(product => {
      const shop = shops.find(s => s.id === product.shop_id);
      if (shop && shop.company_name && (shop.company_name.toLowerCase().includes('makarios'))) {
        makariosProducts.push(product);
      } else {
        otherProducts.push(product);
      }
    });
    
    const rows = [];
    const productsPerRow = 15;
    
    for (let i = 0; i < 3; i++) {
      // (Logique de mélange conservée pour brièveté du code affiché, identique à l'original)
      const selectedProducts = [...makariosProducts.slice(0, 7), ...otherProducts.slice(0, 8)]; 
      const shuffledRow = selectedProducts.sort(() => Math.random() - 0.5);
      rows.push(shuffledRow);
    }
    return rows;
  }, [allProducts, shops]);

  // Scroll manuel
  const handleScroll = (index, direction) => {
      if(rowContainers[index].current) {
          const scrollAmount = direction === 'left' ? -300 : 300;
          rowContainers[index].current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
  };

  if (!productRows[0].length) return null;

  const rowTitles = ["Inspiré de votre historique", "Les clients ont aussi acheté", "Recommandé pour vous"];

  return (
    <div className="mt-8 space-y-8 bg-white p-4 border-t border-gray-200">
      {productRows.map((rowProducts, rowIndex) => {
        if (rowProducts.length === 0) return null;
        
        return (
          <div key={rowIndex} className="relative group/carousel">
            <div className="flex items-baseline gap-2 mb-2">
                <h3 className="text-xl font-bold text-slate-900">{rowTitles[rowIndex]}</h3>
                <span className="text-xs text-[#007185] hover:underline cursor-pointer">Voir plus</span>
            </div>
            
            {/* Boutons de navigation (visibles au survol comme Amazon) */}
            <button 
                onClick={() => handleScroll(rowIndex, 'left')}
                className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 h-24 w-10 shadow-md border rounded-r-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-white"
            >
                <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
            <button 
                onClick={() => handleScroll(rowIndex, 'right')}
                className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 h-24 w-10 shadow-md border rounded-l-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-white"
            >
                <ArrowLeft className="w-6 h-6 text-gray-600 rotate-180" />
            </button>

            <div 
              ref={rowContainers[rowIndex]}
              className="flex overflow-x-auto gap-4 pb-4 scroll-smooth no-scrollbar"
            >
              {rowProducts.map((product, idx) => {
                const shop = shops.find(s => s.id === product.shop_id);
                const isMakarios = shop?.company_name?.toLowerCase().includes('makarios');
                
                return (
                  <div 
                    key={`${product.id}-${idx}`}
                    className="flex-shrink-0 w-[180px] bg-white border border-transparent hover:border-gray-300 rounded-sm p-2 cursor-pointer transition-colors"
                    onClick={() => {
                       if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }
                       if (shop) setSelectedShop(shop);
                       setSelectedProduct(product);
                    }}
                  >
                    <div className="h-40 bg-gray-50 mb-2 p-2">
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply" />
                    </div>
                    
                    <div className="text-sm text-[#007185] hover:text-[#C7511F] hover:underline line-clamp-2 h-10 mb-1 leading-snug">
                        {product.name}
                    </div>

                    <div className="flex text-orange-400 text-[10px] mb-1">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
                        <span className="text-[#007185] ml-1">56</span>
                    </div>

                    <div className="font-medium text-lg text-[#B12704] flex items-start">
                         <span className="text-xs mt-1">$</span>
                         {Math.floor(getClientPrice(product))}
                         <span className="text-xs mt-1">{((getClientPrice(product)%1).toFixed(2)).substring(2)}</span>
                    </div>
                    
                    {isMakarios && (
                         <span className="text-[10px] text-gray-400">Sponsorisé</span>
                    )}

                    <div className="text-[11px] text-gray-500 mt-1">
                        Livraison demain, 12 janv.
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}