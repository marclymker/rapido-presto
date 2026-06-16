import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Plus, Search, Layers, Trash2, X, CheckSquare, Square } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProductFormModal from './modals/ProductFormModal';
import BulkUploadModal from '@/components/admin/BulkUploadModal';
import { toast } from 'sonner';

export default function ProductsSection({ shopId }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery({
    queryKey: ['shop-products', shopId],
    queryFn: () => base44.entities.Product.filter({ shop_id: shopId }),
    enabled: !!shopId
  });

  const filteredProducts = products.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allFilteredSelected = filteredProducts.length > 0 && 
    filteredProducts.every(p => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(selectedIds.filter(id => !filteredProducts.some(p => p.id === id)));
    } else {
      const newIds = filteredProducts.map(p => p.id);
      setSelectedIds([...new Set([...selectedIds, ...newIds])]);
    }
  };

  const toggleSelect = (productId) => {
    setSelectedIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    try {
      for (const id of selectedIds) {
        const res = await base44.functions.invoke('adminProducts', { action: 'delete', productId: id });
        if (res.data?.error) throw new Error(res.data.error);
      }
      toast.success(`${selectedIds.length} article(s) supprimé(s)`);
      setSelectedIds([]);
      queryClient.invalidateQueries(['shop-products']);
    } catch (err) {
      toast.error("Erreur lors de la suppression : " + (err?.message || err));
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Sticky Header avec Recherche */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-md p-6 border-b z-10 shadow-sm">
        <h2 className="text-2xl font-black mb-4 text-gray-900">Mes Articles</h2>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Rechercher un article..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-100 rounded-full pl-12 pr-6 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
            />
          </div>

          {selectedIds.length > 0 && (
            <>
              <Button
                onClick={() => setSelectedIds([])}
                variant="outline"
                className="px-4 py-3 rounded-full font-bold"
              >
                <X className="w-5 h-5 mr-2" />
                {selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="destructive"
                className="px-4 py-3 rounded-full font-bold"
              >
                <Trash2 className="w-5 h-5 mr-2" />
                Supprimer
              </Button>
            </>
          )}

          <Button
            onClick={() => setShowBulkModal(true)}
            variant="outline"
            className="px-4 py-3 rounded-full font-bold border-2 border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <Layers className="w-5 h-5 mr-2" />
            Bulk
          </Button>
          <Button 
            onClick={() => {
              setSelectedProduct(null);
              setShowModal(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-full font-bold shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nouveau
          </Button>
        </div>

        {filteredProducts.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="mt-3 text-sm font-medium text-gray-500 hover:text-blue-600 flex items-center gap-1.5 transition-colors"
          >
            {allFilteredSelected ? (
              <CheckSquare className="w-4 h-4 text-blue-600" />
            ) : (
              <Square className="w-4 h-4" />
            )}
            {allFilteredSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        )}
      </div>

      {/* Grille de Produits */}
      <div className="p-6 flex-1">
        {filteredProducts.length === 0 ? (
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
            {filteredProducts.map(product => {
              const isSelected = selectedIds.includes(product.id);
              return (
                <div 
                  key={product.id}
                  className="bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md transition-all group relative"
                >
                  {/* Checkbox de sélection */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(product.id);
                    }}
                    className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      isSelected 
                        ? 'bg-blue-600 text-white shadow-md' 
                        : 'bg-white/80 text-gray-400 hover:bg-white hover:text-blue-600 opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>

                  {/* Carte cliquable pour édition */}
                  <div 
                    onClick={() => {
                      setSelectedProduct(product);
                      setShowModal(true);
                    }}
                    className="cursor-pointer"
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
                      {isSelected && (
                        <div className="absolute inset-0 bg-blue-600/10 border-2 border-blue-500 rounded-2xl" />
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
                </div>
              );
            })}
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

      <BulkUploadModal
        open={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        shopId={shopId}
        onSuccess={() => queryClient.invalidateQueries(['shop-products'])}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer les articles ?</AlertDialogTitle>
            <AlertDialogDescription>
              Vous allez supprimer définitivement <strong>{selectedIds.length} article{selectedIds.length > 1 ? 's' : ''}</strong>.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? 'Suppression...' : `Supprimer ${selectedIds.length} article${selectedIds.length > 1 ? 's' : ''}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}