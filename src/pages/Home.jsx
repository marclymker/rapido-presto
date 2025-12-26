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
import SmallStories from '@/components/home/SmallStories';
import CreditBanner from '@/components/home/CreditBanner';

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

  const serviceCategories = [
    { id: 'Restaurants', name: 'Restaurants', icon: '🍽️', bgColor: 'bg-red-50', textColor: 'text-red-800' },
    { id: 'Fastfood', name: 'Fastfood', icon: '🍔', bgColor: 'bg-orange-50', textColor: 'text-orange-800' },
    { id: 'Epicerie', name: 'Épicerie', icon: '🛒', bgColor: 'bg-cyan-50', textColor: 'text-cyan-800' },
    { id: 'Pharmacie', name: 'Pharmacie', icon: '💊', bgColor: 'bg-green-50', textColor: 'text-green-800' },
    { id: 'Mariage', name: 'Mariage', icon: '💍', bgColor: 'bg-pink-50', textColor: 'text-pink-800' },
    { id: 'Café', name: 'Café', icon: '☕', bgColor: 'bg-amber-50', textColor: 'text-amber-800' }
  ];

  return (
    <div className="min-h-screen bg-white pb-20">
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
            {selectedShop ? (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setSelectedShop(null)}
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
        {selectedCategory === 'Tout' && !selectedShop ? (
          <div>
            {/* Boutons de Services (Grid) */}
            <div className="grid grid-cols-2 gap-4 p-4">
              {serviceCategories.map((service) => (
                <button
                  key={service.id}
                  onClick={() => {
                    setSelectedCategory(service.id);
                    setSelectedShop(null);
                  }}
                  className={`${service.bgColor} rounded-3xl p-6 flex flex-col items-center transition-transform hover:scale-105 active:scale-95`}
                >
                  <div className="text-5xl mb-2">{service.icon}</div>
                  <span className={`${service.textColor} font-bold text-lg text-center`}>
                    {service.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Horizontal Stories */}
            <SmallStories 
              onCategorySelect={(category) => {
                setSelectedCategory(category);
                setSelectedShop(null);
              }}
            />

            {/* Credit Banner */}
            <CreditBanner />

            {/* Bannière Promo */}
            <div className="px-4 mb-6">
              <div className="relative rounded-3xl overflow-hidden h-48 shadow-lg">
                <img 
                  src="https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=800" 
                  className="w-full h-full object-cover" 
                  alt="Promo"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent p-6 flex flex-col justify-center">
                  <span className="bg-white text-orange-600 font-bold px-3 py-1 rounded-full w-fit text-sm mb-2">
                    🎉 Offre limitée
                  </span>
                  <h2 className="text-white text-4xl font-black">50% OFF</h2>
                  <p className="text-white font-bold text-lg">Restaurants partenaires</p>
                </div>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="px-4">
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
              <div className="grid grid-cols-2 gap-4">
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
          </div>
        ) : selectedCategory !== 'Tout' && !selectedShop ? (
          /* TWO-PANE LAYOUT pour catégorie sélectionnée */
          <div className="flex h-[calc(100vh-140px)] overflow-hidden">
            {/* SIDEBAR - Liste des boutiques */}
            <aside className="w-1/5 min-w-[160px] border-r bg-slate-50 overflow-y-auto">
              <div className="p-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 px-2">
                  Boutiques
                </h3>
                {shops.map(shop => (
                  <button
                    key={shop.id}
                    onClick={() => setSelectedShop(shop)}
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
                {shops.length === 0 && (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    Aucune boutique
                  </div>
                )}
              </div>
            </aside>

            {/* MAIN CONTENT - Message de sélection */}
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">🏪</div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">
                    {selectedCategory}
                  </h2>
                  <p className="text-slate-500">
                    Sélectionnez une boutique pour voir les produits
                  </p>
                </div>
              </div>
            </main>
          </div>
        ) : (
          /* TWO-PANE LAYOUT avec boutique sélectionnée */
          <div className="flex h-[calc(100vh-140px)] overflow-hidden">
            {/* SIDEBAR - Liste des boutiques */}
            <aside className="w-1/5 min-w-[160px] border-r bg-slate-50 overflow-y-auto">
              <div className="p-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase mb-3 px-2">
                  Boutiques
                </h3>
                {shops.map(shop => (
                  <button
                    key={shop.id}
                    onClick={() => setSelectedShop(shop)}
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
              </div>
            </aside>

            {/* MAIN CONTENT - Produits de la boutique */}
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black text-slate-800 capitalize">
                  {selectedShop.company_name}
                </h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
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
            </main>
          </div>
        )}
                </main>

                {/* Bottom Navigation */}
                <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around py-3 px-2 z-50 shadow-lg">
                <Link to={createPageUrl('Home')} className="flex flex-col items-center text-orange-500 min-w-[60px]">
                <div className="text-2xl mb-0.5">🏠</div>
                <span className="text-[10px] font-bold">Inicio</span>
                </Link>
                <button className="flex flex-col items-center text-slate-400 min-w-[60px]">
                <div className="text-2xl mb-0.5">🏷️</div>
                <span className="text-[10px] font-bold">Ofertas</span>
                </button>
                <Link to={createPageUrl('Orders')} className="flex flex-col items-center text-slate-400 min-w-[60px]">
                <div className="text-2xl mb-0.5">📦</div>
                <span className="text-[10px] font-bold">Pedidos</span>
                </Link>
                <Link to={createPageUrl('Account')} className="flex flex-col items-center text-slate-400 min-w-[60px]">
                <div className="text-2xl mb-0.5">👤</div>
                <span className="text-[10px] font-bold">Cuenta</span>
                </Link>
                </nav>

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