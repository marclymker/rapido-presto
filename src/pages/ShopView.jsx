import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, ShoppingCart, ArrowLeft, MapPin, Star, Phone } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Helmet } from 'react-helmet-async';
import ProductCard from '@/components/ui/ProductCard';
import ProductDetailModal from '@/components/modals/ProductDetailModal';
import { getClientPrice } from '@/components/utils/priceCalculation';
import { useAuth } from '@/components/auth/useAuth';
import { useGuestCart } from '@/components/cart/useGuestCart';

const WEDDING_STRUCTURE = [
  {
    title: "Robe de Mariage",
    subtypes: ["Robe Sirène", "Robe Catalina", "Robe Ponpon (Princesse)", "Robe Civil"]
  },
  { title: "Demoiselle d'honneur" },
  { title: "Annonceuse" },
  { title: "Témoins" },
  { title: "Bague de Mariage" },
  { title: "Bague" },
  { title: "Accessoires" },
  { title: "Carte et programmation" },
  { title: "Matériels Décor" }
];

export default function ShopView() {
  const { user } = useAuth();
  const { addToGuestCart } = useGuestCart();
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const queryClient = useQueryClient();

  // Get shop slug and product slug from URL
  const urlParams = new URLSearchParams(window.location.search);
  const shopSlug = urlParams.get('slug');
  const productSlug = urlParams.get('product');

  // Fetch shop by slug
  const { data: shops = [], isLoading: loadingShop } = useQuery({
    queryKey: ['shop', shopSlug],
    queryFn: () => base44.entities.Shop.filter({ slug: shopSlug }),
    enabled: !!shopSlug
  });

  const shop = shops[0];

  // Fetch products for this shop
  const { data: allProducts = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['shop-products', shop?.id],
    queryFn: () => base44.entities.Product.filter({ shop_id: shop?.id, is_available: true }),
    enabled: !!shop?.id
  });

  // Auto-open product if product slug in URL
  React.useEffect(() => {
    if (productSlug && allProducts.length > 0) {
      const product = allProducts.find(p => p.slug === productSlug || p.id === productSlug);
      if (product) {
        setSelectedProduct(product);
      }
    }
  }, [productSlug, allProducts]);

  // Filter products by category
  const filteredProducts = useMemo(() => {
    let filtered = allProducts;

    if (selectedCategory !== 'Tout') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(p => 
        p.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [allProducts, selectedCategory, searchQuery]);

  // Get categories from products
  const categories = useMemo(() => {
    const cats = new Set(allProducts.map(p => p.category).filter(Boolean));
    return ['Tout', ...Array.from(cats)];
  }, [allProducts]);

  // Wedding products grouping
  const weddingProductsBySubCategory = useMemo(() => {
    if (selectedCategory !== 'Mariage') return {};
    const weddingProducts = filteredProducts;
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
  }, [filteredProducts, selectedCategory]);

  // Cart management
  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ product, quantity = 1 }) => {
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
          shop_id: shop?.id,
          shop_name: shop?.company_name,
          shop_region: shop?.region
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Ajouté au panier');
    }
  });

  const handleAddToCart = (product, quantity = 1) => {
    if (!user) { 
      // Add to guest cart
      addToGuestCart({
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        quantity: quantity,
        unit_price: getClientPrice(product),
        shop_id: shop?.id,
        shop_name: shop?.company_name,
        shop_region: shop?.region
      });
      toast.success('Ajouté au panier');
      return; 
    }
    addToCartMutation.mutate({ product, quantity });
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  if (!shopSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Boutique non trouvée</h2>
          <Button onClick={() => window.location.href = createPageUrl('Home')}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  if (loadingShop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Boutique non trouvée</h2>
          <Button onClick={() => window.location.href = createPageUrl('Home')}>
            Retour à l'accueil
          </Button>
        </div>
      </div>
    );
  }

  // Get selected product for meta tags
  const selectedProductForMeta = selectedProduct || (productSlug && allProducts.find(p => p.slug === productSlug));
  const pageTitle = selectedProductForMeta 
    ? `${selectedProductForMeta.name} - ${shop.company_name}` 
    : `${shop.company_name}`;
  const pageDescription = selectedProductForMeta 
    ? `${selectedProductForMeta.description || selectedProductForMeta.name} - ${getClientPrice(selectedProductForMeta)} Gourdes` 
    : `Découvrez ${shop.company_name} sur Rapido Presto. ${shop.company_category} à ${shop.region}.`;
  const pageImage = selectedProductForMeta?.image_url || shop.company_logo_url;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Helmet>
        <title>{pageTitle} - Rapido Presto</title>
        <meta name="description" content={pageDescription} />
        
        {/* Open Graph pour partages */}
        <meta property="og:type" content={selectedProductForMeta ? "product" : "website"} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:site_name" content="Rapido Presto" />
        {pageImage && <meta property="og:image" content={pageImage} />}
        {pageImage && <meta property="og:image:width" content="1200" />}
        {pageImage && <meta property="og:image:height" content="630" />}
        <meta property="og:url" content={window.location.href} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        {pageImage && <meta name="twitter:image" content={pageImage} />}
      </Helmet>

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.location.href = createPageUrl('Home')}
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>

            <div className="flex-1">
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Rechercher dans cette boutique..."
                  className="bg-transparent outline-none w-full text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => window.location.href = createPageUrl('Cart')}
            >
              <ShoppingCart className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* Shop Header */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 rounded-full border-2 border-orange-100 overflow-hidden flex-shrink-0">
              {shop.company_logo_url ? (
                <img src={shop.company_logo_url} className="w-full h-full object-cover" alt={shop.company_name} />
              ) : (
                <div className="w-full h-full bg-orange-50 flex items-center justify-center text-4xl">
                  🏪
                </div>
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{shop.company_name}</h1>
              <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                <Badge variant="secondary">{shop.company_category}</Badge>
                {shop.region && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {shop.region}
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {shop.phone}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{shop.rating || 4.5}</span>
                </div>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-600">
                  {allProducts.length} produit{allProducts.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="bg-white rounded-lg mb-6 shadow-sm overflow-x-auto">
          <div className="flex gap-2 p-4 whitespace-nowrap">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setSelectedSubCategory(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar for Wedding categories */}
          {selectedCategory === 'Mariage' && (
            <aside className="w-full md:w-64 bg-white rounded-lg p-4 h-fit shadow-sm">
              <h3 className="font-bold text-lg mb-4">Départements</h3>
              <div className="space-y-1">
                <div
                  className={`cursor-pointer text-sm p-2 rounded hover:bg-gray-100 ${
                    !selectedSubCategory ? 'font-bold bg-gray-50 text-orange-600' : ''
                  }`}
                  onClick={() => setSelectedSubCategory(null)}
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
                            className={`cursor-pointer text-sm p-2 pl-4 rounded hover:bg-gray-100 ${
                              selectedSubCategory === sub ? 'font-bold text-orange-600 bg-gray-50' : 'text-gray-600'
                            }`}
                            onClick={() => setSelectedSubCategory(sub)}
                          >
                            {sub}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div
                        className={`cursor-pointer text-sm p-2 rounded hover:bg-gray-100 ${
                          selectedSubCategory === group.title ? 'font-bold text-orange-600 bg-gray-50' : 'text-gray-600'
                        }`}
                        onClick={() => setSelectedSubCategory(group.title)}
                      >
                        {group.title}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </aside>
          )}

          {/* Products Grid */}
          <main className="flex-1">
            {selectedCategory === 'Mariage' ? (
              <div className="space-y-6">
                {selectedSubCategory ? (
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <h2 className="text-xl font-bold mb-4">{selectedSubCategory}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {weddingProductsBySubCategory[selectedSubCategory]?.map(product => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          shop={shop}
                          onAdd={handleAddToCart}
                          onClick={() => {
                            window.history.pushState({}, '', `${window.location.pathname}?slug=${shopSlug}&product=${product.slug || product.id}`);
                            setSelectedProduct(product);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  Object.entries(weddingProductsBySubCategory).map(([subCat, items]) => (
                    <div key={subCat} className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">{subCat}</h3>
                        <Button
                          variant="link"
                          className="text-sm text-orange-600"
                          onClick={() => setSelectedSubCategory(subCat)}
                        >
                          Voir plus
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {items.slice(0, 4).map(product => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            shop={shop}
                            onAdd={handleAddToCart}
                            onClick={() => setSelectedProduct(product)}
                          />
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredProducts.map(product => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      shop={shop}
                      onAdd={handleAddToCart}
                      onClick={() => setSelectedProduct(product)}
                    />
                  ))}
                </div>
                {filteredProducts.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500">Aucun produit trouvé</p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <ProductDetailModal
        product={selectedProduct}
        shop={shop}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        user={user}
        similarProducts={[]}
        onProductChange={(newProduct) => setSelectedProduct(newProduct)}
      />
    </div>
  );
}