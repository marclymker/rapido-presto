import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { categoryToSlug, slugToCategory, subcategoryToSlug, slugToSubcategory, getCategoryMeta } from '@/components/utils/urlHelpers';
import { Search, ShoppingCart, ArrowLeft, MapPin, ChevronRight, X, Clock, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Helmet } from 'react-helmet-async';

// Composants internes
import ProductCard from '@/components/ui/ProductCard';
import ProductDetailModal from '@/components/modals/ProductDetailModal';
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
import FloatingMerchantBanner from '@/components/home/FloatingMerchantBanner';
import MerchantProfileAlert from '@/components/home/MerchantProfileAlert';
import FlashBanner from '@/components/home/FlashBanner';
import FlowersBanner from '@/components/home/FlowersBanner';
import GiftBanner from '@/components/home/GiftBanner';
import AdvancedSearch from '@/components/search/AdvancedSearch';
import SearchResults from '@/components/search/SearchResults';
import NewMessagesBanner from '@/components/home/NewMessagesBanner';
import FreeShippingBanner from '@/components/home/FreeShippingBanner';

const WEDDING_STRUCTURE = [
  { title: "Robe de Mariage", subtypes: ["Robe Sirène", "Robe Catalina", "Robe Ponpon (Princesse)", "Robe Civil"] },
  { title: "Demoiselle d'honneur" }, { title: "Annonceuse" }, { title: "Témoins" },
  { title: "Bague de Mariage" }, { title: "Bague" }, { title: "Accessoires" },
  { title: "Carte et programmation" }, { title: "Matériels Décor" }
];

const MONCASH_LOGO = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/MonCash_logo.svg/1024px-MonCash_logo.svg.png";

