import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Bell, Edit, Trash2, Eye, EyeOff, Volume2, VolumeX } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import OrderStatusBadge from '@/components/ui/OrderStatusBadge';
import OrderDetailModal from '@/components/modals/OrderDetailModal';
import { useOrderNotifications, useBrowserNotifications } from '@/components/notifications/NotificationManager';

export default function EnterpriseDashboard() {
  const [user, setUser] = useState(null);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '', price: '', promo_price: '', description: '', image_url: '', is_available: true
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const queryClient = useQueryClient();
  const { requestPermission } = useBrowserNotifications();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // Redirect if wrong profile
      if (u.current_profile !== 'entreprise') {
        const redirectPages = {
          client: 'Home',
          livreur: 'DriverDashboard'
        };
        window.location.href = createPageUrl(redirectPages[u.current_profile] || 'Home');
      }
    }).catch(() => {});
  }, []);

  // Demander la permission pour les notifications au chargement
  useEffect(() => {
    if (user) {
      requestPermission();
    }
  }, [user, requestPermission]);

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['my-products', user?.id],
    queryFn: () => base44.entities.Product.filter({ shop_id: user?.id }),
    enabled: !!user?.id
  });

  // Fetch orders
  const { data: orders = [] } = useQuery({
    queryKey: ['shop-orders', user?.id],
    queryFn: () => base44.entities.Order.filter({ shop_id: user?.id }, '-created_date'),
    enabled: !!user?.id,
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  const productMutation = useMutation({
    mutationFn: async (data) => {
      if (editingProduct) {
        return base44.entities.Product.update(editingProduct.id, data);
      }
      return base44.entities.Product.create({
        ...data,
        shop_id: user.id,
        shop_name: entrepriseData.company_name,
        category: entrepriseData.company_category
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['my-products']);
      setProductDialogOpen(false);
      resetProductForm();
      toast.success(editingProduct ? 'Article mis à jour' : 'Article ajouté');
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-products']);
      toast.success('Article supprimé');
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, status }) => {
      const updates = { status };
      if (status === 'ready') {
        updates.status = 'searching_driver';
      }
      return base44.entities.Order.update(id, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shop-orders']);
      setSelectedOrder(null);
      toast.success('Statut mis à jour');
    }
  });

  const resetProductForm = () => {
    setProductForm({ name: '', price: '', promo_price: '', description: '', image_url: '', is_available: true });
    setEditingProduct(null);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price,
      promo_price: product.promo_price || '',
      description: product.description || '',
      image_url: product.image_url || '',
      is_available: product.is_available !== false
    });
    setProductDialogOpen(true);
  };

  const handleProductSubmit = () => {
    productMutation.mutate({
      ...productForm,
      price: Number(productForm.price),
      promo_price: productForm.promo_price ? Number(productForm.promo_price) : null
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProductForm({ ...productForm, image_url: file_url });
      toast.success('Image téléchargée');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => ['preparing', 'ready', 'searching_driver'].includes(o.status));

  // Activer les notifications sonores pour nouvelles commandes
  useOrderNotifications({
    enabled: notificationsEnabled,
    onNewOrder: pendingOrders
  });

  if (!user || user.current_profile !== 'entreprise') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Accès réservé aux entreprises</p>
      </div>
    );
  }

  const entrepriseData = user.profiles?.entreprise || {};

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-orange-500">{entrepriseData.company_name}</h1>
              <p className="text-sm text-slate-500">{entrepriseData.company_category}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                title={notificationsEnabled ? 'Désactiver le son' : 'Activer le son'}
              >
                {notificationsEnabled ? (
                  <Volume2 className="w-5 h-5 text-orange-500" />
                ) : (
                  <VolumeX className="w-5 h-5 text-slate-400" />
                )}
              </Button>
              {pendingOrders.length > 0 && (
                <div className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1.5 rounded-full">
                  <Bell className="w-4 h-4" />
                  <span className="text-sm font-medium">{pendingOrders.length} nouvelle(s)</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="w-full bg-white mb-6">
            <TabsTrigger value="orders" className="flex-1">
              Commandes ({activeOrders.length + pendingOrders.length})
            </TabsTrigger>
            <TabsTrigger value="products" className="flex-1">
              Mes Articles ({products.length})
            </TabsTrigger>
          </TabsList>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {/* Pending Orders */}
            {pendingOrders.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-red-500" />
                  Nouvelles commandes
                </h3>
                <div className="space-y-3">
                  <AnimatePresence>
                    {pendingOrders.map(order => (
                      <motion.div
                        key={order.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedOrder(order)}
                        className="bg-white rounded-xl p-4 border-2 border-orange-200 cursor-pointer hover:shadow-md"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">#{order.order_number}</p>
                            <p className="text-sm text-slate-500">
                              {format(new Date(order.created_date), "HH:mm", { locale: fr })}
                            </p>
                          </div>
                          <span className="font-bold text-orange-500">{order.total} HTG</span>
                        </div>
                        <div className="mt-2 text-sm text-slate-600">
                          {order.items?.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-red-200 text-red-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateOrderMutation.mutate({ id: order.id, status: 'cancelled' });
                            }}
                          >
                            Refuser
                          </Button>
                          <Button 
                            size="sm"
                            className="bg-orange-500 hover:bg-orange-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateOrderMutation.mutate({ id: order.id, status: 'preparing' });
                            }}
                          >
                            Accepter
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Active Orders */}
            <div>
              <h3 className="font-semibold text-lg mb-3">Commandes en cours</h3>
              <div className="space-y-3">
                {activeOrders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">#{order.order_number}</span>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {format(new Date(order.created_date), "d MMM HH:mm", { locale: fr })}
                        </p>
                      </div>
                      <span className="font-bold text-orange-500">{order.total} HTG</span>
                    </div>
                  </div>
                ))}
                {activeOrders.length === 0 && pendingOrders.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    Aucune commande en cours
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products">
            <div className="flex justify-end mb-4">
              <Dialog open={productDialogOpen} onOpenChange={(open) => {
                setProductDialogOpen(open);
                if (!open) resetProductForm();
              }}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un article
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? 'Modifier l\'article' : 'Nouvel article'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Nom</Label>
                      <Input
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Prix (HTG)</Label>
                        <Input
                          type="number"
                          value={productForm.price}
                          onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Prix promo (HTG)</Label>
                        <Input
                          type="number"
                          value={productForm.promo_price}
                          onChange={(e) => setProductForm({ ...productForm, promo_price: e.target.value })}
                          placeholder="Optionnel"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={productForm.description}
                        onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div>
                      <Label>Photo</Label>
                      <Input type="file" accept="image/*" onChange={handleImageUpload} />
                      {productForm.image_url && (
                        <img src={productForm.image_url} alt="" className="mt-2 h-24 w-24 object-cover rounded-lg" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Disponible</Label>
                      <Switch
                        checked={productForm.is_available}
                        onCheckedChange={(checked) => setProductForm({ ...productForm, is_available: checked })}
                      />
                    </div>
                    <Button 
                      className="w-full bg-orange-500 hover:bg-orange-600"
                      onClick={handleProductSubmit}
                      disabled={productMutation.isPending}
                    >
                      {productMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(product => (
                <div key={product.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
                  <div className="h-28 bg-slate-100 relative">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>
                    )}
                    {!product.is_available && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <EyeOff className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="font-medium text-sm truncate">{product.name}</h4>
                    <p className="text-orange-500 font-semibold">{product.price} HTG</p>
                    <div className="flex gap-2 mt-2">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-8 w-8"
                        onClick={() => handleEditProduct(product)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="h-8 w-8 text-red-500"
                        onClick={() => deleteProductMutation.mutate(product.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {products.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                Aucun article. Cliquez sur "Ajouter" pour commencer.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        userType="entreprise"
        onUpdateStatus={(id, status) => updateOrderMutation.mutate({ id, status })}
      />
    </div>
  );
}