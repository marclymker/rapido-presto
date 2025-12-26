import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import ProductCard from '@/components/ui/ProductCard';
import { Sparkles, TrendingUp } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProductRecommendations({ user, onProductClick, onAddToCart, selectedShop, limit = 6 }) {
  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['recommendations', user?.id, limit],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('getRecommendations', { limit });
      return data.recommendations || [];
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 240000
  });

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
        {recommendations.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onClick={(p) => onProductClick(p)}
            onAdd={(p) => onAddToCart(p)}
          />
        ))}
      </div>
    </motion.div>
  );
}