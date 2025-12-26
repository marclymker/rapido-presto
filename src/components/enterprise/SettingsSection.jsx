import React, { useState } from 'react';
import { Switch } from "@/components/ui/switch";
import { Bell, Clock, MapPin, CreditCard } from 'lucide-react';
import { Button } from "@/components/ui/button";
import SettingsFormModal from './modals/SettingsFormModal';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

export default function SettingsSection({ shop }) {
  const [modalType, setModalType] = useState(null);
  const queryClient = useQueryClient();

  const handleToggleActive = async (checked) => {
    try {
      await base44.entities.Shop.update(shop.id, { is_active: checked });
      queryClient.invalidateQueries(['my-shop']);
      toast.success(checked ? 'Boutique en ligne' : 'Boutique hors ligne');
    } catch (error) {
      toast.error('Erreur');
    }
  };
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h2 className="text-2xl font-black mb-6 text-gray-900">Réglages</h2>
      
      <div className="space-y-4">
        {/* Disponibilité */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Bell className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">Boutique en ligne</p>
                <p className="text-sm text-gray-500">Accepter les nouvelles commandes</p>
              </div>
            </div>
            <Switch 
              checked={shop?.is_active !== false} 
              onCheckedChange={handleToggleActive}
            />
          </div>
        </div>

        {/* Horaires */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Horaires d'ouverture</p>
              <p className="text-sm text-gray-500">Définir vos heures de service</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setModalType('hours')}
            className="w-full rounded-xl"
          >
            Gérer les horaires
          </Button>
        </div>

        {/* Localisation */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Adresse de livraison</p>
              <p className="text-sm text-gray-500">{shop?.region || 'Non définie'}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setModalType('location')}
            className="w-full rounded-xl"
          >
            Modifier l'adresse
          </Button>
        </div>

        {/* Paiement */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Informations bancaires</p>
              <p className="text-sm text-gray-500">
                {shop?.bank_name ? `${shop.bank_name} - ${shop.account_number}` : 'Non configuré'}
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setModalType('payment')}
            className="w-full rounded-xl"
          >
            Configurer le paiement
          </Button>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-gray-900">Notifications</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">Nouvelles commandes</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">Messages clients</span>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">Promotions</span>
              <Switch />
            </div>
          </div>
        </div>
      </div>

      <SettingsFormModal
        shop={shop}
        type={modalType}
        open={!!modalType}
        onClose={() => setModalType(null)}
        onSuccess={() => queryClient.invalidateQueries(['my-shop'])}
      />
    </div>
  );
}