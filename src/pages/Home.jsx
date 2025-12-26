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
import CategoryTabs from '@/components/ui/CategoryTabs';
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
    
    // Check if cart has items from different shop
    if (cartItems.length > 0 && cartItems[0].shop_id !== selectedShop.id) {
      toast.error('Votre panier contient des articles d\'une autre boutique');
      return;
    }
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

  return (
    <div className="min-h-screen bg-slate-50">
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
      
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b">
        <div className="w-full mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {selectedShop && (
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setSelectedShop(null)}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-orange-500">Rapido Presto</h1>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 sm:h-6 px-1 sm:px-2 text-[10px] sm:text-xs -mt-1"
                  onClick={() => setShowSearchBar(!showSearchBar)}
                >
                  <Search className="w-3 h-3 mr-1" />
                  <span className="hidden xs:inline">Rechercher</span>
                </Button>
              </div>
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
          </div>
          
          {/* Search Bar */}
          <AnimatePresence>
            {showSearchBar && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3"
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
        </div>
      </header>

      <main className="w-full mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <AnimatePresence mode="wait">
          {!selectedShop ? (
            <motion.div
              key="shops"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Categories */}
              <CategoryTabs 
                selected={selectedCategory} 
                onSelect={setSelectedCategory} 
              />

              {/* Tout - Random Products */}
              {selectedCategory === 'Tout' ? (
                <div className="mt-6">
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

                  <h2 className="text-lg font-semibold text-slate-800 mb-4 mt-8">
                    Découvrir
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
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
                <div className="mt-6">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4">
                    Boutiques {selectedCategory}
                  </h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
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
              <div className="bg-white rounded-2xl p-3 sm:p-4 mb-4 flex items-center gap-3 sm:gap-4">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl bg-orange-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {selectedShop.company_logo_url ? (
                    <img src={selectedShop.company_logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-orange-400">
                      {selectedShop.company_name?.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-base sm:text-xl text-slate-800 truncate">{selectedShop.company_name}</h2>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{selectedShop.company_category}</p>
                </div>
              </div>

              {/* Search in shop */}
              {showSearchBar && (
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Rechercher un article..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
              )}

              {/* Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
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