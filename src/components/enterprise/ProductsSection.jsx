import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import ProductFormModal from './modals/ProductFormModal';

export default function ProductsSection({ shopId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: shop } = useQuery({
    queryKey: ['my-shop', shopId],
    queryFn: () => base44.entities.Shop.get(shopId),
    enabled: !!shopId
  });

  const { data: products = [] } = useQuery({
    queryKey: ['shop-products', shopId],
    queryFn: () => base44.entities.Product.filter({ shop_id: shopId }),
    enabled: !!shopId
  });

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header avec Recherche */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-md p-6 border-b z-10 shadow-sm">
        <h2 className="text-2xl font-black mb-4 text-gray-900">Mes Articles</h2>
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Rechercher un article..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 rounded-full pl-12 pr-6 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
            />
          </div>
          <Button 
            onClick={() => {
              setSelectedProduct(null);
              setShowModal(true);
            }}
            disabled={!shop}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau
          </Button>
        </div>
      </div>

      {/* Grille de Produits */}
      <div className="p-6 flex-1">
        {!shop ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3">🏪</div>
            <h3 className="text-lg font-bold text-amber-900 mb-2">Créez d'abord votre boutique</h3>
            <p className="text-amber-700 text-sm mb-4">Pour ajouter des produits, vous devez d'abord configurer votre boutique dans la section Réglages.</p>
            <Button 
              onClick={() => window.location.href = '#settings'}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Aller aux Réglages
            </Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              {searchQuery ? 'Aucun article trouvé' : 'Aucun article'}
            </h3>
            <p className="text-gray-500">
              {searchQuery ? 'Essayez une autre recherche' : 'Commencez par ajouter vos premiers produits'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div 
                key={product.id}
                onClick={() => {
                  setSelectedProduct(product);
                  setShowModal(true);
                }}
                className="bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="relative h-40 bg-gray-100 overflow-hidden">
                  {product.image_url ? (
                    <img 
                      src={product.image_url} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl">
                      📦
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm text-gray-900 truncate">{product.name}</p>
                  <p className="text-blue-600 font-bold text-sm">{product.price} HTG</p>
                  {product.stock_quantity !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">Stock: {product.stock_quantity}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProductFormModal
        product={selectedProduct}
        shopId={shopId}
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedProduct(null);
        }}
        onSuccess={() => queryClient.invalidateQueries(['shop-products'])}
      />
    </div>
  );
}