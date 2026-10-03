import React from 'react';
import { Badge } from "@/components/ui/badge";
import ProductCard from '@/components/ui/ProductCard';
import { Filter, Star } from 'lucide-react';

export default function SearchResults({
  results,
  query,
  filters,
  shops,
  onProductClick,
  onAddToCart,
  user
}) {
  const [sortBy, setSortBy] = React.useState('relevance');

  const sortedResults = React.useMemo(() => {
    let sorted = [...results];

    switch (sortBy) {
      case 'price-asc':
        sorted.sort((a, b) => (a.promo_price || a.price) - (b.promo_price || b.price));
        break;
      case 'price-desc':
        sorted.sort((a, b) => (b.promo_price || b.price) - (a.promo_price || a.price));
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'relevance':
      default:
        // Already sorted by relevance from search
        break;
    }

    return sorted;
  }, [results, sortBy]);

  const activeFilterCount =
    filters.categories?.length +
    filters.colors?.length +
    filters.sizes?.length +
    filters.materials?.length +
    filters.shops?.length +
    ((filters.priceRange?.[0] > 0 || filters.priceRange?.[1] < 100000) ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {results.length} résultat{results.length > 1 ? 's' : ''}
              {query && <span className="text-orange-600"> pour "{query}"</span>}
            </h2>
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {activeFilterCount} filtre{activeFilterCount > 1 ? 's' : ''} actif{activeFilterCount > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Trier par:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="relevance">Pertinence</option>
              <option value="price-asc">Prix croissant</option>
              <option value="price-desc">Prix décroissant</option>
              <option value="name">Nom A-Z</option>
            </select>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
            {filters.categories?.map(cat => (
              <Badge key={cat} variant="secondary" className="bg-orange-100 text-orange-800">
                {cat}
              </Badge>
            ))}
            {filters.colors?.map(color => (
              <Badge key={color} variant="secondary" className="bg-blue-100 text-blue-800">
                {color}
              </Badge>
            ))}
            {filters.sizes?.map(size => (
              <Badge key={size} variant="secondary" className="bg-purple-100 text-purple-800">
                Taille: {size}
              </Badge>
            ))}
            {filters.materials?.map(material => (
              <Badge key={material} variant="secondary" className="bg-green-100 text-green-800">
                {material}
              </Badge>
            ))}
            {(filters.priceRange?.[0] > 0 || filters.priceRange?.[1] < 100000) && (
              <Badge variant="secondary" className="bg-pink-100 text-pink-800">
                {filters.priceRange[0].toLocaleString()} - {filters.priceRange[1].toLocaleString()} G
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Results Grid */}
      {sortedResults.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {sortedResults.map((product) => {
            const shop = shops.find(s => s.id === product.shop_id);
            return (
              <div key={product.id} className="relative">
                {product.relevanceScore > 8 && (
                  <div className="absolute top-2 left-2 z-10 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Top Match
                  </div>
                )}
                <ProductCard
                  product={product}
                  shop={shop}
                  hideId={true}
                  onAdd={onAddToCart}
                  onClick={() => onProductClick(product, shop)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-lg shadow-sm text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            Aucun résultat trouvé
          </h3>
          <p className="text-gray-600 mb-4">
            Essayez de modifier vos critères de recherche
          </p>
        </div>
      )}
    </div>
  );
}