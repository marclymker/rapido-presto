import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Check, X, Clock, Truck } from 'lucide-react';

export default function OrderActionModal({ order, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (newStatus) => {
    setLoading(true);
    try {
      await base44.entities.Order.update(order.id, { status: newStatus });
      toast.success('Commande mise à jour');
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
        </div>
      </DialogContent>
    </Dialog>
  );
}