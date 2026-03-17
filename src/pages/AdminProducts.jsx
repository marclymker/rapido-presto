import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Package, Trash2, Edit, Store, UploadCloud, Layers, ImageIcon } from 'lucide-react';
import ProductFormModal from '@/components/enterprise/modals/ProductFormModal';
import BulkUploadModal from '@/components/admin/BulkUploadModal';
import MigrateFbCategoriesModal from '@/components/admin/MigrateFbCategoriesModal';
import GenerateAltTextsModal from '@/components/admin/GenerateAltTextsModal';

export default function AdminProducts() {
  const [user, setUser] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showFbMigration, setShowFbMigration] = useState(false);
  const [showAltTexts, setShowAltTexts] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.role !== 'admin') {
        window.location.href = '/';
      }
    }).catch(() => {
      window.location.href = '/';
    });
  }, []);

  const { data: shops = [] } = useQuery({
    queryKey: ['admin-shops-list'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('adminShops', { action: 'list' });
      return data.shops;
    },
    enabled: !!user
  });

  const { data: products = [] } = useQuery({
    queryKey: ['admin-products', selectedShop?.id],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('adminProducts', { 
        action: 'list', 
        shopId: selectedShop.id 
      });
      return data.products;
    },
    enabled: !!selectedShop
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id) => {
      await base44.functions.invoke('adminProducts', { action: 'delete', productId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-products']);
      toast.success('Article supprimé');
    }
  });

  const handleEdit = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Gestion des Articles</h1>
          <Button
            onClick={() => setShowFbMigration(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Layers className="w-4 h-4 mr-2" />
            Migrer catégories Facebook
          </Button>
        </div>

        {!selectedShop ? (
          <div>
            <h2 className="text-lg font-semibold mb-4">Sélectionner une boutique</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shops.map(shop => (
                <Card key={shop.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedShop(shop)}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center overflow-hidden">
                        {shop.company_logo_url ? (
                          <img src={shop.company_logo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Store className="w-6 h-6 text-orange-500" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{shop.company_name}</CardTitle>
                        <p className="text-sm text-slate-500">{shop.company_category}</p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Button variant="outline" onClick={() => setSelectedShop(null)}>
                  ← Retour
                </Button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center overflow-hidden">
                    {selectedShop.company_logo_url ? (
                      <img src={selectedShop.company_logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store className="w-5 h-5 text-orange-500" />
                    )}
                  </div>
                  <div>
                    <h2 className="font-bold text-lg">{selectedShop.company_name}</h2>
                    <p className="text-sm text-slate-500">{products.length} articles</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowBulkUpload(true)}
                  className="border-orange-300 text-orange-600 hover:bg-orange-50"
                >
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Ajout en masse
                </Button>
                <Button 
                  onClick={() => { 
                    setEditingProduct(null); 
                    setShowForm(true);
                  }} 
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un article
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {products.map(product => (
                <Card key={product.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader className="p-0">
                    <div className="h-40 bg-slate-100 rounded-t-lg overflow-hidden">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <CardTitle className="text-base">{product.name}</CardTitle>
                        <p className="text-sm text-slate-500 line-clamp-2">{product.description}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(product)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteProductMutation.mutate(product.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                     <div className="flex items-center justify-between">
                       <div>
                         {product.promo_price && product.promo_price < product.price ? (
                           <div>
                             <span className="text-lg font-bold text-orange-500">{product.promo_price} HTG</span>
                             <span className="text-sm text-slate-400 line-through ml-2">{product.price} HTG</span>
                           </div>
                         ) : (
                           <span className="text-lg font-bold text-slate-800">{product.price} HTG</span>
                         )}
                       </div>
                       <div className={`px-2 py-1 rounded text-xs ${product.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                         {product.is_available ? 'Disponible' : 'Indisponible'}
                       </div>
                     </div>
                     {product.stock_quantity !== undefined && (
                       <div className="text-xs text-slate-500">
                         Stock: {product.stock_quantity}
                       </div>
                     )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {products.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                Aucun article pour cette boutique
              </div>
            )}
          </div>
        )}
      </div>

      <BulkUploadModal
        open={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        shopId={selectedShop?.id}
        shopName={selectedShop?.company_name}
        onSuccess={() => {
          queryClient.invalidateQueries(['admin-products']);
          setShowBulkUpload(false);
        }}
      />

      <MigrateFbCategoriesModal
        open={showFbMigration}
        onClose={() => setShowFbMigration(false)}
      />

      <ProductFormModal
        product={editingProduct}
        shopId={selectedShop?.id}
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingProduct(null);
        }}
        onSuccess={() => {
          queryClient.invalidateQueries(['admin-products']);
          setShowForm(false);
          setEditingProduct(null);
        }}
      />
    </div>
  );
}