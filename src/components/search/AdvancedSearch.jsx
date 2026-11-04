import React, { useState, useEffect } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { Search, SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdvancedSearch({ onSearch, allProducts, shops, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    priceRange: [0, 100000],
    categories: [],
    colors: [],
    sizes: [],
    materials: [],
    shops: []
  });

  // Extract unique values from products
  const availableFilters = React.useMemo(() => {
    const colors = new Set();
    const sizes = new Set();
    const materials = new Set();

    allProducts.forEach(p => {
      if (p.product_attributes?.color) colors.add(p.product_attributes.color);
      if (p.product_attributes?.size) sizes.add(p.product_attributes.size);
      if (p.product_attributes?.material) materials.add(p.product_attributes.material);
    });

    return {
      colors: Array.from(colors).sort(),
      sizes: Array.from(sizes).sort(),
      materials: Array.from(materials).sort()
    };
  }, [allProducts]);

  const categories = [
    'Mariage', 'Pour Femme', 'Boutique Fleurs', 'Pour homme',
    'Electronics', 'Bijoux', 'Maison', 'Bébé', 'Outils', 'Hotels/Piscine'
  ];

  const handleSearch = async () => {
    const searchResults = await performAISearch(query, filters, allProducts, shops);
    onSearch(searchResults, query, filters);
  };

  const clearFilters = () => {
    setFilters({
      priceRange: [0, 100000],
      categories: [],
      colors: [],
      sizes: [],
      materials: [],
      shops: []
    });
  };

  const activeFilterCount =
    filters.categories.length +
    filters.colors.length +
    filters.sizes.length +
    filters.materials.length +
    filters.shops.length +
    ((filters.priceRange[0] > 0 || filters.priceRange[1] < 100000) ? 1 : 0);

  useEffect(() => {
    if (query || activeFilterCount > 0) {
      handleSearch();
    }
  }, [filters]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Recherche avancée avec IA..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="pl-10 pr-4 h-12 text-base"
          />
        </div>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          className="h-12 px-4 relative"
        >
          <SlidersHorizontal className="w-5 h-5 mr-2" />
          Filtres
          {activeFilterCount > 0 && (
            <Badge className="ml-2 bg-orange-500">{activeFilterCount}</Badge>
          )}
        </Button>
        <Button onClick={handleSearch} className="h-12 bg-orange-500 hover:bg-orange-600">
          Rechercher
        </Button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border-t pt-4 space-y-4 animate-in slide-in-from-top-2">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-lg">Filtres avancés</h3>
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Effacer tout
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Price Range */}
            <div>
              <label className="font-semibold text-sm mb-3 block">Prix (HTG)</label>
              <div className="space-y-3">
                <Slider
                  min={0}
                  max={100000}
                  step={1000}
                  value={filters.priceRange}
                  onValueChange={(value) => setFilters({...filters, priceRange: value})}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{filters.priceRange[0].toLocaleString()} G</span>
                  <span>{filters.priceRange[1].toLocaleString()} G</span>
                </div>
              </div>
            </div>

            {/* Categories */}
            <FilterGroup
              title="Catégories"
              items={categories}
              selected={filters.categories}
              onChange={(categories) => setFilters({...filters, categories})}
            />

            {/* Colors */}
            {availableFilters.colors.length > 0 && (
              <FilterGroup
                title="Couleurs"
                items={availableFilters.colors}
                selected={filters.colors}
                onChange={(colors) => setFilters({...filters, colors})}
              />
            )}

            {/* Sizes */}
            {availableFilters.sizes.length > 0 && (
              <FilterGroup
                title="Tailles"
                items={availableFilters.sizes}
                selected={filters.sizes}
                onChange={(sizes) => setFilters({...filters, sizes})}
              />
            )}

            {/* Materials */}
            {availableFilters.materials.length > 0 && (
              <FilterGroup
                title="Matériaux"
                items={availableFilters.materials}
                selected={filters.materials}
                onChange={(materials) => setFilters({...filters, materials})}
              />
            )}

            {/* Shops */}
            <FilterGroup
              title="Boutiques"
              items={shops.map(s => ({ id: s.id, name: s.company_name }))}
              selected={filters.shops}
              onChange={(shops) => setFilters({...filters, shops})}
              isShop
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ title, items, selected, onChange, isShop = false }) {
  const [expanded, setExpanded] = useState(false);
  const displayLimit = 5;
  const shouldCollapse = items.length > displayLimit;
  const displayItems = expanded ? items : items.slice(0, displayLimit);

  const toggleItem = (item) => {
    const value = isShop ? item.id : item;
    if (selected.includes(value)) {
      onChange(selected.filter(i => i !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div>
      <label className="font-semibold text-sm mb-3 block">{title}</label>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {displayItems.map((item) => {
          const value = isShop ? item.id : item;
          const label = isShop ? item.name : item;

          return (
            <div key={value} className="flex items-center gap-2">
              <Checkbox
                id={`filter-${title}-${value}`}
                checked={selected.includes(value)}
                onCheckedChange={() => toggleItem(item)}
              />
              <label
                htmlFor={`filter-${title}-${value}`}
                className="text-sm cursor-pointer flex-1"
              >
                {label}
              </label>
            </div>
          );
        })}
      </div>
      {shouldCollapse && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3 h-3 mr-1" />
              Voir moins
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3 mr-1" />
              Voir {items.length - displayLimit} de plus
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// AI-powered search with relevance scoring
async function performAISearch(query, filters, allProducts, shops) {
  let results = [...allProducts];

  // Apply basic filters first
  if (filters.categories.length > 0) {
    results = results.filter(p => filters.categories.includes(p.category));
  }

  if (filters.colors.length > 0) {
    results = results.filter(p =>
      filters.colors.includes(p.product_attributes?.color)
    );
  }

  if (filters.sizes.length > 0) {
    results = results.filter(p =>
      filters.sizes.includes(p.product_attributes?.size)
    );
  }

  if (filters.materials.length > 0) {
    results = results.filter(p =>
      filters.materials.includes(p.product_attributes?.material)
    );
  }

  if (filters.shops.length > 0) {
    results = results.filter(p => filters.shops.includes(p.shop_id));
  }

  // Price range filter
  results = results.filter(p => {
    const price = p.promo_price || p.price;
    return price >= filters.priceRange[0] && price <= filters.priceRange[1];
  });

  // AI-powered relevance scoring
  if (query.trim()) {
    results = results.map(product => {
      const score = calculateRelevanceScore(query, product, shops);
      return { ...product, relevanceScore: score };
    });

    // Use LLM for semantic search if query is complex
    if (query.split(' ').length > 2) {
      try {
        const response = await firebaseApi.integrations.Core.InvokeLLM({
          prompt: `Given the search query "${query}", which of these product categories and keywords are most relevant? Categories: ${results.map(p => p.category).filter((v, i, a) => a.indexOf(v) === i).join(', ')}. Return a JSON array of relevant terms.`,
          response_json_schema: {
            type: "object",
            properties: {
              relevantTerms: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });

        if (response.relevantTerms) {
          results = results.map(product => {
            const aiBoost = response.relevantTerms.some(term =>
              product.name.toLowerCase().includes(term.toLowerCase()) ||
              product.description?.toLowerCase().includes(term.toLowerCase())
            ) ? 0.5 : 0;
            return { ...product, relevanceScore: product.relevanceScore + aiBoost };
          });
        }
      } catch (error) {
        console.log('AI search enhancement failed, using basic search');
      }
    }

    // Sort by relevance
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  return results.filter(p => p.is_available !== false);
}

function calculateRelevanceScore(query, product, shops) {
  const queryLower = query.toLowerCase().trim();
  if (!queryLower) return 0;

  const terms = queryLower.split(' ').filter(t => t.length > 1);
  let score = 0;

  // Build comprehensive searchable text
  const productName = (product.name || '').toLowerCase();
  const productDesc = (product.description || '').toLowerCase();
  const productCategory = (product.category || '').toLowerCase();
  const productSubcategory = (product.subcategory || '').toLowerCase();
  const productTags = (product.seo_tags || []).join(' ').toLowerCase();
  const productColor = (product.product_attributes?.color || '').toLowerCase();
  const productMaterial = (product.product_attributes?.material || '').toLowerCase();
  const productSize = (product.product_attributes?.size || '').toLowerCase();
  const shopName = (shops.find(s => s.id === product.shop_id)?.company_name || '').toLowerCase();

  const searchText = `${productName} ${productDesc} ${productCategory} ${productSubcategory} ${productTags} ${productColor} ${productMaterial} ${productSize} ${shopName}`;

  // Exact match in title (highest score)
  if (productName.includes(queryLower)) {
    score += 10;
  }

  // SEO tags exact match (high priority)
  if (productTags.includes(queryLower)) {
    score += 8;
  }

  // Category exact match
  if (productCategory.includes(queryLower)) {
    score += 7;
  }

  // Description match
  if (productDesc.includes(queryLower)) {
    score += 5;
  }

  // Term-by-term matches
  terms.forEach(term => {
    if (productName.includes(term)) score += 5;
    if (productTags.includes(term)) score += 4;
    if (productCategory.includes(term)) score += 3;
    if (productDesc.includes(term)) score += 2;
    if (searchText.includes(term)) score += 1;
  });

  // Shop name match
  if (shopName.includes(queryLower)) {
    score += 3;
  }

  // Availability boost
  if (product.is_available !== false && product.stock_quantity > 0) {
    score += 1;
  }

  // Promo boost
  if (product.promo_price && product.promo_price < product.price) {
    score += 0.5;
  }

  return score;
}
