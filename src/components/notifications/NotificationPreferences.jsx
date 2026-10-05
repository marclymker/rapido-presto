import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { firebaseApi } from '@/api/firebaseClient';
import { toast } from 'sonner';
import { Bell, BellOff, Package, ShoppingBag, Store, Truck, Tag, Loader2 } from 'lucide-react';

export default function NotificationPreferences({ user }) {
  const [preferences, setPreferences] = useState({
    order_updates: user?.notification_preferences?.order_updates ?? true,
    delivery_status: user?.notification_preferences?.delivery_status ?? true,
    promotions: user?.notification_preferences?.promotions ?? true,
    new_products: user?.notification_preferences?.new_products ?? false,
    followed_shops: user?.notification_preferences?.followed_shops ?? false,
    cart_reminders: user?.notification_preferences?.cart_reminders ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [allEnabled, setAllEnabled] = useState(
    Object.values(preferences).every(v => v === true)
  );

  const notificationTypes = [
    {
      id: 'order_updates',
      icon: Package,
      label: 'Mises à jour de commande',
      description: 'Notifications quand votre commande change de statut',
      color: 'text-blue-500'
    },
    {
      id: 'delivery_status',
      icon: Truck,
      label: 'Statut de livraison',
      description: 'Suivi en temps réel de vos livraisons',
      color: 'text-green-500'
    },
    {
      id: 'promotions',
      icon: Tag,
      label: 'Promotions et offres',
      description: 'Alertes sur les réductions et offres spéciales',
      color: 'text-orange-500'
    },
    {
      id: 'new_products',
      icon: ShoppingBag,
      label: 'Nouveaux produits',
      description: 'Découvrez les derniers articles ajoutés',
      color: 'text-purple-500'
    },
    {
      id: 'followed_shops',
      icon: Store,
      label: 'Boutiques favorites',
      description: 'Nouvelles offres de vos boutiques préférées',
      color: 'text-pink-500'
    },
    {
      id: 'cart_reminders',
      icon: BellOff,
      label: 'Rappels panier',
      description: 'Notifications pour les articles dans votre panier',
      color: 'text-slate-500'
    }
  ];

  const handleToggle = (id) => {
    setPreferences(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleToggleAll = () => {
    const newState = !allEnabled;
    const newPreferences = {};
    Object.keys(preferences).forEach(key => {
      newPreferences[key] = newState;
    });
    setPreferences(newPreferences);
    setAllEnabled(newState);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await firebaseApi.auth.updateMe({
        notification_preferences: preferences
      });
      toast.success('Préférences enregistrées');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Préférences de notification
        </CardTitle>
        <CardDescription>
          Personnalisez les notifications que vous souhaitez recevoir
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle All */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-3">
            {allEnabled ? (
              <Bell className="w-5 h-5 text-blue-600" />
            ) : (
              <BellOff className="w-5 h-5 text-slate-400" />
            )}
            <div>
              <Label className="font-semibold">Toutes les notifications</Label>
              <p className="text-xs text-slate-500 mt-0.5">
                {allEnabled ? 'Activer' : 'Désactiver'} toutes les notifications
              </p>
            </div>
          </div>
          <Switch
            checked={allEnabled}
            onCheckedChange={handleToggleAll}
          />
        </div>

        {/* Individual Preferences */}
        <div className="space-y-3">
          {notificationTypes.map((type) => {
            const Icon = type.icon;
            return (
              <div
                key={type.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Icon className={`w-5 h-5 ${type.color}`} />
                  <div className="flex-1">
                    <Label className="font-medium cursor-pointer">
                      {type.label}
                    </Label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {type.description}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={preferences[type.id]}
                  onCheckedChange={() => handleToggle(type.id)}
                />
              </div>
            );
          })}
        </div>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-orange-500 hover:bg-orange-600"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Enregistrement...
            </>
          ) : (
            'Enregistrer les préférences'
          )}
        </Button>

        {/* Info */}
        <p className="text-xs text-slate-500 text-center">
          Vous pouvez modifier ces paramètres à tout moment. Les notifications importantes (sécurité, compte) seront toujours envoyées.
        </p>
      </CardContent>
    </Card>
  );
}
