import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { slugToCategory } from '@/components/utils/urlHelpers';
import { Search, ShoppingCart, ArrowLeft, Zap, Plus, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Helmet } from 'react-helmet-async';

// Composants critiques (Chargement immédiat)
import ProductCard from '@/components/ui/ProductCard';
import SEO from '@/components/SEO';
import { useAuth } from '@/components/auth/useAuth';
import { useGuestCart } from '@/components/cart/useGuestCart';
import MerchantProfileAlert from '@/components/home/MerchantProfileAlert';
import FreeShippingBanner from '@/components/home/FreeShippingBanner';

// Chargement différé (Lazy Loading) pour alléger le JS initial
const RecommendedSection = lazy(() => import('./RecommendedSection'));
const ProductDetailModal = lazy(() => import('@/components/modals/ProductDetailModal'));
const SmallStories = lazy(() => import('@/components/home/SmallStories'));

export default function Home() {
  const { user } = useAuth();
  const { addToGuestCart } = useGuestCart();
  const navigate = useNavigate();
  const location = useLocation();
  
  // --- ÉTATS ---
  const [limit, setLimit] = useState(30); // Gestion du "Voir plus"
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);

  const urlParams = new URLSearchParams(location.search);
  const selectedCategory = slugToCategory(urlParams.get('category') || 'Tout');

  // --- RÉCUPÉRATION DES DONNÉES ---
  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
    staleTime: 300000 // Cache de 5 minutes
  });

  const { data: allProducts = [], isLoading, isFetching } = useQuery({
    queryKey: ['products-home', limit], // Se rafraîchit quand limit change
    queryFn: () => base44.entities.Product.filter({ is_available: true }, { limit: limit }),
    keepPreviousData: true, // Évite le clignotement blanc lors du "Voir plus"
    staleTime: 60000
  });

  // --- MOTEUR DE RECHERCHE ET FILTRAGE LOCAL ---
  // On utilise useMemo pour que le filtrage soit instantané même avec beaucoup de produits
  const filteredProducts = useMemo(() => {
    let results = allProducts;

    // 1. Filtre par catégorie (depuis l'URL)
    if (selectedCategory !== 'Tout') {
      results = results.filter(p => p.category === selectedCategory);
    }

    // 2. Filtre par recherche (Titre, SEO, Description)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      results = results.filter(p => 
        (p.name?.toLowerCase().includes(q)) || 
        (p.description?.toLowerCase().includes(q)) ||
        (p.subcategory?.toLowerCase().includes(q)) ||
        (p.seo_keywords?.toLowerCase().includes(q)) // Filtre SEO inclus
      );
    }

    return results;
  }, [allProducts, searchQuery, selectedCategory]);

  // --- HANDLERS ---
  const handleLoadMore = () => {
    setLimit(prev => prev + 30);
  };

  const handleAddToCart = (product) => {
    const shop = shops.find(s => s.id === product.shop_id);
    addToGuestCart({
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url,
      quantity: 1,
      unit_price: product.price, // Utilise ta fonction getClientPrice si nécessaire
      shop_id: shop?.id,
      shop_name: shop?.company_name
    });
    toast.success('Ajouté au panier');
  };

  const theme = { 
    darkBlue: '#232F3E', 
    amazonOrange: '#FF9900', 
    bgGray: '#EAEDED' 
  };

  return (
    <div className="min-h-screen pb-20 font-sans" style={{ backgroundColor: theme.bgGray }}>
      <Helmet>
        <title>Rapido Presto | E-commerce Haïti</title>
      </Helmet>
      
      <header className="sticky top-0 z-50 flex flex-col shadow-md">
        <div className="text-white px-4 py-2 flex items-center gap-4" style={{ backgroundColor: theme.darkBlue }}>
            {/* LOGO */}
            <div className="flex-shrink-0 cursor-pointer" onClick={() => { setSearchQuery(''); navigate('/'); }}>
                <div className="flex flex-col leading-tight">
                    <span className="text-xl font-bold tracking-tight">Rapido</span>
                    <span className="text-sm text-orange-400 -mt-1 ml-4">Presto</span>
                </div>
            </div>

            {/* BARRE DE RECHERCHE INTELLIGENTE */}
            <div className="flex-1 max-w-3xl mx-auto flex h-10 rounded-md overflow-hidden bg-white shadow-inner">
                <input 
                  type="text" 
                  placeholder="Rechercher par titre, catégorie, mots-clés..." 
                  className="flex-1 px-4 text-black outline-none text-sm md:text-base"
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

        {/* Stories - Chargées uniquement si pas de recherche en cours */}
        {!searchQuery && (
          <Suspense fallback={<div className="h-24" />}>
            <SmallStories onCategorySelect={(c) => {
                const slug = categoryToSlug(c);
                navigate(`?category=${slug}`);
            }} />
          </Suspense>
        )}

        {/* GRILLE DE PRODUITS (Dynamique) */}
        <div className="mt-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 px-2">
                {searchQuery ? `Résultats pour "${searchQuery}"` : "Découvrez nos articles"}
            </h2>
            
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

            {/* ÉCRAN VIDE SI PAS DE RÉSULTATS */}
            {filteredProducts.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                    <Search className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg">Aucun article ne correspond à votre recherche.</p>
                </div>
            )}
        </div>

        {/* BOUTON VOIR PLUS (Pagination) */}
        {allProducts.length >= limit && !searchQuery && (
            
            <div className="mt-12 flex flex-col items-center gap-4">
                <Button 
                    onClick={handleLoadMore}
                    disabled={isFetching}
                    className="bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-500 hover:text-white px-12 py-6 text-lg font-black rounded-full shadow-xl transition-all active:scale-95"
                >
                    {isFetching ? (
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    ) : (
                        <Plus className="w-6 h-6 mr-2" />
                    )}
                    VOIR PLUS D'ARTICLES
                </Button>
                <p className="text-xs text-gray-400">Affichage de {allProducts.length} articles</p>
            </div>
        )}

        {/* SECTION RECOMMANDATIONS (Sous le contenu principal) */}
        {!searchQuery && (
            <Suspense fallback={<div className="h-40" />}>
                <div className="mt-16">
                    <RecommendedSection 
                        allProducts={allProducts} 
                        shops={shops} 
                        setSelectedProduct={setSelectedProduct} 
                    />
                </div>
            </Suspense>
        )}
      </main>

      {/* MODALS EN LAZY LOADING */}
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
      </Suspense>
    </div>
  );
}