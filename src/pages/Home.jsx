import React, { useState, useEffect, useRef } from 'react';

import { base44 } from '@/api/base44Client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Link, useNavigate, useLocation } from 'react-router-dom';

import { createPageUrl } from '@/utils';

import { categoryToSlug, slugToCategory, subcategoryToSlug, slugToSubcategory, getCategoryMeta } from '@/components/utils/urlHelpers';

import { Search, ShoppingCart, ArrowLeft, Menu, MapPin, Star, ChevronRight, X, Clock, Zap, MessageSquare, Truck, ShoppingBag } from 'lucide-react';

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

import { useAuth } from '@/components/auth/useAuth';

import { useGuestCart } from '@/components/cart/useGuestCart';

import WeddingCreditBanner from '@/components/home/WeddingCreditBanner';

import { useBackButton } from '@/components/navigation/useBackButton';

import { useActivityTracker } from '@/components/tracking/useActivityTracker';

import CreditBanner from '@/components/home/CreditBanner';

import RecruitmentBanner from '@/components/home/RecruitmentBanner';

import ProductFormModal from '@/components/enterprise/modals/ProductFormModal';

import FloatingMerchantBanner from '@/components/home/FloatingMerchantBanner';

import MerchantProfileAlert from '@/components/home/MerchantProfileAlert';

import FlashBanner from '@/components/home/FlashBanner';

import FlowersBanner from '@/components/home/FlowersBanner';

import GiftBanner from '@/components/home/GiftBanner';

import AdvancedSearch from '@/components/search/AdvancedSearch';

import SearchResults from '@/components/search/SearchResults';

import NewMessagesBanner from '@/components/home/NewMessagesBanner';

import FreeShippingBanner from '@/components/home/FreeShippingBanner';



// --- CONFIGURATION DES SOUS-CATÉGORIES MARIAGE ---

const WEDDING_STRUCTURE = [

  { title: "Robe de Mariage", subtypes: ["Robe Sirène", "Robe Catalina", "Robe Ponpon (Princesse)", "Robe Civil"] },

  { title: "Demoiselle d'honneur" },

  { title: "Annonceuse" },

  { title: "Témoins" },

  { title: "Bague de Mariage" },

  { title: "Bague" },

  { title: "Accessoires" },

  { title: "Carte et programmation" },

  { title: "Matériels Décor" }

];



