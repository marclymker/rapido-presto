import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Package, Trash2, Edit, Store, X, Tag } from 'lucide-react';
import ProductGuidelinesModal from '@/components/enterprise/modals/ProductGuidelinesModal';

export default function AdminProducts() {
  const [user, setUser] = useState(null);
  const [selectedShop, setSelectedShop] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    promo_price: '',
    description: '',
    image_url: '',
    additional_images: [],
    category: '',
    taille_emballage: '',
    stock_quantity: '',
    seo_tags: [],
    is_available: true
  });
  const [tagInput, setTagInput] = useState('');

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

  const createProductMutation = useMutation({
    mutationFn: async (productData) => {
      const { data } = await base44.functions.invoke('adminProducts', { 
        action: 'create', 
        data: {
          ...productData,
          shop_id: selectedShop.id,
          shop_name: selectedShop.company_name
        }
      });
      return data.product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-products']);
      toast.success('Article créé avec succès');
      setShowForm(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await base44.functions.invoke('adminProducts', { 
        action: 'update', 
        productId: id, 
        data 
      });
      return result.data.product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-products']);
      toast.success('Article mis à jour');
      setShowForm(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.functions.invoke('uploadFile', { file });
      setFormData({ ...formData, image_url: data.file_url });
      toast.success('Image téléchargée');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
    setUploading(false);
  };

  const handleAdditionalImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.functions.invoke('uploadFile', { file });
      setFormData({ 
        ...formData, 
        additional_images: [...(formData.additional_images || []), data.file_url] 
      });
      toast.success('Image ajoutée');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
    setUploading(false);
  };

  const removeAdditionalImage = (index) => {
    setFormData({
      ...formData,
      additional_images: formData.additional_images.filter((_, i) => i !== index)
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.seo_tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        seo_tags: [...(formData.seo_tags || []), tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData({
      ...formData,
      seo_tags: formData.seo_tags.filter(t => t !== tag)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      promo_price: formData.promo_price ? parseFloat(formData.promo_price) : null,
      stock_quantity: formData.stock_quantity ? parseInt(formData.stock_quantity) : 0
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data: productData });
    } else {
      createProductMutation.mutate(productData);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: '',
      promo_price: '',
      description: '',
      image_url: '',
      additional_images: [],
      category: '',
      taille_emballage: '',
      stock_quantity: '',
      seo_tags: [],
      is_available: true
    });
    setTagInput('');
    setEditingProduct(null);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name || '',
      price: product.price || '',
      promo_price: product.promo_price || '',
      description: product.description || '',
      image_url: product.image_url || '',
      additional_images: product.additional_images || [],
      category: product.category || '',
      taille_emballage: product.taille_emballage || '',
      stock_quantity: product.stock_quantity || '',
      seo_tags: product.seo_tags || [],
      is_available: product.is_available !== false
    });
    setShowForm(true);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Gestion des Articles</h1>
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
              <Button 
                onClick={() => { 
                  resetForm(); 
                  setShowGuidelines(true);
                }} 
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un article
              </Button>
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

      <ProductGuidelinesModal
        open={showGuidelines}
        onConfirm={() => {
          setShowGuidelines(false);
          setShowForm(true);
        }}
        onCancel={() => setShowGuidelines(false)}
      />

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Modifier' : 'Ajouter'} un article</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom de l'article *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Prix (HTG) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Prix promotionnel (HTG)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.promo_price}
                  onChange={(e) => setFormData({ ...formData, promo_price: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label>Quantité en stock *</Label>
                <Input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                  placeholder="0"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label>Catégorie</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fastfood">Fastfood</SelectItem>
                    <SelectItem value="Restaurants">Restaurants</SelectItem>
                    <SelectItem value="Boutique Fleurs">Boutique Fleurs</SelectItem>
                    <SelectItem value="Pharmacie">Pharmacie</SelectItem>
                    <SelectItem value="Vêtements">Vêtements</SelectItem>
                    <SelectItem value="Epicerie">Épicerie</SelectItem>
                    <SelectItem value="Café">Café</SelectItem>
                    <SelectItem value="Pour Femme">Pour Femme</SelectItem>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Pour homme">Pour homme</SelectItem>
                    <SelectItem value="Maison">Maison</SelectItem>
                    <SelectItem value="Bébé">Bébé</SelectItem>
                    <SelectItem value="Outils">Outils</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Taille d'emballage</Label>
                <Select value={formData.taille_emballage} onValueChange={(value) => setFormData({ ...formData, taille_emballage: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une taille" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Petit">Petit</SelectItem>
                    <SelectItem value="Moyen">Moyen</SelectItem>
                    <SelectItem value="Grand">Grand</SelectItem>
                    <SelectItem value="Lourd">Lourd</SelectItem>
                    <SelectItem value="Encombrant">Encombrant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="col-span-2">
                <Label>Image principale *</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {formData.image_url && (
                  <img src={formData.image_url} alt="Preview" className="mt-2 h-32 w-32 object-cover rounded-lg" />
                )}
              </div>

              <div className="col-span-2">
                <Label>Images supplémentaires</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleAdditionalImageUpload}
                  disabled={uploading}
                />
                {formData.additional_images && formData.additional_images.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {formData.additional_images.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img src={img} alt="" className="h-20 w-20 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeAdditionalImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-2">
                <Label>Tags SEO (pour la recherche)</Label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Ajouter un tag (ex: poulet, pizza, burger)"
                  />
                  <Button type="button" onClick={addTag} variant="outline">
                    <Tag className="w-4 h-4" />
                  </Button>
                </div>
                {formData.seo_tags && formData.seo_tags.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {formData.seo_tags.map((tag, idx) => (
                      <div key={idx} className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="col-span-2 flex items-center gap-2">
                <Switch
                  checked={formData.is_available}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_available: checked })}
                />
                <Label>Article disponible</Label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                Annuler
              </Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                {editingProduct ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}