export default function Home() {
  const { user } = useAuth();
  const { addToGuestCart } = useGuestCart();
  const navigate = useNavigate();
  const location = useLocation();
  const { trackProductView, trackCategoryView, trackSearch, trackAddToCart } = useActivityTracker();
  const queryClient = useQueryClient();

  const [selectedShop, setSelectedShop] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCartReminder, setShowCartReminder] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);

  const urlParams = new URLSearchParams(location.search);
  const selectedCategory = slugToCategory(urlParams.get('category') || '');
  const selectedSubCategory = slugToSubcategory(urlParams.get('sub') || '', WEDDING_STRUCTURE);

  // OPTIMISATION : Refresh toutes les 5 minutes au lieu de 60s
  useAutoRefresh({ queryKey: ['shops'], refetchInterval: 300000, enabled: !selectedShop });
  useAutoRefresh({ queryKey: ['products'], refetchInterval: 300000, enabled: !!selectedShop });

  useBackButton(() => {
    if (selectedProduct) setSelectedProduct(null);
    else if (selectedShop) setSelectedShop(null);
    else if (selectedCategory !== 'Tout') navigate('/', { replace: true });
  }, selectedProduct || selectedShop || selectedCategory !== 'Tout');

  useEffect(() => {
    // Géolocalisation légère : getCurrentPosition remplace watchPosition
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 5000 });
    }
  }, []);

  const { data: shops = [] } = useQuery({ 
    queryKey: ['shops'], 
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
    staleTime: 600000 
  });

  const { data: allProducts = [] } = useQuery({ 
    queryKey: ['all-products'], 
    queryFn: () => base44.entities.Product.list(),
    staleTime: 600000 
  });

  // OPTIMISATION : Fixé à 40 articles et utilisation de useMemo pour stopper le lag CPU
  const bestSellers = useMemo(() => {
    return allProducts
      .filter(p => p.image_url && p.is_available !== false)
      .slice(0, 40);
  }, [allProducts]);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = (product, quantity = 1) => {
    trackAddToCart(product);
    if (!user) {
      addToGuestCart({
        product_id: product.id, product_name: product.name, product_image: product.image_url,
        quantity, unit_price: getClientPrice(product)
      });
      toast.success('Ajouté');
      return;
    }
    // Mutation simplifiée ici pour la démo
    toast.success('Ajouté au panier');
  };

  return (
    <div className="min-h-screen pb-20 bg-[#EAEDED] font-sans">
      <Helmet>
        <meta name="google-adsense-account" content="ca-pub-2183521622591299" />
      </Helmet>
      
      <header className="sticky top-0 z-50 bg-[#232F3E] text-white p-2 shadow-md">
        <div className="max-w-[1500px] mx-auto flex items-center gap-3">
            <div className="cursor-pointer" onClick={() => navigate('/')}>
                <span className="text-lg font-bold">Rapido</span>
                <span className="text-sm text-orange-400 ml-1">Presto</span>
            </div>
            <div className="flex-1 flex bg-white rounded h-9 overflow-hidden">
                <input 
                  type="text" placeholder="Rechercher..." className="flex-1 px-3 text-black text-sm outline-none"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="px-4 bg-[#FF9900]" onClick={() => setShowAdvancedSearch(true)}><Search size={18} className="text-gray-900"/></button>
            </div>
            <div className="relative" onClick={() => window.location.href = createPageUrl('Cart')}>
                <ShoppingCart size={24} />
                <span className="absolute -top-1 -right-2 bg-[#FF9900] text-gray-900 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>
            </div>
        </div>
      </header>

      <main className="max-w-[1500px] mx-auto p-2">
        <RecruitmentBanner />
        <FreeShippingBanner />
        <SmallStories onCategorySelect={(c) => navigate(`?category=${categoryToSlug(c)}`)} />
        
        {showAdvancedSearch ? (
          <SearchResults results={searchResults} query={searchQuery} shops={shops} user={user} onAddToCart={handleAddToCart} />
        ) : (
          <div className="space-y-4">
            <FlashBanner />
            <CreditBanner />
            
            <div className="bg-white p-2 rounded shadow-sm border border-gray-100">
                <h2 className="text-base font-bold mb-3 px-1">Meilleures Ventes</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-0 border-t border-l">
                {bestSellers.map((product) => {
                  const price = getClientPrice(product);
                  const isMakarios = product.category === 'Mariage';
                  return (
                    <div 
                      key={product.id}
                      onClick={() => setSelectedProduct(product)}
                      className="bg-white p-2 border-r border-b relative cursor-pointer group flex flex-col h-full hover:shadow-md transition-shadow"
                    >
                      <div className="absolute top-1 left-1 z-20">
                          <img src={MONCASH_LOGO} className="h-3 w-auto" alt="MonCash" />
                      </div>
                      <div className="aspect-square mb-2 bg-gray-50 rounded overflow-hidden">
                        <img src={`${product.image_url}?w=200&q=60`} className="w-full h-full object-contain" alt="" loading="lazy" />
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm font-black">{Math.floor(price).toLocaleString()}</span>
                        <span className="text-[8px] font-bold">HTG</span>
                      </div>
                      <h3 className="text-[10px] text-gray-500 truncate mt-1">{product.name}</h3>
                      <div className={`mt-auto pt-1 text-[8px] font-bold uppercase ${isMakarios ? 'text-blue-600' : 'text-amber-600'}`}>
                        <Zap size={8} className="inline mr-1" /> {isMakarios ? 'Makarios' : 'Rapido'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <RecommendedSection 
              allProducts={allProducts} shops={shops} user={user} 
              setSelectedProduct={setSelectedProduct} getClientPrice={getClientPrice} 
            />
          </div>
        )}
      </main>

      <ProductDetailModal 
        product={selectedProduct} 
        shop={shops.find(s => s.id === selectedProduct?.shop_id)} 
        open={!!selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
        onAddToCart={handleAddToCart}
      />
      <NewMessagesBanner user={user} />
      <ProfileCompletionModal user={user} open={showProfileModal} onComplete={() => setShowProfileModal(false)} />
    </div>
  );
}

// Composant Recommandations avec optimisation Scroll
function RecommendedSection({ allProducts, shops, user, setSelectedProduct, getClientPrice }) {
  const containerRef = useRef(null);

  const rowProducts = useMemo(() => {
    return allProducts.filter(p => p.image_url && p.is_available !== false).slice(10, 25);
  }, [allProducts]);

  if (!rowProducts.length) return null;

  return (
    <div className="bg-white p-3 rounded shadow-sm border border-gray-200 mt-4">
      <h3 className="text-sm font-bold mb-3">Recommandé pour vous</h3>
      <div ref={containerRef} className="flex overflow-x-auto gap-3 pb-2 no-scrollbar scroll-smooth">
        {rowProducts.map((product) => (
          <div 
            key={product.id} 
            className="flex-shrink-0 w-[120px] cursor-pointer"
            onClick={() => setSelectedProduct(product)}
          >
            <div className="aspect-square bg-gray-50 rounded mb-1 overflow-hidden relative">
              <img src={`${product.image_url}?w=150&q=60`} className="w-full h-full object-contain" loading="lazy" alt="" />
              <img src={MONCASH_LOGO} className="absolute top-1 left-1 h-2 w-auto" alt="" />
            </div>
            <div className="text-xs font-bold truncate">{Math.floor(getClientPrice(product)).toLocaleString()} G</div>
            <div className="text-[9px] text-gray-500 truncate">{product.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}