export default function Home() {

  const { user, isLoading: authLoading } = useAuth();

  const { addToGuestCart } = useGuestCart();

  const navigate = useNavigate();

  const location = useLocation();

  const { trackProductView, trackCategoryView, trackShopView, trackSearch, trackAddToCart } = useActivityTracker();

  

  const [selectedShop, setSelectedShop] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');

  const [selectedProduct, setSelectedProduct] = useState(null);

  const [showProfileModal, setShowProfileModal] = useState(false);

  const [googlePlaces, setGooglePlaces] = useState([]);

  const [loadingPlaces, setLoadingPlaces] = useState(false);

  const [userLocation, setSelectedLocation] = useState(null);

  const [showAddProductModal, setShowAddProductModal] = useState(false);

  const [showCartReminder, setShowCartReminder] = useState(false);

  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const [searchResults, setSearchResults] = useState([]);

  const [activeFilters, setActiveFilters] = useState({});

  

  const queryClient = useQueryClient();



  // Lire catégorie et sous-catégorie depuis l'URL

  const urlParams = new URLSearchParams(location.search);

  const categorySlug = urlParams.get('category') || '';

  const subcategorySlug = urlParams.get('sub') || '';

  

  const selectedCategory = slugToCategory(categorySlug);

  const selectedSubCategory = slugToSubcategory(subcategorySlug, WEDDING_STRUCTURE);



  // Gérer le bouton retour natif

  useBackButton(() => {

    if (selectedProduct) {

      setSelectedProduct(null);

    } else if (selectedShop) {

      setSelectedShop(null);

    } else if (selectedSubCategory) {

      navigateToCategory(selectedCategory);

    } else if (selectedCategory !== 'Tout') {

      navigate('/', { replace: true });

    }

  }, selectedProduct || selectedShop || selectedSubCategory || selectedCategory !== 'Tout');



  useEffect(() => {

    const generateSlugs = async () => {

      try {

        await base44.functions.invoke('autoGenerateSlugs');

      } catch (error) {

        console.log('Slug generation:', error);

      }

    };

    generateSlugs();

  }, []);

  

  const articleTypes = [

    { id: 'Mariage', name: 'Mariage', icon: '💍' },

    { id: 'Pour Femme', name: 'Mode', icon: '👗' },

    { id: 'Boutique Fleurs', name: 'Fleurs', icon: '💐' },

    { id: 'Pour homme', name: 'Homme', icon: '👔' },

    { id: 'Electronics', name: 'Electroniques', icon: '📱' },

    { id: 'Bijoux', name: 'Bijoux', icon: '💎' },

    { id: 'Maison', name: 'Maison', icon: '🏠' },

    { id: 'Bébé', name: 'Bébé', icon: '👶' },

    { id: 'Outils', name: 'Outils', icon: '🔧' }

  ];



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



  // Fonction pour changer de catégorie via URL

  const navigateToCategory = (category, subcategory = null) => {

    const catSlug = categoryToSlug(category);

    const subSlug = subcategory ? subcategoryToSlug(subcategory) : '';

    

    const params = new URLSearchParams();

    if (catSlug) params.set('category', catSlug);

    if (subSlug) params.set('sub', subSlug);

    

    const queryString = params.toString();

    navigate(queryString ? `?${queryString}` : '/', { replace: true });

    setSelectedShop(null);

    setGooglePlaces([]);

    

    trackCategoryView(category);

  };



  const handleSearchResults = (results, query, filters) => {

    setSearchResults(results);

    setSearchQuery(query);

    setActiveFilters(filters);

    setShowAdvancedSearch(true);

  };



  useEffect(() => {

    const handleCategorySelect = (e) => {

      navigateToCategory(e.detail);

    };



    const handleSearchQuery = (e) => {

      setSearchQuery(e.detail);

      if (e.detail) {

        trackSearch(e.detail);

        setShowAdvancedSearch(true);

      }

    };



    window.addEventListener('selectCategory', handleCategorySelect);

    window.addEventListener('setSearchQuery', handleSearchQuery);



    if (navigator.geolocation) {

      const watchId = navigator.geolocation.watchPosition(

        (position) => {

          setSelectedLocation({

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

    refetchInterval: 60000

  });



  const productsByShopInCategory = React.useMemo(() => {

    if (selectedCategory === 'Tout' || selectedShop || selectedCategory === 'Mariage') return [];



    return shopsWithProducts.map(shop => {

      const shopProducts = allProducts.filter(p => 

        p.shop_id === shop.id && 

        p.category === selectedCategory && 

        p.is_available !== false

      );

      return { shop, products: shopProducts };

    }).filter(group => group.products.length > 0);

  }, [selectedCategory, selectedShop, shopsWithProducts, allProducts]);



  const weddingProductsBySubCategory = React.useMemo(() => {

    if (selectedCategory !== 'Mariage') return {};

    const weddingProducts = allProducts.filter(p => p.category === 'Mariage' && p.is_available !== false);

    const grouped = {};



    const classifyProduct = (product) => {

      const textToSearch = `${product.name} ${product.subcategory || ''} ${product.description || ''}`.toLowerCase();

      for (const group of WEDDING_STRUCTURE) {

        if (group.subtypes) {

          for (const subtype of group.subtypes) {

            if (textToSearch.includes(subtype.toLowerCase())) return subtype;

          }

        }

        if (textToSearch.includes(group.title.toLowerCase())) return group.title;

      }

      return 'Autre';

    };



    weddingProducts.forEach(product => {

      const sub = classifyProduct(product);

      if (!grouped[sub]) grouped[sub] = [];

      grouped[sub].push(product);

    });



    return grouped;

  }, [allProducts, selectedCategory]);



  const { data: cartItems = [] } = useQuery({

    queryKey: ['cart', user?.id],

    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),

    enabled: !!user?.id

  });



  useEffect(() => {

    if (cartItems.length > 0) {

        const timer = setTimeout(() => setShowCartReminder(true), 2000);

        return () => clearTimeout(timer);

    }

  }, [cartItems.length]);



  useEffect(() => {

    const interval = setInterval(() => {

        if (cartItems.length > 0) {

            setShowCartReminder(true);

        }

    }, 60 * 60 * 1000);



    return () => clearInterval(interval);

  }, [cartItems]);



  const addToCartMutation = useMutation({

    mutationFn: async ({ product, quantity = 1 }) => {

      const existing = cartItems.find(item => item.product_id === product.id);

      const clientPrice = getClientPrice(product);

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

      setShowCartReminder(false);

    }

  });



  const handleAddToCart = (product, quantity = 1) => {

    trackAddToCart(product);

    if (!user) {

      const productShop = shops.find(s => s.id === product.shop_id) || selectedShop;

      addToGuestCart({

        product_id: product.id,

        product_name: product.name,

        product_image: product.image_url,

        quantity: quantity,

        unit_price: getClientPrice(product),

        shop_id: productShop?.id,

        shop_name: productShop?.company_name,

        shop_region: productShop?.region

      });

      toast.success('Ajouté au panier');

      return;

    }

    if (!user.current_profile) { setShowProfileModal(true); return; }

    addToCartMutation.mutate({ product, quantity });

  };



  const filteredProducts = products.filter(p => 

    p.name?.toLowerCase().includes(searchQuery.toLowerCase())

  );



  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);



  const theme = {

    darkBlue: '#232F3E',

    lightBlue: '#37475A',

    amazonOrange: '#FF9900',

    linkBlue: '#007185',

    bgGray: '#EAEDED'

  };



  const bestSellers = React.useMemo(() => {

    const productsWithPhotos = allProducts.filter(p => p.image_url && p.is_available !== false);

    const makariosProducts = productsWithPhotos.filter(p => shops.find(s => s.id === p.shop_id)?.company_name?.toLowerCase().includes('makarios'));

    const otherProducts = productsWithPhotos.filter(p => !shops.find(s => s.id === p.shop_id)?.company_name?.toLowerCase().includes('makarios'));

    

    const TOTAL_BESTSELLERS = 100;

    const MAKARIOS_COUNT = Math.max(1, Math.floor(TOTAL_BESTSELLERS * 0.3));

    const OTHERS_COUNT = TOTAL_BESTSELLERS - MAKARIOS_COUNT;



    const selected = [

        ...makariosProducts.sort(() => Math.random() - 0.5).slice(0, MAKARIOS_COUNT),

        ...otherProducts.sort(() => Math.random() - 0.5).slice(0, OTHERS_COUNT)

    ];



    return selected.sort(() => Math.random() - 0.5);

  }, [allProducts, shops]);



  return (

    <div className="min-h-screen pb-20 font-sans" style={{ backgroundColor: theme.bgGray }}>

      <Helmet>

        <meta name="google-adsense-account" content="ca-pub-2183521622591299" />

        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2183521622591299" crossOrigin="anonymous"></script>

      </Helmet>

      

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

                    } else if (selectedSubCategory) {

                      navigateToCategory(selectedCategory);

                    } else {

                      navigate('/', { replace: true });

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

                    onKeyDown={(e) => e.key === 'Enter' && setShowAdvancedSearch(true)}

                    onFocus={() => setShowAdvancedSearch(true)}

                />

                <button 

                    className="px-5 hover:bg-orange-600 transition-colors" 

                    style={{ backgroundColor: theme.amazonOrange }}

                    onClick={() => setShowAdvancedSearch(true)}

                >

                    <Search className="w-5 h-5 text-gray-900" />

                </button>

            </div>



            <div className="flex-1 md:hidden">

                 <div className="flex items-center bg-white rounded-md px-2 py-1.5">

                   <Search className="text-gray-500 w-4 h-4 mr-2" />

                   <input 

                     type="text" 

                     placeholder="Rechercher..." 

                     className="bg-transparent outline-none w-full text-black text-sm"

                     value={searchQuery}

                     onChange={(e) => setSearchQuery(e.target.value)}

                     onKeyDown={(e) => e.key === 'Enter' && setShowAdvancedSearch(true)}

                     onFocus={() => setShowAdvancedSearch(true)}

                   />

                 </div>

            </div>



            <div className="flex items-center gap-1 md:gap-4 flex-shrink-0">

                <div className="hidden lg:flex items-end flex-col text-xs leading-none cursor-pointer hover:outline outline-1 outline-white p-1 rounded-sm">

                    <span className="text-gray-300 text-[10px]">Livrer à</span>

                    <div className="flex items-center font-bold">

                        <MapPin className="w-3 h-3 mr-1" />

                        Location

                    </div>

                </div>



                <div 

                    className="cursor-pointer hover:outline outline-1 outline-white p-1 rounded-sm"

                    onClick={() => !user && base44.auth.redirectToLogin(window.location.pathname)}

                >

                    <div className="text-[10px] text-gray-300">Bonjour, {user ? user.first_name : 'Identifiez-vous'}</div>

                    <div className="text-xs font-bold md:text-sm flex items-center">Compte</div>

                </div>



                <div 

                    className="relative flex items-end cursor-pointer hover:outline outline-1 outline-white p-1 rounded-sm"

                    onClick={() => window.location.href = createPageUrl('Cart')}

                >

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

                </div>

            </div>

        </div>

      </header>

      

      <div className="max-w-[1500px] mx-auto">

        <RecruitmentBanner />

        <FloatingMerchantBanner user={user} />

        <MerchantProfileAlert user={user} />

      </div>



      <SEO 

        title={selectedShop ? selectedShop.company_name : getCategoryMeta(selectedCategory, selectedSubCategory).title}

        description={selectedShop ? `Boutique ${selectedShop.company_name} en Haïti` : getCategoryMeta(selectedCategory, selectedSubCategory).description}

        keywords={getCategoryMeta(selectedCategory, selectedSubCategory).keywords}

        image={selectedShop?.company_logo_url}

        url={typeof window !== 'undefined' ? window.location.href : undefined}

      />



      <main className="max-w-[1500px] mx-auto p-2 md:p-4 pb-32">

        

        {/* Bannière Livraison Gratuite - Tout en haut */}

        {!selectedShop && (

          <FreeShippingBanner />

        )}

        

        {/* Wedding Credit Banner - Entre hero et contenu principal */}

        {selectedCategory === 'Mariage' && !selectedShop && (

          <div className="mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom-4">

            <WeddingCreditBanner />

          </div>

        )}



        {/* Advanced Search */}

        {showAdvancedSearch && (

          <div className="mb-4 animate-in slide-in-from-top-4">

            <Button

              variant="ghost"

              size="sm"

              onClick={() => {

                setShowAdvancedSearch(false);

                setSearchResults([]);

                setSearchQuery('');

              }}

              className="mb-2"

            >

              <X className="w-4 h-4 mr-2" />

              Fermer la recherche

            </Button>

            <AdvancedSearch

              onSearch={handleSearchResults}

              allProducts={allProducts}

              shops={shops}

              initialQuery={searchQuery}

            />

          </div>

        )}



        {/* Search Results */}

        {showAdvancedSearch && searchResults.length >= 0 ? (

          <SearchResults

            results={searchResults}

            query={searchQuery}

            filters={activeFilters}

            shops={shops}

            user={user}

            onProductClick={(product, shop) => {

              if (shop?.slug && product.slug) {

                window.location.href = createPageUrl('ShopView') + `?slug=${shop.slug}&product=${product.slug}`;

              } else if (shop) {

                setSelectedShop(shop);

                setSelectedProduct(product);

              }

            }}

            onAddToCart={handleAddToCart}

          />

        ) : (

          <>

        

        {/* Onglets sous-catégories Mariage */}

        {selectedCategory === 'Mariage' && !searchQuery.trim() && (

          <div className="bg-white mb-4 p-3 rounded-lg shadow-sm overflow-x-auto no-scrollbar">

            <div className="flex gap-3">

              <button

                onClick={() => navigateToCategory(selectedCategory)}

                className="flex-shrink-0 flex flex-col items-center gap-1"

              >

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${

                  !selectedSubCategory

                    ? 'bg-orange-500 text-white shadow-md'

                    : 'bg-gray-100 hover:bg-gray-200'

                }`}>

                  🎊

                </div>

                <span className={`text-[9px] font-medium text-center leading-tight ${

                  !selectedSubCategory ? 'text-orange-500' : 'text-gray-600'

                }`}>Tout</span>

              </button>

              

              <button

                onClick={() => navigateToCategory(selectedCategory, 'Robe Sirène')}

                className="flex-shrink-0 flex flex-col items-center gap-1"

              >

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${

                  selectedSubCategory === 'Robe Sirène'

                    ? 'bg-orange-500 text-white shadow-md'

                    : 'bg-gray-100 hover:bg-gray-200'

                }`}>

                  👰

                </div>

                <span className={`text-[9px] font-medium text-center leading-tight w-14 ${

                  selectedSubCategory === 'Robe Sirène' ? 'text-orange-500' : 'text-gray-600'

                }`}>Sirène</span>

              </button>

              

              <button

                onClick={() => navigateToCategory(selectedCategory, 'Robe Catalina')}

                className="flex-shrink-0 flex flex-col items-center gap-1"

              >

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${

                  selectedSubCategory === 'Robe Catalina'

                    ? 'bg-orange-500 text-white shadow-md'

                    : 'bg-gray-100 hover:bg-gray-200'

                }`}>

                  💃

                </div>

                <span className={`text-[9px] font-medium text-center leading-tight w-14 ${

                  selectedSubCategory === 'Robe Catalina' ? 'text-orange-500' : 'text-gray-600'

                }`}>Catalina</span>

              </button>

              

              <button

                onClick={() => navigateToCategory(selectedCategory, 'Robe Ponpon (Princesse)')}

                className="flex-shrink-0 flex flex-col items-center gap-1"

              >

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${

                  selectedSubCategory === 'Robe Ponpon (Princesse)'

                    ? 'bg-orange-500 text-white shadow-md'

                    : 'bg-gray-100 hover:bg-gray-200'

                }`}>

                  👸

                </div>

                <span className={`text-[9px] font-medium text-center leading-tight w-14 ${

                  selectedSubCategory === 'Robe Ponpon (Princesse)' ? 'text-orange-500' : 'text-gray-600'

                }`}>Princesse</span>

              </button>

              

              <button

                onClick={() => navigateToCategory(selectedCategory, 'Robe Civil')}

                className="flex-shrink-0 flex flex-col items-center gap-1"

              >

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${

                  selectedSubCategory === 'Robe Civil'

                    ? 'bg-orange-500 text-white shadow-md'

                    : 'bg-gray-100 hover:bg-gray-200'

                }`}>

                  👗

                </div>

                <span className={`text-[9px] font-medium text-center leading-tight w-14 ${

                  selectedSubCategory === 'Robe Civil' ? 'text-orange-500' : 'text-gray-600'

                }`}>Civil</span>

              </button>

              

              <button

                onClick={() => navigateToCategory(selectedCategory, "Demoiselle d'honneur")}

                className="flex-shrink-0 flex flex-col items-center gap-1"

              >

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${

                  selectedSubCategory === "Demoiselle d'honneur"

                    ? 'bg-orange-500 text-white shadow-md'

                    : 'bg-gray-100 hover:bg-gray-200'

                }`}>

                  💐

                </div>

                <span className={`text-[9px] font-medium text-center leading-tight w-14 ${

                  selectedSubCategory === "Demoiselle d'honneur" ? 'text-orange-500' : 'text-gray-600'

                }`}>Demoiselle</span>

              </button>

              

              <button

                onClick={() => navigateToCategory(selectedCategory, 'Annonceuse')}

                className="flex-shrink-0 flex flex-col items-center gap-1"

              >

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${

                  selectedSubCategory === 'Annonceuse'

                    ? 'bg-orange-500 text-white shadow-md'

                    : 'bg-gray-100 hover:bg-gray-200'

                }`}>

                  🌸

                </div>

                <span className={`text-[9px] font-medium text-center leading-tight w-14 ${

                  selectedSubCategory === 'Annonceuse' ? 'text-orange-500' : 'text-gray-600'

                }`}>Annonceuse</span>

              </button>

              

              <button

                onClick={() => navigateToCategory(selectedCategory, 'Témoins')}

                className="flex-shrink-0 flex flex-col items-center gap-1"

              >

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${

                  selectedSubCategory === 'Témoins'

                    ? 'bg-orange-500 text-white shadow-md'

                    : 'bg-gray-100 hover:bg-gray-200'

                }`}>

                  🤵

                </div>

                <span className={`text-[9px] font-medium text-center leading-tight w-14 ${

                  selectedSubCategory === 'Témoins' ? 'text-orange-500' : 'text-gray-600'

                }`}>Témoins</span>

              </button>

              

              <button

                onClick={() => navigateToCategory(selectedCategory, 'Bague de Mariage')}

                className="flex-shrink-0 flex flex-col items-center gap-1"

              >

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${

                  selectedSubCategory === 'Bague de Mariage'

                    ? 'bg-orange-500 text-white shadow-md'

                    : 'bg-gray-100 hover:bg-gray-200'

                }`}>

                  💍

                </div>

                <span className={`text-[9px] font-medium text-center leading-tight w-14 ${

                  selectedSubCategory === 'Bague de Mariage' ? 'text-orange-500' : 'text-gray-600'

                }`}>Alliance</span>

              </button>

              

              <button

                onClick={() => navigateToCategory(selectedCategory, 'Bague')}

                className="flex-shrink-0 flex flex-col items-center gap-1"

              >

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${

                  selectedSubCategory === 'Bague'

                    ? 'bg-orange-500 text-white shadow-md'

                    : 'bg-gray-100 hover:bg-gray-200'

                }`}>

                  💎

                </div>

                <span className={`text-[9px] font-medium text-center leading-tight w-14 ${

                  selectedSubCategory === 'Bague' ? 'text-orange-500' : 'text-gray-600'

                }`}>Bague</span>

              </button>

              

              <button

                onClick={() => navigateToCategory(selectedCategory, 'Accessoires')}

                className="flex-shrink-0 flex flex-col items-center gap-1"

              >

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${

                  selectedSubCategory === 'Accessoires'

                    ? 'bg-orange-500 text-white shadow-md'

                    : 'bg-gray-100 hover:bg-gray-200'

                }`}>

                  👑

                </div>

                <span className={`text-[9px] font-medium text-center leading-tight w-14 ${

                  selectedSubCategory === 'Accessoires' ? 'text-orange-500' : 'text-gray-600'

                }`}>Accessoires</span>

              </button>

              

              <button

                onClick={() => navigateToCategory(selectedCategory, 'Carte et programmation')}

                className="flex-shrink-0 flex flex-col items-center gap-1"

              >

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${

                  selectedSubCategory === 'Carte et programmation'

                    ? 'bg-orange-500 text-white shadow-md'

                    : 'bg-gray-100 hover:bg-gray-200'

                }`}>

                  💌

                </div>

                <span className={`text-[9px] font-medium text-center leading-tight w-14 ${

                  selectedSubCategory === 'Carte et programmation' ? 'text-orange-500' : 'text-gray-600'

                }`}>Cartes</span>

              </button>

              

              <button

                onClick={() => navigateToCategory(selectedCategory, 'Matériels Décor')}

                className="flex-shrink-0 flex flex-col items-center gap-1"

              >

                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${

                  selectedSubCategory === 'Matériels Décor'

                    ? 'bg-orange-500 text-white shadow-md'

                    : 'bg-gray-100 hover:bg-gray-200'

                }`}>

                  🎀

                </div>

                <span className={`text-[9px] font-medium text-center leading-tight w-14 ${

                  selectedSubCategory === 'Matériels Décor' ? 'text-orange-500' : 'text-gray-600'

                }`}>Décor</span>

              </button>

            </div>

          </div>

        )}

        

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

                          hideId={true}

                          onAdd={(p) => {

                            if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }

                            if (shop) { setSelectedShop(shop); handleAddToCart(p); }

                          }}

                          onClick={() => {

                              const shop = shops.find(s => s.id === product.shop_id);

                              trackProductView(product, shop);

                              if (shop?.slug && product.slug) {

                                window.location.href = createPageUrl('ShopView') + `?slug=${shop.slug}&product=${product.slug}`;

                              } else if (shop) {

                                setSelectedShop(shop);

                                setSelectedProduct(product);

                              }

                          }}

                        />

                    </div>

                  );

                })}

            </div>

          </div>

        ) : selectedCategory === 'Tout' && !selectedShop ? (

          <div className="space-y-6">

            

            <div className="grid gap-4">

                <FlashBanner />

                <div className="hidden md:grid grid-cols-2 gap-4">

                    <FlowersBanner />

                    <GiftBanner />

                </div>

            </div>



            <SmallStories onCategorySelect={(c) => navigateToCategory(c)} />

            

            <FreeShippingBanner />

            

            <CreditBanner />



            {/* --- MEILLEURES VENTES --- */}

            <div className="bg-white p-2 md:p-4 relative rounded-sm shadow-sm border border-gray-100 mt-6">

                <h2 className="text-lg md:text-xl font-bold mb-4 px-2">Meilleures Ventes</h2>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-0 border-t border-l border-gray-100">

                {bestSellers.map((product, idx) => {

                  const shop = shops.find(s => s.id === product.shop_id);

                  const price = getClientPrice(product);

                  const isMakarios = shop?.company_name?.toLowerCase().includes('makarios bridal');



                  return (

                    <div 

                      key={product.id}

                      onClick={() => {

                        if (shop?.slug && product.slug) {

                          window.location.href = createPageUrl('ShopView') + `?slug=${shop.slug}&product=${product.slug}`;

                        } else if (shop) {

                          setSelectedShop(shop);

                          setSelectedProduct(product);

                        }

                      }}

                      className="bg-white p-2 border-r border-b border-gray-100 hover:shadow-lg hover:z-10 relative cursor-pointer group transition-all flex flex-col h-full"

                    >

                      {/* Icône ShoppingBag au lieu du numéro #idx */}

                      <div className="absolute top-0 left-0 bg-slate-800 text-white p-1 z-20 rounded-br shadow-sm">

                        <ShoppingBag className="w-3 h-3 text-orange-400" />

                      </div>

                      

                      {/* 1. L'IMAGE */}

                      <div className="relative aspect-square mb-1.5 overflow-hidden bg-gray-50 rounded">

                        <img 

                          src={`${product.image_url}${product.image_url?.includes('?') ? '&' : '?'}w=250&q=75`} 

                          className="w-full h-full object-contain mix-blend-multiply group-hover:scale-105 transition-transform" 

                          alt={product.name} 

                          loading="lazy" 

                        />

                        {/* Badge de réassurance sur l'image */}

                        <div className={`absolute bottom-1 right-1 flex items-center gap-0.5 px-1 rounded-sm text-[8px] font-black uppercase shadow-sm ${isMakarios ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'}`}>

                          <Zap size={8} fill="currentColor" />

                          {isMakarios ? 'Réponse' : 'Livraison'}

                        </div>

                      </div>



                      {/* 2. LE PRIX (Inversé) */}

                      <div className="flex items-baseline gap-0.5 leading-none px-1">

                        <span className="text-sm font-black text-slate-900">{Math.floor(price).toLocaleString()}</span>

                        <span className="text-[8px] font-bold text-slate-900">HTG</span>

                      </div>



                      {/* 3. LE TITRE (Forcé sur 1 ligne) */}

                      <h3 className="text-[10px] text-slate-500 font-medium truncate w-full mt-0.5 px-1" title={product.name}>

                        {product.name}

                      </h3>

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

        ) : (

          <div className="flex flex-col md:flex-row gap-4 mt-4">

            

            <aside className="hidden md:block w-64 flex-shrink-0 bg-white p-4 h-fit border-r border-gray-200 sticky top-20 rounded-sm">

               <div className="mb-4">

                    <h3 className="font-bold text-lg mb-4 text-orange-500">{selectedCategory}</h3>

                    

                    {selectedCategory === 'Mariage' && (

                        <div className="space-y-1">

                            <h4 className="font-bold text-sm mb-2 text-slate-800">Départements</h4>

                            <div 

                                className={`cursor-pointer text-sm p-2 rounded hover:bg-gray-100 ${!selectedSubCategory ? 'font-bold bg-gray-50 text-orange-600' : ''}`}

                                onClick={() => navigateToCategory(selectedCategory)}

                            >

                                Tout voir

                            </div>

                            {WEDDING_STRUCTURE.map((group, idx) => (

                                <div key={idx}>

                                    {group.subtypes ? (

                                        <div className="mb-2">

                                            <p className="font-bold text-sm text-gray-700 px-2 mt-2">{group.title}</p>

                                            {group.subtypes.map((sub) => (

                                                <div 

                                                    key={sub}

                                                    className={`cursor-pointer text-sm p-2 pl-4 rounded hover:bg-gray-100 ${selectedSubCategory === sub ? 'font-bold text-orange-600 bg-gray-50' : 'text-gray-600'}`}

                                                    onClick={() => navigateToCategory(selectedCategory, sub)}

                                                >

                                                    {sub}

                                                </div>

                                            ))}

                                        </div>

                                    ) : (

                                        <div 

                                            className={`cursor-pointer text-sm p-2 rounded hover:bg-gray-100 ${selectedSubCategory === group.title ? 'font-bold text-orange-600 bg-gray-50' : 'text-gray-600'}`}

                                            onClick={() => navigateToCategory(selectedCategory, group.title)}

                                        >

                                            {group.title}

                                        </div>

                                    )}

                                </div>

                            ))}

                        </div>

                    )}



                    {!selectedShop && selectedCategory !== 'Mariage' && (

                        <>

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

                            <Button variant="outline" className="w-full text-xs" onClick={() => setSelectedShop(null)}>

                                <ArrowLeft className="w-3 h-3 mr-2" /> Retour liste

                            </Button>

                        </div>

                    )}

               </div>

            </aside>



            <main className="flex-1 min-w-0">

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

                   </div>

               ) : (

                   <div className="space-y-6">

                        <div className="bg-white p-4 rounded shadow-sm">

                            <h2 className="text-xl font-bold text-slate-800">

                                {selectedSubCategory ? selectedSubCategory : selectedCategory}

                            </h2>

                        </div>



                        {selectedCategory === 'Mariage' ? (

                            <div className="space-y-8">

                                {selectedSubCategory ? (

                                    <div className="bg-white p-4 rounded-lg shadow-sm">

                                        {weddingProductsBySubCategory[selectedSubCategory]?.slice(0, 8).length > 0 && (

                                          <div className="mb-8 col-span-full">

                                            <WeddingCreditBanner />

                                          </div>

                                        )}



                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                                                 {weddingProductsBySubCategory[selectedSubCategory]?.length > 0 ? (

                                                     weddingProductsBySubCategory[selectedSubCategory].map(product => {

                                                    const shop = shops.find(s => s.id === product.shop_id);

                                                    return (

                                                        <ProductCard

                                                            key={product.id}

                                                            product={product}

                                                            shop={shop}

                                                            onAdd={(p) => { setSelectedShop(shop); handleAddToCart(p); }}

                                                            onClick={() => { setSelectedShop(shop); setSelectedProduct(product); }}

                                                        />

                                                    );

                                                })

                                            ) : (

                                                <div className="col-span-full text-center py-10 text-gray-500">Aucun produit trouvé dans cette section.</div>

                                            )}

                                        </div>

                                    </div>

                                ) : (

                                    Object.entries(weddingProductsBySubCategory).map(([subCat, items]) => (

                                        <div key={subCat} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">

                                            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">

                                                <h3 className="font-bold text-lg text-slate-900">{subCat}</h3>

                                                <Button 

                                                    variant="link" 

                                                    className="text-xs text-[#007185]"

                                                    onClick={() => navigateToCategory(selectedCategory, subCat)}

                                                >

                                                    Voir plus

                                                </Button>

                                            </div>

                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">

                                                {items.slice(0, 5).map(product => {

                                                        const shop = shops.find(s => s.id === product.shop_id);

                                                        return (

                                                            <ProductCard

                                                                key={product.id}

                                                                product={product}

                                                                shop={shop}

                                                                hideId={true}

                                                                onAdd={(p) => { setSelectedShop(shop); handleAddToCart(p); }}

                                                                onClick={() => { setSelectedShop(shop); setSelectedProduct(product); }}

                                                            />

                                                        );

                                                    })}

                                            </div>

                                        </div>

                                    ))

                                )}

                            </div>

                        ) : (

                            productsByShopInCategory.length > 0 ? (

                                productsByShopInCategory.map(({ shop, products }) => (

                                    <div 

                                        id={`shop-section-${shop.id}`}

                                        key={shop.id} 

                                        className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"

                                    >

                                        <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">

                                            <div 

                                                className="flex items-center gap-3 cursor-pointer group"

                                                onClick={() => {

                                                    trackShopView(shop);

                                                    if (shop?.slug) {

                                                        window.location.href = createPageUrl('ShopView') + `?slug=${shop.slug}`;

                                                    } else {

                                                        setSelectedShop(shop);

                                                    }

                                                }}

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

                                               onClick={() => {

                                                   if (shop?.slug) {

                                                       window.location.href = createPageUrl('ShopView') + `?slug=${shop.slug}`;

                                                   } else {

                                                       setSelectedShop(shop);

                                                   }

                                               }}

                                            >

                                               Visiter la boutique

                                            </Button>

                                        </div>



                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

                                            {products.slice(0, 4).map(product => (

                                                <div key={product.id}>

                                                    <ProductCard

                                                       product={product}

                                                       shop={shop}

                                                       hideId={true}

                                                       onAdd={(p) => {

                                                           setSelectedShop(shop); 

                                                           handleAddToCart(p);

                                                       }}

                                                       onClick={() => {

                                                                  trackProductView(product, shop);

                                                                  if (shop?.slug && product.slug) {

                                                                    window.location.href = createPageUrl('ShopView') + `?slug=${shop.slug}&product=${product.slug}`;

                                                                  } else if (shop?.slug) {

                                                                    window.location.href = createPageUrl('ShopView') + `?slug=${shop.slug}`;

                                                                  } else {

                                                                    setSelectedShop(shop);

                                                                    setSelectedProduct(product);

                                                                  }

                                                              }}

                                                    />

                                                </div>

                                            ))}

                                        </div>

                                    </div>

                                ))

                            ) : (

                                <div className="text-center py-20 bg-white rounded-lg shadow-sm">

                                    <div className="text-4xl mb-4">📦</div>

                                    <h3 className="text-lg font-bold text-gray-800">Aucun produit disponible</h3>

                                    <Button className="mt-4 bg-orange-400" onClick={() => navigate('/', { replace: true })}>Retour</Button>

                                </div>

                            )

                        )}

                   </div>

               )}

            </main>

          </div>

        )}

          </>

        )}

      </main>



      {user && cartCount > 0 && (

        <div 

            className="fixed bottom-4 right-4 z-40 animate-bounce-subtle cursor-pointer"

            onClick={() => window.location.href = createPageUrl('Cart')}

        >

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

        </div>

      )}



      {showCartReminder && cartCount > 0 && (

        <div className="fixed top-32 right-4 z-50 animate-in slide-in-from-right duration-500 max-w-sm w-full md:w-80">

            <div className="bg-white border-l-4 border-orange-500 shadow-2xl rounded-lg p-4 relative">

                <button 

                    onClick={() => setShowCartReminder(false)} 

                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"

                >

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



      <NewMessagesBanner user={user} />



      <ProductDetailModal

        product={selectedProduct}

        shop={selectedProduct ? shops.find(s => s.id === selectedProduct.shop_id) : null}

        open={!!selectedProduct}

        onClose={() => setSelectedProduct(null)}

        onAddToCart={handleAddToCart}

        user={user}

        similarProducts={[]}

        onProductChange={(newProduct) => {

          const newShop = shops.find(s => s.id === newProduct.shop_id);

          if (newShop) setSelectedShop(newShop);

          setSelectedProduct(newProduct);

        }}

      />

      <ProfileCompletionModal

        user={user}

        open={showProfileModal}

        onComplete={handleProfileComplete}

      />

    </div>

  );

}



