import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowLeft } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProductCard from '@/components/ui/ProductCard';
import { Helmet } from 'react-helmet-async';

export default function Products() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  // Fetch all products
  const { data: allProducts = [], isLoading } = useQuery({
    queryKey: ['all-products'],
    queryFn: () => base44.entities.Product.list(),
    refetchInterval: 60000
  });

  // Fetch all shops
  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true })
  });

  const filteredProducts = allProducts.filter(p => 
    p.is_available !== false && 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Generate dynamic SEO based on search and products
  const seoTitle = searchQuery 
    ? `Recherche: ${searchQuery} - Rapido Presto`
    : "Tous les produits - Rapido Presto";

  const seoDescription = searchQuery
    ? `${filteredProducts.length} résultat${filteredProducts.length > 1 ? 's' : ''} pour "${searchQuery}" - Livraison rapide en Haïti`
    : `Découvrez ${allProducts.length} produits disponibles - Fastfood, Restaurants, Fleurs, Pharmacie, Mode et plus encore - Livraison en 30 minutes`;

  const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
  const keywords = [
    'acheter en ligne Haïti',
    'livraison rapide',
    'e-commerce Haïti',
    ...categories,
    ...(searchQuery ? [searchQuery] : [])
  ].join(', ');

  return (
    <div className="min-h-screen bg-white pb-20">
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={keywords} />
        <link rel="canonical" href="https://rapidopresto.shop/Products" />

        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content="https://rapidopresto.shop/Products" />

        {/* Schema.org for product listing */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": "Tous les produits",
            "description": seoDescription,
            "url": "https://rapidopresto.shop/Products",
            "numberOfItems": filteredProducts.length
          })}
        </script>
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 bg-white z-50 shadow-sm">
        <div className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.location.href = '/'}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-orange-500">Tous les produits</h1>
          </div>

          {/* Search Bar */}
          <div className="flex items-center bg-slate-100 rounded-full px-4 py-3">
            <Search className="text-slate-400 mr-2 w-5 h-5" />
            <input 
              type="text" 
              placeholder='Rechercher un produit...' 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none w-full text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4">
              {filteredProducts.length} produit{filteredProducts.length > 1 ? 's' : ''} disponible{filteredProducts.length > 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.map(product => {
                const shop = shops.find(s => s.id === product.shop_id);
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    shop={shop}
                    onClick={() => window.location.href = `/product?id=${product.id}`}
                    onAdd={() => {
                      if (!user) {
                        base44.auth.redirectToLogin(window.location.pathname);
                        return;
                      }
                      window.location.href = `/product?id=${product.id}`;
                    }}
                  />
                );
              })}
            </div>
          </>
        )}

        {!isLoading && filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-slate-500">Aucun produit trouvé</p>
          </div>
        )}
      </div>
    </div>
  );
}