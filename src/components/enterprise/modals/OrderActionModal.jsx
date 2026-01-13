import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Check, X, Clock, Truck, Search, CheckCircle } from 'lucide-react';

export default function OrderActionModal({ order, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    try {
      await base44.entities.Order.update(order.id, { status: newStatus });
      
      // Send email notification to client
      try {
        const { data: shops } = await base44.entities.Shop.filter({ id: order.shop_id });
        const shop = shops?.[0];
        await base44.functions.invoke('sendOrderEmail', {
          type: 'status_update',
          orderData: {
            order_number: order.order_number,
            status: newStatus,
            total: order.total
          },
          shopData: {
            company_name: shop?.company_name || order.shop_name
          },
          clientData: {
            name: order.client_name,
            email: order.client_email,
            phone: order.client_phone
          }
        });
      } catch (emailError) {
        console.log('Email notification failed:', emailError);
      }
      
      toast.success('Commande mise à jour');
      onSuccess?.();
      if (newStatus !== 'ready') {
        onClose();
      }
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeliveryChoice = async (deliveryType) => {
    setLoading(true);
    try {
      const newStatus = deliveryType === 'merchant_delivery' ? 'in_delivery' : 'searching_driver';
      
      await base44.entities.Order.update(order.id, { 
        delivery_type: deliveryType,
        status: newStatus
      });

      // Send email notification to client
      try {
        const { data: shops } = await base44.entities.Shop.filter({ id: order.shop_id });
        const shop = shops?.[0];
        await base44.functions.invoke('sendOrderEmail', {
          type: 'status_update',
          orderData: {
            order_number: order.order_number,
            status: newStatus,
            total: order.total
          },
          shopData: {
            company_name: shop?.company_name || order.shop_name
          },
          clientData: {
            name: order.client_name,
            email: order.client_email,
            phone: order.client_phone
          }
        });
      } catch (emailError) {
        console.log('Email notification failed:', emailError);
      }
      
      toast.success(deliveryType === 'merchant_delivery' ? 'Vous êtes en charge de la livraison' : 'Recherche d\'un livreur en cours...');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDelivery = async () => {
    if (!confirmationCode) {
      toast.error('Entrez le code de confirmation');
      return;
    }
    
    if (confirmationCode !== order.confirmation_code) {
      toast.error('Code incorrect');
      return;
    }

    setLoading(true);
    try {
      await base44.entities.Order.update(order.id, { 
        status: 'delivered'
      });

      // Send email notification to client
      try {
        const { data: shops } = await base44.entities.Shop.filter({ id: order.shop_id });
        const shop = shops?.[0];
        await base44.functions.invoke('sendOrderEmail', {
          type: 'status_update',
          orderData: {
            order_number: order.order_number,
            status: 'delivered',
            total: order.total
          },
          shopData: {
            company_name: shop?.company_name || order.shop_name
          },
          clientData: {
            name: order.client_name,
            email: order.client_email,
            phone: order.client_phone
          }
        });
      } catch (emailError) {
        console.log('Email notification failed:', emailError);
      }
      
      toast.success('✅ Livraison terminée !');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const actions = [
    { 
      status: 'accepted', 
      label: 'Accepter', 
      icon: Check, 
      color: 'bg-green-600 hover:bg-green-700',
      show: order?.status === 'pending'
    },
    { 
      status: 'preparing', 
      label: 'En préparation', 
      icon: Clock, 
      color: 'bg-orange-600 hover:bg-orange-700',
      show: order?.status === 'accepted'
    },
    { 
      status: 'ready', 
      label: 'Prêt pour livraison', 
      icon: Truck, 
      color: 'bg-blue-600 hover:bg-blue-700',
      show: order?.status === 'preparing'
    },
    { 
      status: 'cancelled', 
      label: 'Refuser', 
      icon: X, 
      color: 'bg-red-600 hover:bg-red-700',
      show: order?.status === 'pending'
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Commande #{order?.order_number || order?.id?.slice(0, 8)}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Client</p>
            <p className="font-bold">{order?.client_name}</p>
            <p className="text-sm text-gray-600 mt-2">Total</p>
            <p className="text-2xl font-black text-blue-600">{order?.total} HTG</p>
          </div>

          {/* Confirmation de livraison si merchant_delivery et in_delivery */}
          {order?.status === 'in_delivery' && order?.delivery_type === 'merchant_delivery' && (
            <div className="space-y-3">
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                <p className="font-bold text-green-700 mb-2">📦 Livraison en cours</p>
                <p className="text-xs text-green-600">
                  Confirmez le code reçu du client pour terminer
                </p>
              </div>

              <div>
                <Label>Code de confirmation du client</Label>
                <Input
                  type="text"
                  maxLength={4}
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="4 chiffres"
                  className="text-center text-2xl font-bold tracking-widest"
                />
                <p className="text-xs text-gray-500 mt-1 text-center">
                  Demandez le code au client
                </p>
              </div>

              <Button
                onClick={handleCompleteDelivery}
                disabled={loading || !confirmationCode}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-6"
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Terminer la livraison
              </Button>
            </div>
          )}

          {/* Choix de livraison si status = ready */}
          {order?.status === 'ready' && (
            <div className="space-y-3">
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                <p className="font-bold text-orange-700 mb-2">🚚 Qui assure la livraison ?</p>
                <p className="text-xs text-orange-600">
                  Choisissez comment la commande sera livrée au client
                </p>
              </div>
              
              <Button
                onClick={() => handleDeliveryChoice('merchant_delivery')}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6"
              >
                <Truck className="w-5 h-5 mr-2" />
                <div className="text-left">
                  <div className="font-bold">J'assure la livraison</div>
                  <div className="text-xs opacity-90">Vous gardez les frais de livraison</div>
                </div>
              </Button>

              <Button
                onClick={() => handleDeliveryChoice('platform_delivery')}
                disabled={loading}
                className="w-full bg-gray-700 hover:bg-gray-800 text-white py-6"
                variant="outline"
              >
                <Search className="w-5 h-5 mr-2" />
                <div className="text-left">
                  <div className="font-bold">Chercher un livreur Rapido</div>
                  <div className="text-xs opacity-90">Un livreur prendra en charge</div>
                </div>
              </Button>
            </div>
          )}

          {/* Actions normales si pas ready */}
          {order?.status !== 'ready' && (
            <div className="space-y-2">
              {actions.filter(a => a.show).map(action => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.status}
                    onClick={() => handleStatusChange(action.status)}
                    disabled={loading}
                    className={`w-full ${action.color} text-white`}
                  >
                    <Icon className="w-5 h-5 mr-2" />
                    {action.label}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}