import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, MapPin } from 'lucide-react';

const REGIONS = [
  'Port-au-Prince', 'Carrefour', 'Delmas', 'Pétion-Ville', 'Cité Soleil',
  'Tabarre', 'Clercine', 'Croix des Bouquets', 'Kenscoff', 'Gressier',
  'Cap-Haïtien', 'Limonade', 'Quartier-Morin', 'Les Gonaïves', 'Ennery', "L'Estère"
];

export default function VendorContactModal({ open, onConfirm, onCancel }) {
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone.trim() || !region) return;
    setLoading(true);
    await onConfirm({ phone: phone.trim(), region });
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-sm p-0 overflow-hidden bg-white rounded-xl border-0 shadow-2xl">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-5 text-white text-center">
          <div className="mx-auto bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3">
            <Phone className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-lg font-bold text-white">Avant de publier</DialogTitle>
          <p className="text-orange-100 text-xs mt-1">Complétez votre profil pour que les clients puissent vous contacter.</p>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <Label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Phone className="w-4 h-4 text-orange-500" /> Numéro de téléphone
            </Label>
            <Input
              type="tel"
              placeholder="Ex: 509-3700-0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-11"
            />
          </div>

          <div>
            <Label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <MapPin className="w-4 h-4 text-orange-500" /> Zone de livraison
            </Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Sélectionnez votre zone..." />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t flex gap-3">
          <Button variant="ghost" onClick={onCancel} className="flex-1 text-slate-500">
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!phone.trim() || !region || loading}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-semibold"
          >
            Continuer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}