import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Package, Clock, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatHaitiDate } from '@/components/utils/dateFormat';
import { motion } from 'framer-motion';
import OrderStatusBadge from '@/components/ui/OrderStatusBadge';
import OrderDetailModal from '@/components/modals/OrderDetailModal';
import OrderProgressBar from '@/components/orders/OrderProgressBar';
import ReviewModal from '@/components/modals/ReviewModal';
import DeliveryMap from '@/components/orders/DeliveryMap';
import DeliveryTracking from '@/components/maps/DeliveryTracking';
import { useAutoRefresh } from '@/components/realtime/useWebSocket';
import { useBackgroundSync, BackgroundSyncIndicator } from '@/components/realtime/BackgroundSync';
import { toast } from "sonner";
import ReactPixel from 'react-facebook-pixel';

export default function Orders() {
  const [user, setUser] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const queryClient = useQueryClient();
  
  // Auto-refresh toutes les 60 secondes
  useAutoRefresh({ 
    queryKey: ['my-orders'], 
    refetchInterval: 60000,
    enabled: !!user?.id 
  });
  
  // Background sync intelligent
  const { syncStatus, lastSync, connectionType } = useBackgroundSync({
    userType: 'client',
    enabled: !!user && user.current_profile === 'client'
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      // Redirect if wrong profile
      if (u.current_profile !== 'client') {
        const redirectPages = {
          entreprise: 'EnterpriseDashboard',
          livreur: 'DriverDashboard'
        };
        window.location.href = createPageUrl(redirectPages[u.current_profile] || 'Home');
      }
    }).catch(() => {});
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders', user?.id],
    queryFn: () => base44.entities.Order.filter({ client_id: user?.id }, '-created_date'),
    enabled: !!user?.id,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  // Track purchases for delivered orders
  useEffect(() => {
    if (orders.length > 0) {
      const deliveredOrders = orders.filter(o => o.status === 'delivered');
      deliveredOrders.forEach(order => {
        // Check if we haven't tracked this order yet (using localStorage)
        const trackingKey = `pixel_tracked_${order.id}`;
        if (!localStorage.getItem(trackingKey)) {
          ReactPixel.track('Purchase', {
            value: order.total,
            currency: 'HTG',
            content_ids: order.items?.map(item => item.product_id) || [],
            content_type: 'product',
            num_items: order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
          });
          // Mark as tracked
          localStorage.setItem(trackingKey, 'true');
        }
      });
    }
  }, [orders]);

  // Fetch reviews to check if order was already reviewed
  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', user?.id],
    queryFn: () => base44.entities.Review.filter({ client_id: user?.id }),
    enabled: !!user?.id
  });

  const hasReview = (orderId) => {
    return reviews.some(r => r.order_id === orderId);
  };

  const handleSubmitReview = async (orderId, reviewData) => {
    try {
      await base44.functions.invoke('submitReview', {
        orderId,
        ...reviewData
      });
      queryClient.invalidateQueries(['reviews']);
      queryClient.invalidateQueries(['orders']);
    } catch (error) {
      throw error;
    }
  };

  const activeOrders = orders.filter(o => 
    !['delivered', 'cancelled'].includes(o.status)
  );
  const historyOrders = orders.filter(o => 
    ['delivered', 'cancelled'].includes(o.status)
  );

  const OrderCard = ({ order }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setSelectedOrder(order)}
      className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow border border-slate-100"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">#{order.order_number}</span>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {formatHaitiDate(order.created_date)}
          </p>
        </div>
        <span className="font-bold text-orange-500">{order.total} HTG</span>
      </div>

      {/* Progress Bar */}
      <OrderProgressBar status={order.status} />

      {/* Carte en temps réel pour les commandes en livraison */}
      {['driver_assigned', 'in_delivery'].includes(order.status) && order.driver_location && (
        <div className="mt-4 h-48 rounded-xl overflow-hidden border border-slate-200">
          <DeliveryMap order={order} />
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t">
        <p className="text-sm font-medium text-slate-700">{order.shop_name}</p>
        <p className="text-xs text-slate-500">
          {order.items?.length} article{order.items?.length > 1 ? 's' : ''}
        </p>
      </div>

      {order.driver_name && (
        <div className="mt-3 text-xs text-slate-500 flex items-center justify-between">
          <span>Livreur: {order.driver_name}</span>
          {order.driver_phone && (
            <a href={`tel:${order.driver_phone}`} onClick={(e) => e.stopPropagation()} className="text-orange-500 font-medium">
              Appeler
            </a>
          )}
        </div>
      )}

      {/* Review Button for Delivered Orders */}
      {order.status === 'delivered' && !hasReview(order.id) && (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            setReviewOrder(order);
          }}
          className="mt-3 w-full border-orange-200 text-orange-600 hover:bg-orange-50"
        >
          <Star className="w-4 h-4 mr-2" />
          Laisser un avis
        </Button>
      )}
    </motion.div>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white sticky top-0 z-40 border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">Mes Commandes</h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="w-full bg-white">
            <TabsTrigger value="active" className="flex-1 gap-2">
              <Clock className="w-4 h-4" />
              Actives ({activeOrders.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex-1 gap-2">
              <Package className="w-4 h-4" />
              Historique ({historyOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 mb-4">Aucune commande active</p>
                <Link to={createPageUrl('Home')}>
                  <Button className="bg-orange-500 hover:bg-orange-600">
                    Commander maintenant
                  </Button>
                </Link>
              </div>
            ) : (
              activeOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-3">
            {historyOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                Aucune commande dans l'historique
              </div>
            ) : (
              historyOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>

      {selectedOrder && ['driver_assigned', 'in_delivery'].includes(selectedOrder.status) ? (
        <div className={`fixed inset-0 z-50 ${selectedOrder ? 'block' : 'hidden'}`}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedOrder(null)} />
          <div className="absolute inset-0">
            <DeliveryTracking order={selectedOrder} />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 bg-white shadow-lg rounded-full z-50"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>
      ) : (
        <OrderDetailModal
          order={selectedOrder}
          open={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          userType="client"
        />
      )}

      <ReviewModal
        order={reviewOrder}
        open={!!reviewOrder}
        onClose={() => setReviewOrder(null)}
        onSubmit={(reviewData) => handleSubmitReview(reviewOrder?.id, reviewData)}
      />

      <BackgroundSyncIndicator 
        syncStatus={syncStatus} 
        lastSync={lastSync} 
        connectionType={connectionType}
      />
    </div>
  );
}