// Carousel Recommandations

function RecommendedSection({ allProducts, shops, user, setSelectedShop, setSelectedProduct, getClientPrice }) {

  const rowContainers = [useRef(null), useRef(null), useRef(null)];



  const productRows = React.useMemo(() => {

    const productsWithPhotos = allProducts.filter(p => p.image_url && p.is_available !== false);

    const makariosProducts = productsWithPhotos.filter(p => shops.find(s => s.id === p.shop_id)?.company_name?.toLowerCase().includes('makarios'));

    const otherProducts = productsWithPhotos.filter(p => !shops.find(s => s.id === p.shop_id)?.company_name?.toLowerCase().includes('makarios'));

    

    const ITEMS_PER_ROW = 16;

    const MAKARIOS_COUNT = Math.floor(ITEMS_PER_ROW * 0.3);

    const OTHERS_COUNT = ITEMS_PER_ROW - MAKARIOS_COUNT;



    const rows = [];

    for (let i = 0; i < 3; i++) {

        const selected = [

          ...makariosProducts.sort(() => Math.random() - 0.5).slice(0, MAKARIOS_COUNT),

          ...otherProducts.sort(() => Math.random() - 0.5).slice(0, OTHERS_COUNT)

        ].sort(() => Math.random() - 0.5);

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

    <div className="mt-8 space-y-6">

      {productRows.map((rowProducts, rowIndex) => (

          <div key={rowIndex} className="bg-white p-3 md:p-4 rounded-sm border border-gray-200 relative group/carousel shadow-sm">

            <h3 className="text-base font-bold text-slate-900 mb-3">{rowTitles[rowIndex]}</h3>

            <button onClick={() => handleScroll(rowIndex, 'left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 h-24 w-10 shadow-md border rounded-r-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:bg-white"><ArrowLeft className="w-6 h-6 text-gray-600" /></button>

            <button onClick={() => handleScroll(rowIndex, 'right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 h-24 w-10 shadow-md border rounded-l-lg flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 hover:bg-white"><ArrowLeft className="w-6 h-6 text-gray-600 rotate-180" /></button>



            <div ref={rowContainers[rowIndex]} className="flex overflow-x-auto gap-2 pb-2 scroll-smooth no-scrollbar">

              {rowProducts.map((product, idx) => {

                const shop = shops.find(s => s.id === product.shop_id);

                const price = getClientPrice(product);

                const isMakarios = shop?.company_name?.toLowerCase().includes('makarios bridal');



                return (

                  <div 

                    key={`${product.id}-${idx}`} 

                    className="flex-shrink-0 w-[130px] md:w-[150px] bg-white p-1 cursor-pointer transition-all hover:bg-gray-50 relative group" 

                    onClick={() => {

                       if (!user) { base44.auth.redirectToLogin(window.location.pathname); return; }

                       if (shop?.slug && product.slug) {

                         window.location.href = createPageUrl('ShopView') + `?slug=${shop.slug}&product=${product.slug}`;

                       } else if (shop) {

                         setSelectedShop(shop);

                         setSelectedProduct(product);

                       }

                    }}>

                    

                    {/* Image Carrée Compacte */}

                    <div className="aspect-square bg-gray-50 mb-1.5 rounded overflow-hidden p-1">

                        <img 

                          src={`${product.image_url}${product.image_url?.includes('?') ? '&' : '?'}w=200&q=75`} 

                          alt={product.name} 

                          className="w-full h-full object-contain mix-blend-multiply" 

                          loading="lazy" 

                        />

                        {/* Badge sur l'image */}

                        <div className={`absolute bottom-2 right-2 flex items-center gap-0.5 px-1 rounded-sm text-[7px] font-black uppercase shadow-sm ${isMakarios ? 'bg-blue-600 text-white' : 'bg-amber-500 text-white'}`}>

                          <Zap size={7} fill="currentColor" />

                          {isMakarios ? 'Réponse' : 'Livraison'}

                        </div>

                    </div>



                    {/* Prix d'abord */}

                    <div className="font-black text-sm text-slate-900 leading-none px-1">

                        {Math.floor(price).toLocaleString()} <span className="text-[8px]">HTG</span>

                    </div>



                    {/* Titre sur 1 ligne ensuite */}

                    <div className="text-[10px] text-slate-500 truncate mt-1 w-full px-1 leading-tight">{product.name}</div>

                  </div>

                );

              })}

            </div>

          </div>

      ))}

    </div>

  );

}