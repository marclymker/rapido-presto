import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Phone, User, CreditCard, Package, CheckCircle } from 'lucide-react';
import OrderStatusBadge from "@/components/ui/OrderStatusBadge";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function OrderDetailModal({ 
  order, 
  open, 
  onClose, 
  userType,
  onUpdateStatus,
  onConfirmDelivery 
}) {
  const [confirmCode, setConfirmCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [attempts, setAttempts] = useState(0);
  
  if (!order) return null;

  const handleConfirmDelivery = () => {
    if (confirmCode === order.confirmation_code) {
      onConfirmDelivery(order.id);
      setConfirmCode('');
      setCodeError('');
      setAttempts(0);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      
      if (newAttempts >= 3) {
        setCodeError('Trop de tentatives. Contactez le client.');
      } else {
        setCodeError(`Code incorrect. ${3 - newAttempts} tentative(s) restante(s).`);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Commande #{order.order_number}</DialogTitle>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-slate-500">
            {format(new Date(order.created_date), "d MMMM yyyy 'à' HH:mm", { locale: fr })}
          </p>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Client Info */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-700">
              <User className="w-4 h-4" />
              <span className="font-medium">{order.client_name}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <Phone className="w-4 h-4" />
              <span>{order.client_phone}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 text-sm">
              <MapPin className="w-4 h-4" />
              <span>{order.client_address}, {order.client_commune}</span>
            </div>
          </div>
          
          {/* Items */}
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Package className="w-4 h-4" />
              Articles
            </h4>
            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="font-medium">{item.total} HTG</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Totals */}
          <div className="border-t pt-3 space-y-1">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Sous-total</span>
              <span>{order.subtotal} HTG</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>Frais de livraison</span>
              <span>{order.delivery_fee} HTG</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2">
              <span>Total</span>
              <span className="text-orange-500">{order.total} HTG</span>
            </div>
          </div>
          
          {/* Payment */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <CreditCard className="w-4 h-4" />
            <span>Paiement: {order.payment_method}</span>
          </div>
          
          {/* Driver Info (if assigned) */}
          {order.driver_name && (
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-medium text-blue-800 mb-2">Livreur</h4>
              <p className="text-sm text-blue-700">{order.driver_name}</p>
              <p className="text-sm text-blue-600">{order.driver_phone}</p>
            </div>
          )}

          {/* Confirmation Code (for client when delivered) */}
          {userType === 'client' && order.status !== 'delivered' && order.status !== 'cancelled' && order.confirmation_code && (
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-sm text-green-700 mb-2">Code de confirmation</p>
              <p className="text-3xl font-bold text-green-800 tracking-widest">{order.confirmation_code}</p>
              <p className="text-xs text-green-600 mt-2">Donnez ce code au livreur</p>
            </div>
          )}
          
          {/* Livreur Actions */}
          {userType === 'livreur' && order.status === 'in_delivery' && (
            <div className="bg-orange-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-orange-800">Entrez le code de confirmation</p>
              <Input
                value={confirmCode}
                onChange={(e) => {
                  setConfirmCode(e.target.value);
                  setCodeError('');
                }}
                placeholder="Code à 4 chiffres"
                className="text-center text-lg tracking-widest"
                maxLength={4}
              />
              {codeError && <p className="text-red-500 text-sm">{codeError}</p>}
              <Button 
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleConfirmDelivery}
                disabled={attempts >= 3}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {attempts >= 3 ? 'Tentatives épuisées' : 'Confirmer la livraison'}
              </Button>
            </div>
          )}
          
          {/* Entreprise Actions */}
          {userType === 'entreprise' && order.status === 'pending' && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => onUpdateStatus(order.id, 'cancelled')}
              >
                Refuser
              </Button>
              <Button 
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={() => onUpdateStatus(order.id, 'preparing')}
              >
                Accepter
              </Button>
            </div>
          )}
          
          {userType === 'entreprise' && order.status === 'preparing' && (
            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => onUpdateStatus(order.id, 'ready')}
            >
              Préparation terminée
            </Button>
          )}
          
          {/* Livreur Status Actions */}
          {userType === 'livreur' && order.status === 'driver_assigned' && (
            <div className="space-y-2">
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700"
                onClick={() => onUpdateStatus(order.id, 'in_delivery')}
              >
                Démarrer la livraison
              </Button>
              <Button 
                variant="outline"
                className="w-full border-red-200 text-red-600 hover:bg-red-50"
                onClick={() => onUpdateStatus(order.id, 'searching_driver')}
              >
                Refuser la livraison
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}