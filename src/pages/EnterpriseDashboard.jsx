import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Bell, Edit, Trash2, Eye, EyeOff, Volume2, VolumeX, X, Tag, ShoppingBag, Settings, BarChart3, User, Search, Upload, Camera } from 'lucide-react';
import ProfileSwitcher from '@/components/profile/ProfileSwitcher';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { formatHaitiDate } from '@/components/utils/dateFormat';
import { motion, AnimatePresence } from 'framer-motion';
import OrderStatusBadge from '@/components/ui/OrderStatusBadge';
import OrderDetailModal from '@/components/modals/OrderDetailModal';
import { useOrderNotifications, useBrowserNotifications, useNotificationSound } from '@/components/notifications/NotificationManager';
import { useWebSocket, useAutoRefresh } from '@/components/realtime/useWebSocket';
import RealtimeIndicator from '@/components/realtime/RealtimeIndicator';
import { useBackgroundSync, BackgroundSyncIndicator } from '@/components/realtime/BackgroundSync';
import SalesStats from '@/components/enterprise/SalesStats';
import PromotionsManager from '@/components/enterprise/PromotionsManager';
import OpeningHoursManager from '@/components/enterprise/OpeningHoursManager';

export default function EnterpriseDashboard() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('orders');
  const [guidelinesDialogOpen, setGuidelinesDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '', price: '', promo_price: '', description: '', image_url: '', additional_images: [], category: '', taille_emballage: '', delivery_time: '', stock_quantity: '', seo_tags: [], is_available: true
  });
  const [tagInput, setTagInput] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountForm, setAccountForm] = useState({
    address: '', payment_method: '', current_password: '', new_password: ''
  });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { requestPermission } = useBrowserNotifications();
  const { initialize: initializeSound, isInitialized: soundInitialized } = useNotificationSound();

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

  // Fetch or create shop for this user
  const { data: myShop } = useQuery({
    queryKey: ['my-shop', user?.id],
    queryFn: async () => {
      const shops = await base44.entities.Shop.filter({ user_id: user.id });
      if (shops.length > 0) return shops[0];
      
      // Create shop if doesn't exist
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
    enabled: !!user?.id
  });

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ['my-products', myShop?.id],
    queryFn: () => base44.entities.Product.filter({ shop_id: myShop.id }),
    enabled: !!myShop?.id,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  // Fetch orders avec animation
  const { data: orders = [] } = useQuery({
    queryKey: ['shop-orders', myShop?.id],
    queryFn: () => base44.entities.Order.filter({ shop_id: myShop?.id }, '-created_date'),
    enabled: !!myShop?.id,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  const updateShopMutation = useMutation({
    mutationFn: (data) => base44.entities.Shop.update(myShop.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['my-shop']);
      toast.success('Boutique mise à jour');
    }
  });

  // WebSocket temps réel
  const { isConnected, broadcast } = useWebSocket({
    channel: 'orders',
    userId: user?.id,
    enabled: !!user
  });
  
  // Auto-refresh toutes les 60 secondes
  useAutoRefresh({ 
    queryKey: ['shop-orders'], 
    refetchInterval: 60000,
    enabled: !!myShop?.id 
  });
  
  // Background sync intelligent
  const { syncStatus, lastSync, connectionType } = useBackgroundSync({
    userType: 'entreprise',
    enabled: !!user && user.current_profile === 'entreprise'
  });

  const productMutation = useMutation({
    mutationFn: async (data) => {
      if (editingProduct) {
        return base44.entities.Product.update(editingProduct.id, data);
      }
      return base44.entities.Product.create({
        ...data,
        shop_id: myShop.id,
        shop_name: myShop.company_name,
        category: myShop.company_category
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

  const toggleOnlineMutation = useMutation({
    mutationFn: async (status) => {
      // Mettre à jour le statut de la boutique
      await base44.entities.Shop.update(myShop.id, { is_active: status });
      
      // Mettre à jour la disponibilité de tous les produits
      const updatePromises = products.map(product => 
        base44.entities.Product.update(product.id, { is_available: status })
      );
      await Promise.all(updatePromises);
      
      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries(['my-shop']);
      queryClient.invalidateQueries(['my-products']);
      setIsOnline(status);
      toast.success(status ? 'Boutique en ligne' : 'Boutique hors ligne');
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const updates = { status };
      if (status === 'ready') {
        updates.status = 'searching_driver';
      }
      const updatedOrder = await base44.entities.Order.update(id, updates);
      
      // Envoyer notifications push selon le statut
      const notificationMap = {
        'preparing': {
          title: '✅ Commande acceptée',
          message: `Votre commande #${updatedOrder.order_number} a été acceptée par ${updatedOrder.shop_name}`
        },
        'searching_driver': {
          title: '🍽️ Commande prête',
          message: `Votre commande #${updatedOrder.order_number} est prête, recherche d'un livreur...`
        }
      };

      if (notificationMap[updates.status]) {
        await base44.functions.invoke('sendPushNotification', {
          userId: updatedOrder.client_id,
          title: notificationMap[updates.status].title,
          message: notificationMap[updates.status].message,
          data: { orderId: id, status: updates.status }
        }).catch(err => console.error('Push notification error:', err));
      }
      
      return { id, status: updates.status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shop-orders']);
      broadcast('Order', 'updated');
      setSelectedOrder(null);
      toast.success('Statut mis à jour');
    }
  });

  const resetProductForm = () => {
    setProductForm({ name: '', price: '', promo_price: '', description: '', image_url: '', additional_images: [], category: '', taille_emballage: '', delivery_time: '', stock_quantity: '', seo_tags: [], is_available: true });
    setTagInput('');
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
      additional_images: product.additional_images || [],
      category: product.category || '',
      taille_emballage: product.taille_emballage || '',
      delivery_time: product.delivery_time || '',
      stock_quantity: product.stock_quantity || '',
      seo_tags: product.seo_tags || [],
      is_available: product.is_available !== false
    });
    setProductDialogOpen(true);
  };

  const handleProductSubmit = () => {
    productMutation.mutate({
      ...productForm,
      price: Number(productForm.price),
      promo_price: productForm.promo_price ? Number(productForm.promo_price) : null,
      stock_quantity: productForm.stock_quantity ? parseInt(productForm.stock_quantity) : 0
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

  const handleAdditionalImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProductForm({ 
        ...productForm, 
        additional_images: [...(productForm.additional_images || []), file_url] 
      });
      toast.success('Image ajoutée');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const removeAdditionalImage = (index) => {
    setProductForm({
      ...productForm,
      additional_images: productForm.additional_images.filter((_, i) => i !== index)
    });
  };

  const addTag = () => {
    if (tagInput.trim() && !productForm.seo_tags.includes(tagInput.trim())) {
      setProductForm({
        ...productForm,
        seo_tags: [...(productForm.seo_tags || []), tagInput.trim()]
      });
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setProductForm({
      ...productForm,
      seo_tags: productForm.seo_tags.filter(t => t !== tag)
    });
  };

  const handleAIGeneration = async () => {
    if (!productForm.name || !productForm.image_url) {
      toast.error('Veuillez ajouter un titre et une photo avant d\'utiliser l\'IA');
      return;
    }

    setAiLoading(true);
    try {
      const prompt = `Analyse cette image de produit nommée "${productForm.name}".
      
Retourne UNIQUEMENT un objet JSON valide avec:
1. "description": Une description attrayante et commerciale (max 250 caractères)
2. "category": Choisis UNE catégorie parmi: Fastfood, Restaurants, Boutique Fleurs, Pharmacie, Vêtements, Epicerie, Café, Pour Femme, Electronics, Pour homme, Maison, Bébé, Outils
3. "tags": Liste de 5 mots-clés pertinents en français

Format JSON strict requis.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        file_urls: [productForm.image_url],
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            category: { type: "string" },
            tags: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Mise à jour du formulaire avec les données de l'IA
      const aiCategory = response.category || productForm.category;
      
      // Logique automatique pour Restaurant, Fastfood, Café
      const isRestaurantCategory = ['Restaurants', 'Fastfood', 'Café'].includes(aiCategory);
      
      setProductForm({
        ...productForm,
        description: response.description || productForm.description,
        category: aiCategory,
        seo_tags: response.tags || productForm.seo_tags,
        // Valeurs automatiques pour restaurants
        stock_quantity: isRestaurantCategory ? '1000' : productForm.stock_quantity,
        delivery_time: isRestaurantCategory ? '30-45 minutes' : productForm.delivery_time,
        taille_emballage: isRestaurantCategory ? 'Petit' : productForm.taille_emballage
      });

      toast.success('✨ Magie IA appliquée avec succès!');
    } catch (error) {
      console.error('AI generation error:', error);
      toast.error('Erreur lors de la génération IA');
    } finally {
      setAiLoading(false);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending');
  const activeOrders = orders.filter(o => ['preparing', 'ready', 'searching_driver'].includes(o.status));

  // Activer les notifications pour nouvelles commandes
  useOrderNotifications({
    enabled: notificationsEnabled,
    onNewOrder: pendingOrders,
    title: '🔔 Nouvelle commande entreprise',
    message: 'Vous avez une nouvelle commande à traiter'
  });

  if (!user || user.current_profile !== 'entreprise') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Accès réservé aux entreprises</p>
      </div>
    );
  }

  const entrepriseData = user.profiles?.entreprise || {};

  // Sidebar navigation items
  const navItems = [
    { id: 'orders', label: 'Commandes', icon: ShoppingBag, count: pendingOrders.length },
    { id: 'products', label: 'Articles', icon: Package },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
    { id: 'settings', label: 'Réglages', icon: Settings },
    { id: 'account', label: 'Compte', icon: User }
  ];

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const updatedProfiles = { ...user.profiles };
      updatedProfiles.entreprise = { ...updatedProfiles.entreprise, company_logo_url: file_url };
      await base44.auth.updateMe({ profiles: updatedProfiles });
      queryClient.invalidateQueries(['my-shop']);
      toast.success('Photo mise à jour');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleAccountUpdate = async () => {
    try {
      await base44.auth.updateMe({
        address: accountForm.address,
        payment_method: accountForm.payment_method
      });
      toast.success('Informations mises à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* SIDEBAR - 20% fixed */}
      <aside className="w-1/5 bg-white border-r flex flex-col py-6 shadow-lg z-20">
        <div className="px-6 mb-10">
          <h1 className="text-xl font-black text-blue-600 tracking-tighter">RAPIDO PRESTO</h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase">Dashboard Partenaire</p>
        </div>
        
        <nav className="flex-1 space-y-2 px-4 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all font-bold text-sm ${
                  activeTab === item.id 
                    ? 'bg-blue-600 text-white shadow-blue-200 shadow-lg' 
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
                {item.count > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="px-4 mt-auto space-y-3 border-t pt-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-gray-500">
              {myShop?.is_active !== false ? '🟢 En ligne' : '🔴 Hors ligne'}
            </span>
            <Switch
              checked={myShop?.is_active !== false}
              onCheckedChange={(checked) => toggleOnlineMutation.mutate(checked)}
            />
          </div>
          <div className="flex items-center gap-2 px-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (!soundInitialized) initializeSound();
                setNotificationsEnabled(!notificationsEnabled);
              }}
            >
              {notificationsEnabled ? <Volume2 className="w-5 h-5 text-blue-600" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
            </Button>
            <ProfileSwitcher user={user} />
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT - 80% scrollable */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="h-full">
          {/* Orders Tab */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
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
                       className="bg-white rounded-xl p-3 sm:p-4 border-2 border-orange-200 cursor-pointer hover:shadow-md"
                      >
                       <div className="flex justify-between items-start gap-2">
                         <div className="min-w-0 flex-1">
                           <p className="font-semibold text-sm sm:text-base truncate">#{order.order_number}</p>
                           <p className="text-xs sm:text-sm text-slate-500">
                             {formatHaitiDate(order.created_date, "HH:mm")}
                           </p>
                         </div>
                         <span className="font-bold text-orange-500 text-sm sm:text-base whitespace-nowrap">{order.total} HTG</span>
                       </div>
                       <div className="mt-2 text-xs sm:text-sm text-slate-600 line-clamp-2">
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
                    className="bg-white rounded-xl p-3 sm:p-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm sm:text-base">#{order.order_number}</span>
                          <OrderStatusBadge status={order.status} />
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                          {formatHaitiDate(order.created_date, "d MMM HH:mm")}
                        </p>
                      </div>
                      <span className="font-bold text-orange-500 text-sm sm:text-base whitespace-nowrap">{order.total} HTG</span>
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
          )}

          {/* Products Tab */}
          {activeTab === 'products' && (
            <div className="flex flex-col h-full">
            {/* Sticky Search Bar - Pill Style */}
            <header className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-8 py-6 border-b flex justify-between items-center">
              <div className="relative w-1/3">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Rechercher un article..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-gray-100 rounded-full border-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all outline-none"
                />
              </div>
              <button 
                onClick={() => setGuidelinesDialogOpen(true)}
                className="bg-green-500 text-white px-6 py-3 rounded-full font-bold text-sm shadow-lg hover:scale-105 transition-transform"
              >
                + Ajouter un article
              </button>
            </header>

            <div className="p-8 flex-1 overflow-y-auto">
              
              {/* Guidelines Dialog */}
              <AlertDialog open={guidelinesDialogOpen} onOpenChange={setGuidelinesDialogOpen}>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-center text-xl flex items-center justify-center gap-2">
                      ⚠️ Consignes pour la création d'articles
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-4 pt-4 text-base">
                        <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                          <span className="text-2xl">📝</span>
                          <div>
                            <p className="font-semibold text-slate-900">Ajoute le Titre de votre article</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                          <span className="text-2xl">📷</span>
                          <div>
                            <p className="font-semibold text-slate-900">Ajoute Photos réelles de bonne qualité</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border-2 border-purple-200">
                          <span className="text-2xl">✨</span>
                          <div>
                            <p className="font-semibold text-purple-900">Lancer avec Magie AI</p>
                            <p className="text-sm text-purple-700">(génération automatique de la description et catégorie)</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                          <span className="text-2xl">💰</span>
                          <div>
                            <p className="font-semibold text-slate-900">Ajoute les Prix fixe obligatoire en Gourdes</p>
                            <p className="text-sm text-slate-600">(aucune négociation possible avec les acheteurs)</p>
                          </div>
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-orange-500 hover:bg-orange-600"
                      onClick={() => {
                        setGuidelinesDialogOpen(false);
                        setProductDialogOpen(true);
                      }}
                    >
                      J'ai compris
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Product Dialog */}
              <Dialog open={productDialogOpen} onOpenChange={(open) => {
                setProductDialogOpen(open);
                if (!open) resetProductForm();
              }}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingProduct ? 'Modifier l\'article' : 'Nouvel article'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4 pb-4">
                    <div>
                      <Label>Nom</Label>
                      <Input
                        value={productForm.name}
                        onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                        placeholder="Ex: Pizza Margherita"
                      />
                    </div>
                    
                    <div>
                      <Label>Photo principale</Label>
                      <Input type="file" accept="image/*" onChange={handleImageUpload} />
                      {productForm.image_url && (
                        <img src={productForm.image_url} alt="" className="mt-2 h-24 w-24 object-cover rounded-lg" />
                      )}
                    </div>

                    {/* AI Magic Button */}
                    {productForm.name && productForm.image_url && (
                      <div className="bg-gradient-to-r from-purple-50 to-orange-50 p-4 rounded-xl border-2 border-dashed border-purple-200">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-purple-900 mb-1">✨ Magie IA</p>
                            <p className="text-xs text-purple-700">
                              Générer automatiquement description, catégorie et tags
                            </p>
                          </div>
                          <Button 
                            type="button"
                            onClick={handleAIGeneration}
                            disabled={aiLoading}
                            className="bg-gradient-to-r from-purple-600 to-orange-500 hover:from-purple-700 hover:to-orange-600"
                          >
                            {aiLoading ? (
                              <>
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                Génération...
                              </>
                            ) : (
                              <>✨ Lancer</>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
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
                      <Label>Catégorie</Label>
                      <Select 
                        value={productForm.category} 
                        onValueChange={(val) => setProductForm({ ...productForm, category: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner une catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fastfood">Fastfood</SelectItem>
                          <SelectItem value="Restaurants">Restaurants</SelectItem>
                          <SelectItem value="Boutique Fleurs">Boutique Fleurs</SelectItem>
                          <SelectItem value="Pharmacie">Pharmacie</SelectItem>
                          <SelectItem value="Mariage">Mariage</SelectItem>
                          <SelectItem value="Epicerie">Epicerie</SelectItem>
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
                    <div>
                      <Label>Taille d'emballage</Label>
                      <Select 
                        value={productForm.taille_emballage} 
                        onValueChange={(val) => setProductForm({ ...productForm, taille_emballage: val })}
                      >
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
                    <div>
                      <Label>Quantité en stock</Label>
                      <Input
                        type="number"
                        value={productForm.stock_quantity}
                        onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Délai de livraison</Label>
                      <Select 
                        value={productForm.delivery_time} 
                        onValueChange={(val) => setProductForm({ ...productForm, delivery_time: val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un délai" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30-45 minutes">30-45 minutes</SelectItem>
                          <SelectItem value="24 heures">24 heures</SelectItem>
                          <SelectItem value="3-5 jours">3-5 jours</SelectItem>
                          <SelectItem value="15 jours">15 jours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Photos supplémentaires</Label>
                      <Input type="file" accept="image/*" onChange={handleAdditionalImageUpload} />
                      {productForm.additional_images && productForm.additional_images.length > 0 && (
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {productForm.additional_images.map((img, idx) => (
                            <div key={idx} className="relative">
                              <img src={img} alt="" className="h-16 w-16 object-cover rounded-lg" />
                              <button
                                type="button"
                                onClick={() => removeAdditionalImage(idx)}
                                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label>Tags SEO (recherche)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                          placeholder="Ex: pizza, burger"
                        />
                        <Button type="button" onClick={addTag} variant="outline" size="icon">
                          <Tag className="w-4 h-4" />
                        </Button>
                      </div>
                      {productForm.seo_tags && productForm.seo_tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {productForm.seo_tags.map((tag, idx) => (
                            <div key={idx} className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                              {tag}
                              <button type="button" onClick={() => removeTag(tag)}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
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

            {/* Products Grid - Premium Widget Design */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map(product => (
                <div key={product.id} className="bg-white rounded-3xl p-4 shadow-sm hover:shadow-xl transition-shadow flex flex-col group border border-gray-100">
                  <div className="relative h-48 rounded-2xl bg-gray-50 overflow-hidden mb-4">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
                    )}
                    {!product.is_available && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <EyeOff className="w-8 h-8 text-white" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2 bg-white/90 px-3 py-1 rounded-full text-[10px] font-black text-blue-600">
                      {product.is_available ? 'EN STOCK' : 'INDISPONIBLE'}
                    </div>
                    {product.promo_price && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold">
                        -{Math.round((1 - product.promo_price / product.price) * 100)}%
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-lg text-gray-800 mb-2 line-clamp-2 min-h-[3.5rem]">{product.name}</h3>
                  <p className="text-blue-600 font-black text-xl mb-4">{product.price} HTG</p>
                  {product.stock_quantity !== undefined && (
                    <p className="text-xs text-gray-500 mb-3">📦 Stock: {product.stock_quantity}</p>
                  )}
                  <div className="flex gap-2 mt-auto">
                    <button 
                      onClick={() => handleEditProduct(product)}
                      className="flex-1 bg-gray-100 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 transition-colors"
                    >
                      Modifier
                    </button>
                    <button 
                      onClick={() => deleteProductMutation.mutate(product.id)}
                      className="w-10 bg-red-50 text-red-500 py-2 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </div>
            {filteredProducts.length === 0 && (
              <div className="text-center py-16 bg-white rounded-3xl">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">
                  {searchQuery ? 'Aucun article trouvé' : 'Aucun article. Cliquez sur "Ajouter" pour commencer.'}
                </p>
              </div>
            )}
            </div>
            </div>
          )}

          {/* Stats Tab */}
          {activeTab === 'stats' && (
            <div>
              <SalesStats orders={orders} products={products} />
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
            {/* Marketing Section */}
            <div className="bg-white rounded-xl p-4 sm:p-6 border-2 border-orange-200">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl flex-shrink-0">🚀</span>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-lg font-semibold flex items-center gap-2 flex-wrap">
                      <span className="truncate">Boost Automatique</span>
                      <span className="text-[10px] sm:text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                        👑 Premium
                      </span>
                    </h3>
                    {myShop?.is_premium && myShop?.premium_until && new Date(myShop.premium_until) > new Date() && (
                      <p className="text-xs text-green-600 mt-1">
                        Actif jusqu'au {new Date(myShop.premium_until).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 mb-4">
                Diffusez vos produits sur Facebook, Instagram et Google. 
                Notre IA s'occupe de trouver des clients pour vous à Port-au-Prince.
              </p>

              <div className="bg-orange-50 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-slate-800 block text-xs sm:text-base">
                    {myShop?.boost_enabled && myShop?.is_premium 
                      ? "✅ Votre boutique est mise en avant" 
                      : myShop?.is_premium 
                        ? "Promotion désactivée"
                        : "Nécessite Premium"}
                  </span>
                  <small className="text-[10px] sm:text-xs text-slate-600 block mt-1">
                    {myShop?.boost_enabled && myShop?.is_premium
                      ? "Vos produits apparaissent dans nos campagnes." 
                      : myShop?.is_premium
                        ? "Activez le boost pour diffuser vos produits."
                        : "Abonnement Premium requis - 1000 HTG/mois"}
                  </small>
                </div>

                <Switch
                  checked={myShop?.boost_enabled && myShop?.is_premium || false}
                  onCheckedChange={(checked) => {
                    const isPremium = myShop?.is_premium && myShop?.premium_until && new Date(myShop.premium_until) > new Date();
                    if (checked && !isPremium) {
                      navigate(createPageUrl('Pricing'));
                      toast.info('Cette fonctionnalité nécessite un abonnement Premium');
                      return;
                    }
                    updateShopMutation.mutate({ boost_enabled: checked });
                  }}
                  disabled={updateShopMutation.isPending}
                />
              </div>

              {!myShop?.is_premium && (
                <Button
                  className="w-full mt-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
                  onClick={() => navigate(createPageUrl('Pricing'))}
                >
                  👑 Passer au Premium - 1000 HTG/mois
                </Button>
              )}

              <p className="text-xs text-slate-400 mt-3">
                * Les produits sans photos ou sans prix ne seront pas diffusés par Meta.
              </p>
            </div>

            <OpeningHoursManager 
              shop={myShop} 
              onUpdateShop={(data) => updateShopMutation.mutate(data)}
            />
            <PromotionsManager 
              shop={myShop} 
              products={products}
              onUpdateShop={(data) => updateShopMutation.mutate(data)}
            />
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="p-8 max-w-4xl mx-auto space-y-8">
              <h2 className="text-3xl font-black text-gray-800">Mon Compte</h2>

              {/* WIDGET : Photo & Profil */}
              <section className="bg-white rounded-3xl p-8 shadow-sm flex items-center gap-8 border border-gray-100">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full bg-gray-200 overflow-hidden border-4 border-white shadow-md">
                    {entrepriseData.company_logo_url ? (
                      <img src={entrepriseData.company_logo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-blue-100">
                        <Package className="w-16 h-16 text-blue-600" />
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:scale-110 transition-transform cursor-pointer">
                    <Camera className="w-5 h-5" />
                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </label>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-gray-400 uppercase mb-2">Nom de l'entreprise</h4>
                  <input 
                    type="text" 
                    className="text-2xl font-bold bg-transparent border-b border-gray-100 w-full focus:border-blue-500 outline-none transition-colors" 
                    defaultValue={entrepriseData.company_name}
                    disabled
                  />
                  <p className="text-gray-400 text-sm mt-2">ID Partenaire: #{myShop?.id?.slice(0, 8)}</p>
                </div>
              </section>

              {/* WIDGET : Informations */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <h4 className="font-bold mb-4 flex items-center gap-2">📧 Informations de contact</h4>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Email</label>
                    <input 
                      type="email"
                      value={user.email}
                      disabled
                      className="w-full bg-gray-50 rounded-xl p-3 text-sm outline-none"
                    />
                  </div>
                  {user.phone && (
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase">Téléphone</label>
                      <input 
                        type="tel"
                        value={user.phone}
                        disabled
                        className="w-full bg-gray-50 rounded-xl p-3 text-sm outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* WIDGET : Adresse & Paiement */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <h4 className="font-bold mb-4 flex items-center gap-2">📍 Adresse Professionnelle</h4>
                  <textarea 
                    value={accountForm.address || user.address || ''}
                    onChange={(e) => setAccountForm({ ...accountForm, address: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl p-4 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    placeholder="Rue Panaméricaine, Pétion-Ville, Haïti"
                    rows={4}
                  />
                  <button 
                    onClick={handleAccountUpdate}
                    className="mt-3 w-full bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                  <h4 className="font-bold mb-4 flex items-center gap-2">💳 Méthode de Paiement</h4>
                  <select 
                    value={accountForm.payment_method || user.payment_method || ''}
                    onChange={(e) => setAccountForm({ ...accountForm, payment_method: e.target.value })}
                    className="w-full bg-gray-50 rounded-2xl p-4 text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Sélectionner</option>
                    <option value="CASH">Cash à la livraison</option>
                    <option value="moncash">MonCash (509 4XXX XXXX)</option>
                    <option value="card">Carte bancaire</option>
                  </select>
                  <button 
                    onClick={handleAccountUpdate}
                    className="mt-3 w-full bg-blue-600 text-white py-2 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>

              {/* WIDGET : Sécurité */}
              <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <h4 className="font-bold mb-6">🔒 Sécurité du compte</h4>
                <div className="space-y-3 mb-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Mot de passe actuel</label>
                    <input 
                      type="password"
                      value={accountForm.current_password}
                      onChange={(e) => setAccountForm({ ...accountForm, current_password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 rounded-xl p-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase">Nouveau mot de passe</label>
                    <input 
                      type="password"
                      value={accountForm.new_password}
                      onChange={(e) => setAccountForm({ ...accountForm, new_password: e.target.value })}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 rounded-xl p-3 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-4">
                  <button 
                    onClick={() => toast.info('Fonctionnalité de changement de mot de passe à implémenter')}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    Changer le mot de passe
                  </button>
                  <button className="w-fit text-red-500 font-bold hover:underline text-sm">
                    Déconnexion de tous les appareils
                  </button>
                </div>
              </section>

              <button 
                onClick={() => base44.auth.logout()}
                className="w-full border-2 border-red-200 text-red-600 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors"
              >
                Déconnexion
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        userType="entreprise"
        onUpdateStatus={(id, status) => updateOrderMutation.mutate({ id, status })}
      />
      
      <BackgroundSyncIndicator 
        syncStatus={syncStatus} 
        lastSync={lastSync} 
        connectionType={connectionType}
      />
      </div>
  );
}