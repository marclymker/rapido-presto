import React, { useState, useEffect } from 'react';
import { firebase } from '@/api/firebaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapPin, Clock, CreditCard, Check, Navigation, Phone, Package, Volume2, VolumeX } from 'lucide-react';
import ProfileSwitcher from '@/components/profile/ProfileSwitcher';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatHaitiDate } from '@/components/utils/dateFormat';
import { motion, AnimatePresence } from 'framer-motion';
import OrderStatusBadge from '@/components/ui/OrderStatusBadge';
import OrderDetailModal from '@/components/modals/OrderDetailModal';
import { useOrderNotifications, useBrowserNotifications, useNotificationSound } from '@/components/notifications/NotificationManager';
import { useWebSocket, useAutoRefresh } from '@/components/realtime/useWebSocket';
import RealtimeIndicator from '@/components/realtime/RealtimeIndicator';
import { useBackgroundSync, BackgroundSyncIndicator } from '@/components/realtime/BackgroundSync';
import BusinessSmartNav from '@/components/navigation/BusinessSmartNav';
import OrderFilters from '@/components/filters/OrderFilters';

export default function DriverDashboard() {
  const [user, setUser] = useState(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [navTab, setNavTab] = useState('available');
  const [orderFilter, setOrderFilter] = useState('all');
  const queryClient = useQueryClient();
  const { requestPermission } = useBrowserNotifications(user);
  const { initialize: initializeSound, isInitialized: soundInitialized } = useNotificationSound(user);

  // WebSocket temps réel
  const { isConnected, broadcast } = useWebSocket({
    channel: 'orders',
    userId: user?.id,
    enabled: !!user && isAvailable
  });

  // Auto-refresh
  useAutoRefresh({
    queryKey: ['available-orders'],
    refetchInterval: 60000,
    enabled: isAvailable
  });

  useAutoRefresh({
    queryKey: ['driver-orders'],
    refetchInterval: 60000,
    enabled: !!user?.id
  });

  // Background sync intelligent
  const { syncStatus, lastSync, connectionType } = useBackgroundSync({
    userType: 'livreur',
    enabled: !!user && user.current_profile === 'livreur'
  });

  useEffect(() => {
    firebase.auth.me().then(u => {
      setUser(u);
      setIsAvailable(u.profiles?.livreur?.is_available || false);

      // Redirect if wrong profile
      if (u.current_profile !== 'livreur') {
        const redirectPages = {
          client: 'Home',
          entreprise: 'EnterpriseDashboard'
        };
        window.location.href = createPageUrl(redirectPages[u.current_profile] || 'Home');
      }
    }).catch(() => {});
  }, []);

  // Demander la permission pour les notifications au chargement
  useEffect(() => {
    if (user && isAvailable) {
      requestPermission();
    }
  }, [user, isAvailable, requestPermission]);

  // Fetch available orders (searching for driver in driver's commune)
  const { data: availableOrders = [] } = useQuery({
    queryKey: ['available-orders', user?.profiles?.livreur?.commune],
    queryFn: async () => {
      const orders = await firebase.entities.Order.filter({
        status: 'searching_driver'
      }, '-created_date');
      // Filter by commune match + Anti-auto-acceptation (ne pas voir ses propres commandes)
      const driverCommune = user?.profiles?.livreur?.commune;
      return orders.filter(o =>
        (o.shop_commune === driverCommune || o.client_commune === driverCommune) &&
        o.client_id !== user.id // Restriction: impossible de livrer sa propre commande
      );
    },
    enabled: !!user?.profiles?.livreur?.commune && isAvailable,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  // Fetch driver's orders
  const { data: myOrders = [] } = useQuery({
    queryKey: ['driver-orders', user?.id],
    queryFn: () => firebase.entities.Order.filter({ driver_id: user?.id }, '-created_date'),
    enabled: !!user?.id,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  // Fetch self orders (commandes passées par le livreur lui-même)
  const { data: selfOrders = [] } = useQuery({
    queryKey: ['self-orders', user?.id],
    queryFn: () => firebase.entities.Order.filter({ client_id: user?.id }, '-created_date'),
    enabled: !!user?.id,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: (available) => {
      const profiles = { ...user.profiles };
      profiles.livreur = { ...profiles.livreur, is_available: available };
      return firebase.auth.updateMe({ profiles });
    },
    onSuccess: (_, available) => {
      setIsAvailable(available);
      toast.success(available ? 'Vous êtes maintenant disponible' : 'Vous êtes hors ligne');
    }
  });

  const acceptOrderMutation = useMutation({
    mutationFn: async (order) => {
      // RESTRICTION ANTI-AUTO-ACCEPTATION: Empêcher de livrer sa propre commande
      if (order.client_id === user.id) {
        throw new Error('Vous ne pouvez pas livrer votre propre commande');
      }

      const updatedOrder = await firebase.entities.Order.update(order.id, {
        status: 'driver_assigned',
        driver_id: user.id,
        driver_name: user.full_name,
        driver_phone: user.phone
      });

      // Notification push au client
      await firebase.functions.invoke('sendPushNotification', {
        userId: updatedOrder.client_id,
        title: '🏍️ Livreur assigné',
        message: `${user.full_name} a accepté votre commande et est en route vers la boutique`,
        data: { orderId: order.id, status: 'driver_assigned' }
      }).catch(err => console.error('Push notification error:', err));

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['available-orders']);
      queryClient.invalidateQueries(['driver-orders']);
      toast.success('Commande acceptée');
    },
    onError: (error) => {
      toast.error(error.message || 'Erreur lors de l\'acceptation');
    }
  });

  const updateOrderMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const updatedOrder = await firebase.entities.Order.update(id, { status });

      // Notification push pour "en livraison"
      if (status === 'in_delivery') {
        await firebase.functions.invoke('sendPushNotification', {
          userId: updatedOrder.client_id,
          title: '🚴 Livraison en route',
          message: `${updatedOrder.driver_name} est en chemin vers vous`,
          data: { orderId: id, status }
        }).catch(err => console.error('Push notification error:', err));
      }

      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['driver-orders']);
      setSelectedOrder(null);
      toast.success('Statut mis à jour');
    }
  });

  const confirmDeliveryMutation = useMutation({
    mutationFn: async (id) => {
      const updatedOrder = await firebase.entities.Order.update(id, { status: 'delivered' });

      // Notification push de livraison réussie
      await firebase.functions.invoke('sendPushNotification', {
        userId: updatedOrder.client_id,
        title: '✅ Commande livrée',
        message: 'Votre commande a été livrée avec succès. Bon appétit!',
        data: { orderId: id, status: 'delivered' }
      }).catch(err => console.error('Push notification error:', err));

      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['driver-orders']);
      setSelectedOrder(null);
      toast.success('Livraison confirmée!');
    }
  });

  const activeOrders = myOrders.filter(o => ['driver_assigned', 'in_delivery'].includes(o.status));
  const historyOrders = myOrders.filter(o => ['delivered', 'cancelled'].includes(o.status));

  // Activer les notifications pour nouvelles commandes disponibles
  useOrderNotifications({
    enabled: notificationsEnabled && isAvailable,
    onNewOrder: availableOrders,
    title: '🚴 Nouvelle livraison disponible',
    message: 'Une nouvelle commande est prête pour livraison'
  });

  if (!user || user.current_profile !== 'livreur') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Accès réservé aux livreurs</p>
      </div>
    );
  }

  const livreurData = user.profiles?.livreur || {};

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-orange-500">Rapido Presto</h1>
              <p className="text-sm text-slate-500">Livreur • {livreurData.vehicle_type}</p>
            </div>
            <div className="flex items-center gap-3">
              <RealtimeIndicator isConnected={isConnected} />
              <ProfileSwitcher user={user} />
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
              <Label className="text-sm text-slate-600">
                {isAvailable ? 'Disponible' : 'Hors ligne'}
              </Label>
              <Switch
                checked={isAvailable}
                onCheckedChange={(checked) => toggleAvailabilityMutation.mutate(checked)}
                className={isAvailable ? 'bg-green-500' : ''}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {/* Order Filters */}
        <div className="sticky top-[73px] z-30 bg-white shadow-sm">
          <OrderFilters currentFilter={orderFilter} setFilter={setOrderFilter} userRole="livreur" />
        </div>

        <div className="px-4 py-6">
        {/* Available Orders */}
        {isAvailable && orderFilter === 'searching_driver' && availableOrders.length > 0 && (
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
                          {formatHaitiDate(order.created_date, "HH:mm")}
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

        {isAvailable && (orderFilter === 'all' || orderFilter === 'searching_driver') && availableOrders.length === 0 && activeOrders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-slate-600">En attente de commandes...</p>
            <p className="text-sm text-slate-400 mt-1">Les nouvelles commandes apparaîtront ici</p>
          </div>
        )}

        {!isAvailable && (
          <div className="text-center py-12 bg-white rounded-xl mb-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-600">Vous êtes hors ligne</p>
            <p className="text-sm text-slate-400 mt-1">Activez votre disponibilité pour recevoir des commandes</p>
          </div>
        )}

        {/* My Self Orders (Mes Achats) */}
        {orderFilter === 'self_orders' && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-500" />
              Mes Achats
            </h3>
            <div className="space-y-3">
            {selfOrders.map(order => (
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
                    <p className="text-sm text-slate-500 mt-1">{order.shop_name}</p>
                  </div>
                  <span className="font-bold text-orange-500">{order.total} HTG</span>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <p className="text-sm text-slate-600">
                    {formatHaitiDate(order.created_date, "d MMM yyyy 'à' HH:mm")}
                  </p>
                </div>
              </div>
            ))}
            {selfOrders.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                Aucun achat personnel
              </div>
            )}
            </div>
          </div>
        )}

        {/* My Orders */}
        {(orderFilter === 'all' || orderFilter === 'in_delivery') && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-500" />
              En livraison
            </h3>
            <div className="space-y-3">
            {activeOrders.filter(o => orderFilter === 'all' || o.status === orderFilter).map(order => (
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
                    <p className="text-sm text-slate-500 mt-1">{order.shop_name}</p>
                  </div>
                  <span className="font-bold text-orange-500">{order.total} HTG</span>
                </div>

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
              </div>
            ))}
            {activeOrders.filter(o => orderFilter === 'all' || o.status === orderFilter).length === 0 && (
              <div className="text-center py-8 text-slate-500">
                Aucune livraison en cours
              </div>
            )}
            </div>
          </div>
        )}

        {(orderFilter === 'all' || orderFilter === 'delivered') && (
          <div className="mb-6">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Package className="w-5 h-5 text-green-500" />
              Historique
            </h3>
            <div className="space-y-3">
            {historyOrders.slice(0, 20).filter(o => orderFilter === 'all' || o.status === orderFilter).map(order => (
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
                      {formatHaitiDate(order.created_date, "d MMM yyyy")}
                    </p>
                  </div>
                  <span className="font-bold text-slate-600">{order.total} HTG</span>
                </div>
              </div>
            ))}
            {historyOrders.filter(o => orderFilter === 'all' || o.status === orderFilter).length === 0 && (
              <div className="text-center py-8 text-slate-500">
                Aucune livraison dans l'historique
              </div>
            )}
            </div>
          </div>
        )}
        </div>
      </main>

      <OrderDetailModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        userType="livreur"
        onUpdateStatus={(id, status) => updateOrderMutation.mutate({ id, status })}
        onConfirmDelivery={(id) => confirmDeliveryMutation.mutate(id)}
      />

      <BackgroundSyncIndicator
        syncStatus={syncStatus}
        lastSync={lastSync}
        connectionType={connectionType}
      />

      {/* Business Smart Navigation */}
      <BusinessSmartNav
        activeTab={navTab}
        setActiveTab={setNavTab}
        userRole="livreur"
      />
    </div>
  );
}