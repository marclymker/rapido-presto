import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import OrderActionModal from './modals/OrderActionModal';
import { useQueryClient } from '@tanstack/react-query';

export default function OrdersSection({ orders = [] }) {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const queryClient = useQueryClient();
  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
      accepted: { label: 'Acceptée', color: 'bg-blue-100 text-blue-700' },
      preparing: { label: 'En préparation', color: 'bg-orange-100 text-orange-700' },
      ready: { label: 'Prêt', color: 'bg-green-100 text-green-700' },
      in_delivery: { label: 'En livraison', color: 'bg-indigo-100 text-indigo-700' },
      delivered: { label: 'Livré', color: 'bg-green-100 text-green-700' },
      cancelled: { label: 'Annulé', color: 'bg-red-100 text-red-700' }
    };
    return statusConfig[status] || statusConfig.pending;
  };

  return (
    <div className="p-8">
      <h2 className="text-lg font-bold mb-6 text-gray-900">Commandes en cours</h2>
      
      {orders.length === 0 ? (
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-2xl p-12 text-center border-2 border-orange-200">
          <div className="text-6xl mb-4">📈</div>
          <h3 className="text-2xl font-bold text-gray-800 mb-3">Augmentez vos revenus</h3>
          <p className="text-gray-600 mb-6">Ajoutez des articles pour recevoir vos premières commandes</p>
          <button 
            onClick={() => {
              const addButton = document.querySelector('[data-add-product-btn]');
              if (addButton) addButton.click();
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full transition-all transform hover:scale-105 shadow-lg"
          >
            Ajouter des Articles +
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(order => {
            const statusInfo = getStatusBadge(order.status);
            return (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className="bg-white p-4 rounded-xl border flex justify-between items-center shadow-[0_4px_12px_rgba(251,146,60,0.3)] hover:shadow-[0_6px_16px_rgba(251,146,60,0.4)] transition-all cursor-pointer"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <p className="font-bold text-gray-900">Commande #{order.order_number || order.id.slice(0, 8)}</p>
                    <Badge className={`${statusInfo.color} text-[10px] font-bold uppercase px-2 py-0.5`}>
                      {statusInfo.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{order.client_name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {order.items?.length || 0} article{(order.items?.length || 0) > 1 ? 's' : ''} • {order.total} HTG
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">{new Date(order.created_date).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <OrderActionModal
        order={selectedOrder}
        open={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
        onSuccess={() => queryClient.invalidateQueries(['shop-orders'])}
      />
    </div>
  );
}