import React, { useState, useEffect, useMemo, Suspense, lazy, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { categoryToSlug, slugToCategory, subcategoryToSlug, slugToSubcategory, getCategoryMeta } from '@/components/utils/urlHelpers';
import { Search, ShoppingCart, ArrowLeft, MapPin, ChevronRight, X, Clock, Zap, ShoppingBag, Plus, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Helmet } from 'react-helmet-async';

// --- COMPOSANTS CRITIQUES (Chargement immédiat) ---
import ProductCard from '@/components/ui/ProductCard';
import SEO from '@/components/SEO';
import { useAuth } from '@/components/auth/useAuth';
import { useGuestCart } from '@/components/cart/useGuestCart';
import { useBackButton } from '@/components/navigation/useBackButton';
import { useActivityTracker } from '@/components/tracking/useActivityTracker';
import { getClientPrice } from '@/components/utils/priceCalculation';
import MerchantProfileAlert from '@/components/home/MerchantProfileAlert';
import FreeShippingBanner from '@/components/home/FreeShippingBanner';
import WeddingCreditBanner from '@/components/home/WeddingCreditBanner';

// --- COMPOSANTS NON-CRITIQUES (Lazy Loading) ---
const RecommendedSection = lazy(() => import('./RecommendedSection'));
const ProductDetailModal = lazy(() => import('@/components/modals/ProductDetailModal'));
const ProfileCompletionModal = lazy(() => import('@/components/modals/ProfileCompletionModal'));
const SmallStories = lazy(() => import('@/components/home/SmallStories'));
const NewMessagesBanner = lazy(() => import('@/components/home/NewMessagesBanner'));

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
  const { user } = useAuth();
  const { addToGuestCart } = useGuestCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { trackProductView, trackCategoryView, trackSearch, trackAddToCart } = useActivityTracker();
  const queryClient = useQueryClient();

  // --- ÉTATS ---
  const [limit, setLimit] = useState(30); // Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const urlParams = new URLSearchParams(location.search);
  const selectedCategory = slugToCategory(urlParams.get('category') || 'Tout');
  const selectedSubCategory = slugToSubcategory(urlParams.get('sub') || '', WEDDING_STRUCTURE);

  useBackButton(() => {
    if (selectedProduct) setSelectedProduct(null);
    else if (selectedShop) setSelectedShop(null);
    else if (selectedCategory !== 'Tout') navigate('/', { replace: true });
  }, selectedProduct || selectedShop || selectedCategory !== 'Tout');

  // --- DATA FETCHING (OPTIMISÉ) ---
  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
    staleTime: 300000
  });

  const { data: allProducts = [], isLoading, isFetching } = useQuery({
    queryKey: ['products-home-paginated', limit],
    queryFn: () => base44.entities.Product.filter({ is_available: true }, { limit: limit }),
    keepPreviousData: true,
    staleTime: 60000
  });

  // --- MOTEUR DE RECHERCHE & FILTRAGE ---
  const filteredProducts = useMemo(() => {
    let results = allProducts;

    // 1. Catégorie
    if (selectedCategory !== 'Tout') {
      results = results.filter(p => p.category === selectedCategory);
    }

    // 2. Recherche par Mots-Clés (Titre, Description, SEO)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      results = results.filter(p => 
        p.name?.toLowerCase().includes(q) || 
        p.description?.toLowerCase().includes(q) || 
        p.seo_keywords?.toLowerCase().includes(q) ||
        p.subcategory?.toLowerCase().includes(q)
      );
    }
    return results;
  }, [allProducts, searchQuery, selectedCategory]);

  // --- HANDLERS ---
  const handleLoadMore = () => setLimit(prev => prev + 30);

  const handleAddToCart = (product, quantity = 1) => {
    trackAddToCart(product);
    const shop = shops.find(s => s.id === product.shop_id);
    if (!user) {
      addToGuestCart({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        quantity,
        unit_price: getClientPrice(product),
        shop_id: shop?.id,
        shop_name: shop?.company_name
      });
      toast.success('Ajouté au panier');
      return;
    }
    // Mutation panier ici...
  };

  const theme = { darkBlue: '#232F3E', amazonOrange: '#FF9900', bgGray: '#EAEDED' };

  return (
    <div className="min-h-screen pb-20 font-sans" style={{ backgroundColor: theme.bgGray }}>
      <Helmet>
        <title>Rapido Presto | Marketplace</title>
      </Helmet>
      
      <header className="sticky top-0 z-50 flex flex-col shadow-md">
        <div className="text-white px-4 py-2 flex items-center gap-4" style={{ backgroundColor: theme.darkBlue }}>
            <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/')}>
                <span className="text-xl font-bold tracking-tight">Rapido</span>
                <span className="text-sm text-orange-400 ml-1">Presto</span>
            </div>

            {/* Moteur de Recherche */}
            <div className="flex-1 max-w-3xl mx-auto flex h-10 rounded-md overflow-hidden bg-white">
                <input 
                  type="text" 
                  placeholder="Rechercher un article, mariage, électronique..." 
                  className="flex-1 px-4 text-black outline-none text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="px-5 transition-colors hover:bg-orange-600" style={{ backgroundColor: theme.amazonOrange }}>
                    <Search className="w-5 h-5 text-gray-900" />
                </button>
            </div>
        </div>
      </header>
      
      <MerchantProfileAlert user={user} />

      <main className="max-w-[1500px] mx-auto p-2 md:p-4">
        <FreeShippingBanner />
        
        {!searchQuery && (
          <Suspense fallback={<div className="h-20" />}>
            <SmallStories onCategorySelect={(c) => navigate(`?category=${categoryToSlug(c)}`)} />
          </Suspense>
        )}

        {selectedCategory === 'Mariage' && <WeddingCreditBanner />}

        <div className="mt-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 px-2">
                {searchQuery ? `Résultats pour "${searchQuery}"` : "Sélection du moment"}
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {filteredProducts.map(product => (
                    <ProductCard 
                        key={product.id} 
                        product={product} 
                        shop={shops.find(s => s.id === product.shop_id)}
                        onClick={() => setSelectedProduct(product)}
                        onAdd={handleAddToCart}
                    />
                ))}
            </div>

            {/* Pagination Button */}
            {allProducts.length >= limit && !searchQuery && (
                <div className="mt-12 flex flex-col items-center gap-2">
                    <Button 
                        onClick={handleLoadMore}
                        disabled={isFetching}
                        className="bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white px-10 py-6 text-lg font-bold rounded-full shadow-lg transition-all"
                    >
                        {isFetching ? <Loader2 className="animate-spin" /> : <Plus className="mr-2" />}
                        VOIR PLUS D'ARTICLES
                    </Button>
                    <span className="text-xs text-gray-400">{allProducts.length} produits affichés</span>
                </div>
            )}
        </div>

        {/* Section Recommandations - Chargée différée */}
        {!searchQuery && (
          <Suspense fallback={<div className="h-40" />}>
            <RecommendedSection 
                allProducts={allProducts} 
                shops={shops} 
                setSelectedProduct={setSelectedProduct} 
                getClientPrice={getClientPrice}
            />
          </Suspense>
        )}
      </main>

      <Suspense fallback={null}>
        {selectedProduct && (
          <ProductDetailModal 
            product={selectedProduct} 
            open={!!selectedProduct} 
            onClose={() => setSelectedProduct(null)} 
            onAddToCart={handleAddToCart}
            shop={shops.find(s => s.id === selectedProduct.shop_id)}
          />
        )}
        <NewMessagesBanner user={user} />
      </Suspense>
    </div>
  );
}