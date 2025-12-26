import React, { useState, useEffect } from 'react';
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

import ShopCard from '@/components/ui/ShopCard';
import ProductCard from '@/components/ui/ProductCard';
import ProductDetailModal from '@/components/modals/ProductDetailModal';
import { useAutoRefresh } from '@/components/realtime/useWebSocket';
import RealtimeIndicator from '@/components/realtime/RealtimeIndicator';
import { getClientPrice } from '@/components/utils/priceCalculation';
import ProfileCompletionModal from '@/components/modals/ProfileCompletionModal';
import ProductRecommendations from '@/components/recommendations/ProductRecommendations';
import SEO from '@/components/SEO';

export default function Home() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [selectedShop, setSelectedShop] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
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
      
      // Redirect if wrong profile (but keep catalogue open for clients)
      if (u.current_profile && u.current_profile !== 'client') {
        const redirectPages = {
          entreprise: 'EnterpriseDashboard',
          livreur: 'DriverDashboard'
        };
        window.location.href = createPageUrl(redirectPages[u.current_profile]);
      }
    }).catch(() => {
      // User not logged in - can still browse catalogue
      setUser(null);
    });
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

  // Fetch shops (boutiques) - public entity
  const { data: shops = [] } = useQuery({
    queryKey: ['shops', selectedCategory],
    queryFn: () => {
      if (selectedCategory === 'Tout') {
        return base44.entities.Shop.filter({ is_active: true });
      }
      return base44.entities.Shop.filter({ 
        company_category: selectedCategory,
        is_active: true 
      });
    },
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  // Fetch all products for "Tout" category
  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => base44.entities.Product.list(),
    enabled: selectedCategory === 'Tout' && !selectedShop,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  // Fetch products for selected shop
  const { data: products = [] } = useQuery({
    queryKey: ['products', selectedShop?.id],
    queryFn: () => base44.entities.Product.filter({ shop_id: selectedShop?.id }),
    enabled: !!selectedShop,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

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

  const categories = [
    { id: 'Tout', name: 'Tout', icon: '🏪' },
    { id: 'Fastfood', name: 'Fastfood', icon: '🍔' },
    { id: 'Restaurants', name: 'Restaurants', icon: '🍽️' },
    { id: 'Boutique Fleurs', name: 'Fleurs', icon: '💐' },
    { id: 'Pharmacie', name: 'Pharmacie', icon: '💊' },
    { id: 'Mariage', name: 'Mariage', icon: '💍' },
    { id: 'Epicerie', name: 'Épicerie', icon: '🛒' },
    { id: 'Café', name: 'Café', icon: '☕' },
    { id: 'Pour Femme', name: 'Pour Femme', icon: '👗' },
    { id: 'Electronics', name: 'Electronics', icon: '📱' },
    { id: 'Pour homme', name: 'Pour homme', icon: '👔' },
    { id: 'Maison', name: 'Maison', icon: '🏠' },
    { id: 'Bébé', name: 'Bébé', icon: '👶' },
    { id: 'Outils', name: 'Outils', icon: '🔧' }
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
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

      {/* Sidebar - Catégories */}
      <aside className="w-24 md:w-32 border-r flex flex-col items-center py-6 bg-white overflow-y-auto">
        {/* Logo */}
        <div className="mb-6 px-2">
          <h1 className="text-sm font-bold text-orange-500 text-center">Rapido Presto</h1>
        </div>

        {/* Catégories */}
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.id);
              setSelectedShop(null);
            }}
            className={`flex flex-col items-center mb-6 w-full px-2 transition-all ${
              selectedCategory === cat.id ? 'opacity-100' : 'opacity-40 hover:opacity-70'
            }`}
          >
            <div className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-2xl mb-1 shadow-sm ${
              selectedCategory === cat.id ? 'bg-orange-50 border-2 border-orange-500 scale-110' : 'bg-slate-50'
            }`}>
              {cat.icon}
            </div>
            <span className={`text-[9px] md:text-[10px] text-center font-bold uppercase leading-tight ${
              selectedCategory === cat.id ? 'text-orange-600' : 'text-slate-500'
            }`}>
              {cat.name}
            </span>
          </button>
        ))}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b py-3 px-4 flex items-center justify-between z-10 flex-shrink-0">
          {selectedShop && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedShop(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}

          <div className="flex-1">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 px-2 text-xs"
              onClick={() => setShowSearchBar(!showSearchBar)}
            >
              <Search className="w-4 h-4 mr-1" />
              Rechercher
            </Button>
          </div>

          {/* Login/Cart buttons */}
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
        </header>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearchBar && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white border-b px-4 py-3"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-400" />
                <Input
                  placeholder="🔍 Rechercher un restaurant, un plat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-slate-100 border-2 border-slate-200 focus:border-orange-400 text-base rounded-xl"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-32">
        <AnimatePresence mode="wait">
          {!selectedShop ? (
            <motion.div
              key="shops"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black capitalize">{selectedCategory}</h2>
              </div>

              {/* Tout - Random Products */}
              {selectedCategory === 'Tout' ? (
                <div>
                  {/* AI Recommendations */}
                  <ProductRecommendations
                    user={user}
                    onProductClick={(p) => {
                      const shop = shops.find(s => s.id === p.shop_id);
                      if (shop) setSelectedShop(shop);
                      setSelectedProduct(p);
                    }}
                    onAddToCart={(p) => {
                      const shop = shops.find(s => s.id === p.shop_id);
                      if (shop) {
                        setSelectedShop(shop);
                        handleAddToCart(p);
                      }
                    }}
                    selectedShop={selectedShop}
                    limit={6}
                  />

                  <h3 className="text-lg font-semibold text-slate-800 mb-4 mt-6">
                    Découvrir
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredRandomProducts.map(product => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAdd={(p) => {
                          const shop = shops.find(s => s.id === p.shop_id);
                          if (shop) {
                            setSelectedShop(shop);
                            handleAddToCart(p);
                          }
                        }}
                        onClick={(p) => {
                          const shop = shops.find(s => s.id === p.shop_id);
                          if (shop) setSelectedShop(shop);
                          setSelectedProduct(p);
                        }}
                      />
                    ))}
                    </div>
                    {filteredRandomProducts.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      {searchQuery ? 'Aucun article trouvé' : 'Aucun article disponible'}
                    </div>
                    )}
                    </div>
                    ) : (
                    <div>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">
                    Boutiques {selectedCategory}
                    </h3>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {shops.map(shop => (
                      <ShopCard 
                        key={shop.id} 
                        shop={shop} 
                        onClick={() => setSelectedShop(shop)}
                      />
                    ))}
                    </div>
                    {shops.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                      Aucune boutique dans cette catégorie
                    </div>
                    )}
                    </div>
                    )}
                    </motion.div>
                    ) : (
                    <motion.div
                    key="products"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    >
                    {/* Shop Header */}
                    <div className="bg-white rounded-2xl p-4 mb-6 flex items-center gap-4 shadow-sm">
                    <div className="w-16 h-16 rounded-xl bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedShop.company_logo_url ? (
                    <img src={selectedShop.company_logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                    <span className="text-2xl font-bold text-orange-400">
                      {selectedShop.company_name?.charAt(0)}
                    </span>
                    )}
                    </div>
                    <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-xl text-slate-800">{selectedShop.company_name}</h2>
                    <p className="text-sm text-slate-500">{selectedShop.company_category}</p>
                    </div>
                    </div>

                    {/* Products Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={handleAddToCart}
                    onClick={() => setSelectedProduct(product)}
                  />
                ))}
                </div>
                {filteredProducts.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  Aucun article trouvé
                </div>
                )}
                </motion.div>
                )}
                </AnimatePresence>
                </main>
                </div>

                {/* Panier Flottant (Sticky Footer) */}
                {user && cartCount > 0 && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex justify-between items-center z-50 shadow-lg">
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
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        user={user}
      />

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        user={user}
        open={showProfileModal}
        onComplete={handleProfileComplete}
      />
      </div>
      );
      }