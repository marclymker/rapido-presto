import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { firebaseApi } from '@/api/firebaseClient';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';

const REGIONS = [
  "Petion-ville", "Route de Freres", "Delmas", "Pelerin", "Thomassain", "Kenscoff",
  "Lalue", "Nazon", "Pernier", "Sarthe", "Tabarre", "Clercine", "Marrin",
  "Bon Repos", "Turgeau", "Canapevert", "Lavil", "Madeline", "Vaudreuil",
  "Morne Rouge", "Cap Haitien", "St Marc", "Gonaives", "Les Cayes", "Limonade"
];

export default function SettingsFormModal({ shop, type, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    region: shop?.region || '',
    phone: shop?.phone || '',
    email: shop?.email || '',
    bank_name: shop?.bank_name || '',
    account_number: shop?.account_number || '',
    account_holder_name: shop?.account_holder_name || ''
  });

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayLabels = {
    monday: 'Lundi',
    tuesday: 'Mardi',
    wednesday: 'Mercredi',
    thursday: 'Jeudi',
    friday: 'Vendredi',
    saturday: 'Samedi',
    sunday: 'Dimanche'
  };
  const [hours, setHours] = useState(shop?.opening_hours || {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (type === 'hours') {
        await firebaseApi.entities.Shop.update(shop.id, { opening_hours: hours });
      } else {
        await firebaseApi.entities.Shop.update(shop.id, formData);
      }
      toast.success('Informations mises à jour');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === 'location' ? 'Modifier l\'adresse' : type === 'hours' ? 'Horaires d\'ouverture' : 'Informations bancaires'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'hours' ? (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {days.map(day => (
                <div key={day} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <Label className="font-semibold">{dayLabels[day]}</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Fermé</span>
                      <input
                        type="checkbox"
                        checked={!hours[day]?.closed}
                        onChange={(e) => setHours({
                          ...hours,
                          [day]: { ...hours[day], closed: !e.target.checked }
                        })}
                        className="w-4 h-4"
                      />
                    </div>
                  </div>
                  {!hours[day]?.closed && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Ouverture</Label>
                        <Input
                          type="time"
                          value={hours[day]?.open || '09:00'}
                          onChange={(e) => setHours({
                            ...hours,
                            [day]: { ...hours[day], open: e.target.value }
                          })}
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Fermeture</Label>
                        <Input
                          type="time"
                          value={hours[day]?.close || '18:00'}
                          onChange={(e) => setHours({
                            ...hours,
                            [day]: { ...hours[day], close: e.target.value }
                          })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : type === 'location' ? (
            <>
              <div>
                <Label>Région/Commune *</Label>
                <Select
                  required
                  value={formData.region}
                  onValueChange={(val) => setFormData({ ...formData, region: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une région" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map(region => (
                      <SelectItem key={region} value={region}>{region}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Téléphone WhatsApp *</Label>
                <Input
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="509XXXXXXXX (format: 50912345678)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: 509XXXXXXXX (sans espaces ni tirets)
                </p>
              </div>
              <div>
                <Label>Email (optionnel)</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="votre@email.com"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Nom de la banque *</Label>
                <Input
                  required
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="Ex: Sogebank"
                />
              </div>
              <div>
                <Label>Numéro de compte *</Label>
                <Input
                  required
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="Ex: 123456789"
                />
              </div>
              <div>
                <Label>Nom du titulaire *</Label>
                <Input
                  required
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                  placeholder="Nom complet"
                />
              </div>
            </>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-blue-600">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
