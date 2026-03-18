import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Tag, Store, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { useAuth } from '@/components/auth/useAuth';
import ProductDetailModal from '@/components/modals/ProductDetailModal';
import { toast } from 'sonner';
import SEO from '@/components/SEO';
import { useActivityTracker } from '@/components/tracking/useActivityTracker';
import { trackMetaEvent } from '@/components/utils/metaTracking';

const CATEGORIES = [
  'Fastfood', 'Restaurants', 'Boutique Fleurs', 'Pharmacie', 'Mariage',
  'Epicerie', 'Café', 'Pour Femme', 'Electronics', 'Pour homme', 'Maison',
  'Bébé', 'Outils', 'Bijoux', 'Matériels Décor'
];

const ProductCard = ({ product, shop, onClick }) => {
  const price = applyClientMargin(product.promo_price || product.price);
  const originalPrice = product.promo_price ? applyClientMargin(product.price) : null;
  const hasPromo = product.promo_price && product.promo_price < product.price;

  return (
    <div
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="relative aspect-square bg-slate-100">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300">
            <ShoppingBag className="w-10 h-10" />
          </div>
        )}
        {hasPromo && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            -{Math.round((1 - product.promo_price / product.price) * 100)}%
          </div>
        )}
        {product.is_available === false && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-xs font-bold bg-black/60 px-3 py-1 rounded-full">Rupture de stock</span>
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[11px] text-slate-400 truncate">{shop?.company_name || ''}</p>
        <p className="text-sm font-semibold text-slate-800 truncate leading-tight mt-0.5">{product.name}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className="text-sm font-black text-orange-500">{price.toLocaleString()} HTG</span>
          {originalPrice && (
            <span className="text-[11px] text-slate-400 line-through">{originalPrice.toLocaleString()}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default function Products() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { trackProductView, trackCategoryView, trackSearch } = useActivityTracker();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategories, setShowCategories] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);

  // Track PageView Meta Pixel
  useEffect(() => {
    trackMetaEvent('PageView');
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        page_title: 'Marketplace - Rapido Presto',
        page_location: window.location.href,
      });
    }
  }, []);

  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => base44.entities.Product.filter({ is_available: true }, '-created_date', 200),
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ product, quantity }) => {
      if (!user) {
        base44.auth.redirectToLogin(window.location.pathname);
        return;
      }
      const price = applyClientMargin(product.promo_price || product.price);
      const shop = shops.find(s => s.id === product.shop_id);
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

  const handleAddToCart = (product, quantity = 1) => {
    addToCartMutation.mutate({ product, quantity });
  };

  const filteredProducts = allProducts.filter(p => {
    const matchSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = !selectedCategory || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleProductClick = (product) => {
    const shop = shops.find(s => s.id === product.shop_id);
    trackProductView(product, shop);
    trackMetaEvent('ViewContent', {
      content_ids: [product.id],
      content_type: 'product',
      content_name: product.name,
      value: applyClientMargin(product.promo_price || product.price),
      currency: 'HTG',
    });
    setSelectedProduct(product);
    setSelectedShop(shop || null);
  };

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setShowCategories(false);
    if (cat) trackCategoryView(cat);
  };

  const handleSearchChange = (value) => {
    setSearchQuery(value);
    if (value.length > 2) trackSearch(value);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 pb-20">
      <ProductDetailModal
        product={selectedProduct}
        shop={selectedShop}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        user={user}
        onProductChange={(p) => {
          setSelectedProduct(p);
          setSelectedShop(shops.find(s => s.id === p.shop_id) || null);
        }}
      />
      <Helmet>
        <title>Tous les produits - Rapido Presto</title>
        <meta name="description" content="Découvrez tous les produits disponibles sur Rapido Presto - Livraison rapide en Haïti" />
      </Helmet>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Marketplace</h1>

        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center bg-slate-100 rounded-full px-4 py-2.5 gap-2">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none w-full text-sm text-slate-700 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-4 pb-3 flex gap-2">
          <button
            onClick={() => navigate('/Dashboard')}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 text-white py-2 px-4 rounded-full text-sm font-semibold hover:bg-orange-600 transition"
          >
            <Store className="w-4 h-4" />
            <span>Ma boutique</span>
          </button>
          <button
            onClick={() => setShowCategories(!showCategories)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-sm font-semibold transition ${
              showCategories || selectedCategory
                ? 'bg-orange-500 text-white'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>{selectedCategory || 'Catégories'}</span>
          </button>
        </div>

        {/* Categories dropdown */}
        {showCategories && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setSelectedCategory(null); setShowCategories(false); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  !selectedCategory ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Tous
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setShowCategories(false); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    selectedCategory === cat ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-slate-800">
            {selectedCategory ? selectedCategory : 'Sélection du jour'}
          </h2>
          <span className="text-xs text-slate-400">{filteredProducts.length} produits</span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500"></div>
            <p className="text-sm text-slate-500">Chargement des produits...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">📦</div>
            <p className="text-slate-500">Aucun produit trouvé</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(product => {
              const shop = shops.find(s => s.id === product.shop_id);
              return (
                <ProductCard
                  key={product.id}
                  product={product}
                  shop={shop}
                  onClick={() => handleProductClick(product)}
                />
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}