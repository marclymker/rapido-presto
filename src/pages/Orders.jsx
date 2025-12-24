import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Bell, Edit, Trash2, Eye, EyeOff, Volume2, VolumeX, MapPin, Clock, CreditCard, Check, Navigation, Phone } from 'lucide-react';
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
import { useOrderNotifications, useBrowserNotifications, useNotificationSound } from '@/components/notifications/NotificationManager';

export default function Orders() {
  const [user, setUser] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isAvailable, setIsAvailable] = useState(false);
  
  // Enterprise states
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '', price: '', promo_price: '', description: '', image_url: '', is_available: true
  });

  const queryClient = useQueryClient();
  const { requestPermission } = useBrowserNotifications();
  const { initialize: initializeSound, isInitialized: soundInitialized } = useNotificationSound();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setIsAvailable(u.profiles?.livreur?.is_available || false);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (user) {
      requestPermission();
    }
  }, [user, requestPermission]);

  const currentProfile = user?.current_profile;

  // CLIENT: Fetch client orders
  const { data: clientOrders = [] } = useQuery({
    queryKey: ['client-orders', user?.id],
    queryFn: () => base44.entities.Order.filter({ client_id: user?.id }, '-created_date'),
    enabled: !!user?.id && currentProfile === 'client'
  });

  // ENTERPRISE: Fetch shop and orders
  const { data: myShop } = useQuery({
    queryKey: ['my-shop', user?.id],
    queryFn: async () => {
      const shops = await base44.entities.Shop.filter({ user_id: user.id });
      if (shops.length > 0) return shops[0];
      
      const entrepriseData = user.profiles?.entreprise || {};
      if (entrepriseData.is_active) {
        return base44.entities.Shop.create({
          user_id: user.id,
          company_name: entrepriseData.company_name,
          company_category: entrepriseData.company_category,
          company_logo_url: entrepriseData.company_logo_url,
          commune: user.commune,
          rating: entrepriseData.rating || 4.5,
          delivery_time_minutes: entrepriseData.delivery_time_minutes || 30,
          is_active: true
        });
      }
      return null;
    },
    enabled: !!user?.id && currentProfile === 'entreprise'
  });

  const { data: products = [] } = useQuery({
    queryKey: ['my-products', myShop?.id],
    queryFn: () => base44.entities.Product.filter({ shop_id: myShop.id }),
    enabled: !!myShop?.id
  });

  const { data: enterpriseOrders = [] } = useQuery({
    queryKey: ['shop-orders', myShop?.id],
    queryFn: () => base44.entities.Order.filter({ shop_id: myShop?.id }, '-created_date'),
    enabled: !!myShop?.id,
    refetchInterval: 10000
  });

  // DRIVER: Fetch available and driver orders
  const { data: availableOrders = [] } = useQuery({
    queryKey: ['available-orders', user?.commune],
    queryFn: async () => {
      const orders = await base44.entities.Order.filter({ 
        status: 'searching_driver'
      }, '-created_date');
      return orders.filter(o => o.shop_commune === user?.commune || o.client_commune === user?.commune);
    },
    enabled: !!user?.commune && currentProfile === 'livreur' && isAvailable,
    refetchInterval: 5000
  });

  const { data: driverOrders = [] } = useQuery({
    queryKey: ['driver-orders', user?.id],
    queryFn: () => base44.entities.Order.filter({ driver_id: user?.id }, '-created_date'),
    enabled: !!user?.id && currentProfile === 'livreur'
  });

  // Mutations
  const productMutation = useMutation({
    mutationFn: async (data) => {
      if (editingProduct) {
        return base44.entities.Product.update(editingProduct.id, data);
      }
      const entrepriseData = user.profiles?.entreprise || {};
      return base44.entities.Product.create({
        ...data,
        shop_id: myShop.id,
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
      queryClient.invalidateQueries(['driver-orders']);
      setSelectedOrder(null);
      toast.success('Statut mis à jour');
    }
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: (available) => {
      const profiles = { ...user.profiles };
      profiles.livreur = { ...profiles.livreur, is_available: available };
      return base44.auth.updateMe({ profiles });
    },
    onSuccess: (_, available) => {
      setIsAvailable(available);
      toast.success(available ? 'Vous êtes maintenant disponible' : 'Vous êtes hors ligne');
    }
  });

  const acceptOrderMutation = useMutation({
    mutationFn: (order) => base44.entities.Order.update(order.id, {
      status: 'driver_assigned',
      driver_id: user.id,
      driver_name: user.full_name,
      driver_phone: user.phone
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['available-orders']);
      queryClient.invalidateQueries(['driver-orders']);
      toast.success('Commande acceptée');
    }
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: (id) => base44.entities.Order.update(id, { status: 'delivered' }),
    onSuccess: () => {
      queryClient.invalidateQueries(['driver-orders']);
      setSelectedOrder(null);
      toast.success('Livraison confirmée!');
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

  // Prepare data based on profile
  const orders = currentProfile === 'client' ? clientOrders : 
                 currentProfile === 'entreprise' ? enterpriseOrders : 
                 driverOrders;

  const pendingOrders = currentProfile === 'entreprise' ? 
    enterpriseOrders.filter(o => o.status === 'pending') : [];
  
  const activeOrders = currentProfile === 'client' ? 
    clientOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)) :
    currentProfile === 'entreprise' ?
    enterpriseOrders.filter(o => ['preparing', 'ready', 'searching_driver'].includes(o.status)) :
    driverOrders.filter(o => ['driver_assigned', 'in_delivery'].includes(o.status));

  const historyOrders = orders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  // Notifications
  useOrderNotifications({
    enabled: notificationsEnabled && (currentProfile === 'entreprise' ? true : isAvailable),
    onNewOrder: currentProfile === 'entreprise' ? pendingOrders : availableOrders
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const entrepriseData = user.profiles?.entreprise || {};
  const livreurData = user.profiles?.livreur || {};

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-orange-500">
                {currentProfile === 'entreprise' ? entrepriseData.company_name : 
                 currentProfile === 'livreur' ? 'Rapido Presto' : 
                 'Mes Commandes'}
              </h1>
              {currentProfile === 'entreprise' && (
                <p className="text-sm text-slate-500">{entrepriseData.company_category}</p>
              )}
              {currentProfile === 'livreur' && (
                <p className="text-sm text-slate-500">Livreur • {livreurData.vehicle_type}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              {(currentProfile === 'entreprise' || currentProfile === 'livreur') && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (!soundInitialized) {
                      initializeSound();
                      toast.success('Notifications sonores activées');
                    }
                    setNotificationsEnabled(!notificationsEnabled);
                  }}
                  title={notificationsEnabled ? 'Désactiver le son' : 'Activer le son'}
                >
                  {notificationsEnabled ? (
                    <Volume2 className="w-5 h-5 text-orange-500" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-slate-400" />
                  )}
                </Button>
              )}
              {currentProfile === 'livreur' && (
                <>
                  <Label className="text-sm text-slate-600">
                    {isAvailable ? 'Disponible' : 'Hors ligne'}
                  </Label>
                  <Switch
                    checked={isAvailable}
                    onCheckedChange={(checked) => toggleAvailabilityMutation.mutate(checked)}
                    className={isAvailable ? 'bg-green-500' : ''}
                  />
                </>
              )}
              {currentProfile === 'entreprise' && pendingOrders.length > 0 && (
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
        {/* DRIVER: Available Orders */}
        {currentProfile === 'livreur' && isAvailable && availableOrders.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-orange-500" />
              Nouvelles commandes disponibles
            </h3>
            <div className="space-y-3">
              <AnimatePresence>
                {availableOrders.map(order => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="bg-white rounded-xl p-4 border-2 border-green-200"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-semibold">#{order.order_number}</p>
                        <p className="text-sm text-slate-500">
                          {format(new Date(order.created_date), "HH:mm", { locale: fr })}
                        </p>
                      </div>
                      <span className="font-bold text-green-600">{order.total} HTG</span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Boutique</p>
                          <p className="text-slate-600">{order.shop_name} • {order.shop_commune}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <Navigation className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Client</p>
                          <p className="text-slate-600">{order.client_address}, {order.client_commune}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">
                          Temps estimé: {order.shop_commune === order.client_commune ? '15-20' : '25-35'} min
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-600">{order.payment_method}</span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button 
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => acceptOrderMutation.mutate(order)}
                        disabled={acceptOrderMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Accepter
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {currentProfile === 'livreur' && isAvailable && availableOrders.length === 0 && activeOrders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-slate-600">En attente de commandes...</p>
            <p className="text-sm text-slate-400 mt-1">Les nouvelles commandes apparaîtront ici</p>
          </div>
        )}

        {currentProfile === 'livreur' && !isAvailable && (
          <div className="text-center py-12 bg-white rounded-xl mb-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600">Vous êtes hors ligne</p>
            <p className="text-sm text-slate-400 mt-1">Activez votre disponibilité pour recevoir des commandes</p>
          </div>
        )}

        {/* ENTERPRISE: Tabs for orders and products */}
        {currentProfile === 'entreprise' ? (
          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="w-full bg-white mb-6">
              <TabsTrigger value="orders" className="flex-1">
                Commandes ({activeOrders.length + pendingOrders.length})
              </TabsTrigger>
              <TabsTrigger value="products" className="flex-1">
                Mes Articles ({products.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
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
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="w-full bg-white">
              <TabsTrigger value="active" className="flex-1">
                {currentProfile === 'livreur' ? 'En cours' : 'Actives'} ({activeOrders.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1">
                Historique ({historyOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4 space-y-3">
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
                        {currentProfile === 'client' ? order.shop_name : 
                         format(new Date(order.created_date), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                    </div>
                    <span className="font-bold text-orange-500">{order.total} HTG</span>
                  </div>
                  
                  {currentProfile === 'client' && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-slate-500">
                        {order.items?.length} article{order.items?.length > 1 ? 's' : ''}
                      </p>
                      {order.driver_name && (
                        <p className="text-xs text-slate-500 mt-1">
                          Livreur: {order.driver_name}
                        </p>
                      )}
                    </div>
                  )}

                  {currentProfile === 'livreur' && (
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Navigation className="w-4 h-4" />
                        <span>{order.client_commune}</span>
                      </div>
                      <a 
                        href={`tel:${order.client_phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 text-blue-600"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  )}
                </div>
              ))}
              {activeOrders.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  {currentProfile === 'livreur' ? 'Aucune livraison en cours' : 'Aucune commande active'}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4 space-y-3">
              {historyOrders.slice(0, 20).map(order => (
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
                        {format(new Date(order.created_date), "d MMM yyyy", { locale: fr })}
                      </p>
                    </div>
                    <span className="font-bold text-slate-600">{order.total} HTG</span>
                  </div>
                </div>
              ))}
              {historyOrders.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  Aucune commande dans l'historique
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        userType={currentProfile}
        onUpdateStatus={(id, status) => updateOrderMutation.mutate({ id, status })}
        onConfirmDelivery={(id) => confirmDeliveryMutation.mutate(id)}
      />
    </div>
  );
}