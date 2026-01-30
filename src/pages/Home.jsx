import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { categoryToSlug, slugToCategory, subcategoryToSlug, slugToSubcategory, getCategoryMeta } from '@/components/utils/urlHelpers';
import { Search, ShoppingCart, ArrowLeft, MapPin, ChevronRight, X, Clock, Zap, ShoppingBag, Plus, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Helmet } from 'react-helmet-async';

// Import des composants
import ProductCard from '@/components/ui/ProductCard';
import { getClientPrice } from '@/components/utils/priceCalculation';
import SEO from '@/components/SEO';
import SmallStories from '@/components/home/SmallStories';
import { useAuth } from '@/components/auth/useAuth';
import { useGuestCart } from '@/components/cart/useGuestCart';
import WeddingCreditBanner from '@/components/home/WeddingCreditBanner';
import { useBackButton } from '@/components/navigation/useBackButton';
import { useActivityTracker } from '@/components/tracking/useActivityTracker';
import MerchantProfileAlert from '@/components/home/MerchantProfileAlert';
import FreeShippingBanner from '@/components/home/FreeShippingBanner';

// Lazy loading pour alléger le chargement initial
const RecommendedSection = lazy(() => import('./RecommendedSection'));
const ProductDetailModal = lazy(() => import('@/components/modals/ProductDetailModal'));
const NewMessagesBanner = lazy(() => import('@/components/home/NewMessagesBanner'));

const WEDDING_STRUCTURE = [
  { title: "Robe de Mariage", subtypes: ["Robe Sirène", "Robe Catalina", "Robe Ponpon (Princesse)", "Robe Civil"] },
  { title: "Demoiselle d'honneur" }, { title: "Annonceuse" }, { title: "Témoins" },
  { title: "Bague de Mariage" }, { title: "Bague" }, { title: "Accessoires" },
  { title: "Carte et programmation" }, { title: "Matériels Décor" }
];

export default function Home() {
  const { user } = useAuth();
  const { addToGuestCart } = useGuestCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { trackProductView, trackCategoryView, trackSearch, trackAddToCart } = useActivityTracker();
  const queryClient = useQueryClient();

  // --- ÉTATS ---
  const [limit, setLimit] = useState(30); // État pour le "Voir plus"
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);

  const urlParams = new URLSearchParams(location.search);
  const selectedCategory = slugToCategory(urlParams.get('category') || 'Tout');

  // --- RÉCUPÉRATION DES DONNÉES ---
  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
    staleTime: 300000
  });

  // On récupère les produits avec la limite dynamique
  const { data: allProducts = [], isLoading, isFetching } = useQuery({
    queryKey: ['products-home', limit],
    queryFn: () => base44.entities.Product.filter({ is_available: true }, { limit: limit }),
    keepPreviousData: true,
    staleTime: 60000
  });

  // --- LOGIQUE DE RECHERCHE & FILTRAGE ---
  // On utilise useMemo pour filtrer sur le Titre, SEO (tags) et Description
  const filteredProducts = useMemo(() => {
    let results = allProducts;

    // 1. Filtre par catégorie (URL)
    if (selectedCategory !== 'Tout') {
      results = results.filter(p => p.category === selectedCategory);
    }

    // 2. Filtre par recherche (Mots-clés)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      results = results.filter(p => 
        (p.name?.toLowerCase().includes(q)) || 
        (p.description?.toLowerCase().includes(q)) || 
        (p.seo_keywords?.toLowerCase().includes(q)) || // Assure-toi que ce champ existe en BDD
        (p.subcategory?.toLowerCase().includes(q))
      );
    }
    return results;
  }, [allProducts, searchQuery, selectedCategory]);

  // --- HANDLERS ---
  const handleLoadMore = () => {
    setLimit(prev => prev + 30); // Ajoute 30 produits de plus
  };

  const handleAddToCart = (product, quantity = 1) => {
    trackAddToCart(product);
    const shop = shops.find(s => s.id === product.shop_id);
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
  };

  const theme = { darkBlue: '#232F3E', amazonOrange: '#FF9900', bgGray: '#EAEDED' };

  return (
    <div className="min-h-screen pb-20 font-sans" style={{ backgroundColor: theme.bgGray }}>
      <Helmet>
        <title>Rapido Presto | Boutique en ligne</title>
      </Helmet>
      
      <header className="sticky top-0 z-50 flex flex-col shadow-md">
        <div className="text-white px-4 py-2 flex items-center gap-4" style={{ backgroundColor: theme.darkBlue }}>
            <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/')}>
                <span className="text-xl font-bold">Rapido</span>
                <span className="text-sm text-orange-400 ml-1">Presto</span>
            </div>

            {/* BARRE DE RECHERCHE AMÉLIORÉE */}
            <div className="flex-1 max-w-3xl mx-auto flex h-10 rounded-md overflow-hidden bg-white">
                <input 
                  type="text" 
                  placeholder="Rechercher par titre, description, mots-clés..." 
                  className="flex-1 px-4 text-black outline-none text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="px-5 transition-colors" style={{ backgroundColor: theme.amazonOrange }}>
                    <Search className="w-5 h-5 text-gray-900" />
                </button>
            </div>
        </div>
      </header>
      
      <main className="max-w-[1500px] mx-auto p-2 md:p-4">
        <MerchantProfileAlert user={user} />
        <FreeShippingBanner />
        
        {!searchQuery && (
          <SmallStories onCategorySelect={(c) => navigate(`?category=${categoryToSlug(c)}`)} />
        )}

        {selectedCategory === 'Mariage' && <WeddingCreditBanner />}

        <div className="mt-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 px-2">
                {searchQuery ? `Résultats pour "${searchQuery}"` : "Nos articles populaires"}
            </h2>
            
            {/* GRILLE DE PRODUITS */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
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

            {/* ÉTAT VIDE SI RECHERCHE SANS RÉSULTAT */}
            {filteredProducts.length === 0 && !isLoading && (
                <div className="text-center py-20 bg-white rounded-lg mt-4">
                    <p className="text-gray-500 italic">Aucun article ne correspond à votre recherche.</p>
                </div>
            )}

            {/* BOUTON VOIR PLUS */}
            {allProducts.length >= limit && !searchQuery && (
                <div className="mt-12 flex justify-center">
                    <Button 
                        onClick={handleLoadMore}
                        disabled={isFetching}
                        className="bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white px-12 py-6 text-lg font-black rounded-full shadow-xl transition-all"
                    >
                        {isFetching ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                        VOIR PLUS D'ARTICLES
                    </Button>
                </div>
            )}
        </div>

        {/* RECOMMANDATIONS (Uniquement hors recherche) */}
        {!searchQuery && (
          <Suspense fallback={<div className="h-40" />}>
            <RecommendedSection 
                allProducts={allProducts} 
                shops={shops} 
                setSelectedProduct={setSelectedProduct} 
            />
          </Suspense>
        )}
      </main>

      {/* MODAL DETAIL PRODUIT */}
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