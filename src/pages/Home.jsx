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

export default function Home() {
  const [user, setUser] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Fastfood');
  const [selectedShop, setSelectedShop] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // Initialize profile if not set
      if (!u.current_profile) {
        base44.auth.updateMe({ 
          current_profile: 'client',
          profiles: {
            client: { is_active: true, created_at: new Date().toISOString(), last_used: new Date().toISOString() },
            entreprise: { is_active: false },
            livreur: { is_active: false, status: 'pending' }
          }
        }).then(() => {
          window.location.reload();
        });
      }
    }).catch(() => {});
  }, []);

  // Fetch shops (entreprises) - using profiles structure
  const { data: shops = [] } = useQuery({
    queryKey: ['shops', selectedCategory],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => 
        u.profiles?.entreprise?.is_active && 
        u.profiles?.entreprise?.company_category === selectedCategory
      ).map(u => ({
        ...u,
        company_name: u.profiles.entreprise.company_name,
        company_category: u.profiles.entreprise.company_category,
        company_logo_url: u.profiles.entreprise.company_logo_url,
        rating: u.profiles.entreprise.rating,
        delivery_time_minutes: u.profiles.entreprise.delivery_time_minutes
      }));
    }
  });

  // Fetch products for selected shop
  const { data: products = [] } = useQuery({
    queryKey: ['products', selectedShop?.id],
    queryFn: () => base44.entities.Product.filter({ shop_id: selectedShop?.id }),
    enabled: !!selectedShop
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
          unit_price: product.promo_price && product.promo_price < product.price 
            ? product.promo_price 
            : product.price,
          shop_id: selectedShop.id,
          shop_name: selectedShop.company_name,
          shop_commune: selectedShop.commune
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
      toast.error('Veuillez vous connecter');
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

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
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
              <h1 className="text-xl font-bold text-orange-500">Rapido Presto</h1>
            </div>
            <Link to={createPageUrl('Cart')}>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-orange-500">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
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

              {/* Shops Grid */}
              <div className="mt-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-4">
                  Boutiques {selectedCategory}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            </motion.div>
          ) : (
            <motion.div
              key="products"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {/* Shop Header */}
              <div className="bg-white rounded-2xl p-4 mb-4 flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-orange-100 flex items-center justify-center overflow-hidden">
                  {selectedShop.company_logo_url ? (
                    <img src={selectedShop.company_logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-orange-400">
                      {selectedShop.company_name?.charAt(0)}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-xl text-slate-800">{selectedShop.company_name}</h2>
                  <p className="text-sm text-slate-500">{selectedShop.company_category}</p>
                </div>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Rechercher un article..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white"
                />
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
      />
    </div>
  );
}