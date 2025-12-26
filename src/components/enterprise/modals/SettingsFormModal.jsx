import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';

export default function SettingsFormModal({ shop, type, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    region: shop?.region || '',
    bank_name: shop?.bank_name || '',
    account_number: shop?.account_number || '',
    account_holder_name: shop?.account_holder_name || ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await base44.entities.Shop.update(shop.id, formData);
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
            {type === 'location' ? 'Modifier l\'adresse' : 'Informations bancaires'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {type === 'location' ? (
            <div>
              <Label>Région/Commune *</Label>
              <Input
                required
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="Ex: Pétion-Ville"
              />
            </div>
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