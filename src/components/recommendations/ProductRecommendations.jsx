import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProductCard from '@/components/ui/ProductCard';
import { Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProductRecommendations({ user, onProductClick, onAddToCart, selectedShop, limit = 6 }) {
  // Fetch all products and shops
  const { data: allProducts = [] } = useQuery({
    queryKey: ['all-products-recommendations'],
    queryFn: () => base44.entities.Product.filter({ is_available: true }),
    refetchInterval: 300000,
    staleTime: 240000
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['shops-recommendations'],
    queryFn: () => base44.entities.Shop.filter({ is_active: true }),
    refetchInterval: 300000,
    staleTime: 240000
  });

  // Calculate recommendations: 1 product per category per shop
  const recommendations = React.useMemo(() => {
    const result = [];
    const shopCategoryMap = new Map();

    // Group products by shop and category
    allProducts.forEach(product => {
      if (!shopCategoryMap.has(product.shop_id)) {
        shopCategoryMap.set(product.shop_id, new Map());
      }
      const categoryMap = shopCategoryMap.get(product.shop_id);
      if (!categoryMap.has(product.category)) {
        categoryMap.set(product.category, product);
      }
    });

    // Extract 1 product per category per shop
    shopCategoryMap.forEach((categoryMap) => {
      categoryMap.forEach((product) => {
        result.push(product);
      });
    });

    // Shuffle and limit
    return result.sort(() => Math.random() - 0.5).slice(0, limit);
  }, [allProducts, limit]);

  const isLoading = !allProducts.length && !shops.length;

  if (isLoading) {
    return (
      <div className="mt-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-8 w-8 bg-slate-200 rounded-full animate-pulse" />
          <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
          {[...Array(limit)].map((_, i) => (
            <div key={i} className="bg-slate-200 rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8"
    >
      <div className="flex items-center gap-2 mb-4">
        {user ? (
          <>
            <Sparkles className="w-6 h-6 text-purple-500" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">
              Recommandé pour vous
            </h2>
          </>
        ) : (
          <>
            <TrendingUp className="w-6 h-6 text-orange-500" />
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">
              Produits populaires
            </h2>
          </>
        )}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4">
        {recommendations.map((product) => {
          const productShop = shops.find(s => s.id === product.shop_id);
          return (
            <ProductCard
              key={product.id}
              product={product}
              shop={productShop}
              onClick={(p) => onProductClick(p)}
              onAdd={(p) => onAddToCart(p)}
            />
          );
        })}
      </div>
    </motion.div>
  );
}