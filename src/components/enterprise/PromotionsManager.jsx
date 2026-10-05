import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Tag, Calendar } from 'lucide-react';
import { toast } from "sonner";

export default function PromotionsManager({ shop, products, onUpdateShop }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [promoForm, setPromoForm] = useState({
    title: '',
    description: '',
    discount_percent: '',
    start_date: '',
    end_date: '',
    applies_to: 'all',
    target_products: []
  });

  const activePromotions = shop?.active_promotions || [];

  const handleSubmit = () => {
    if (!promoForm.title || !promoForm.discount_percent) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const newPromo = {
      id: Date.now().toString(),
      ...promoForm,
      discount_percent: parseFloat(promoForm.discount_percent)
    };

    onUpdateShop({
      active_promotions: [...activePromotions, newPromo]
    });

    setDialogOpen(false);
    resetForm();
    toast.success('Promotion créée');
  };

  const handleDelete = (promoId) => {
    onUpdateShop({
      active_promotions: activePromotions.filter(p => p.id !== promoId)
    });
    toast.success('Promotion supprimée');
  };

  const resetForm = () => {
    setPromoForm({
      title: '',
      description: '',
      discount_percent: '',
      start_date: '',
      end_date: '',
      applies_to: 'all',
      target_products: []
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Promotions actives</CardTitle>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle promotion
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activePromotions.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Tag className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p>Aucune promotion active</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activePromotions.map(promo => (
              <div key={promo.id} className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag className="w-4 h-4 text-orange-600" />
                      <h4 className="font-semibold text-slate-800">{promo.title}</h4>
                      <span className="px-2 py-0.5 bg-orange-600 text-white text-xs rounded-full font-semibold">
                        -{promo.discount_percent}%
                      </span>
                    </div>
                    {promo.description && (
                      <p className="text-sm text-slate-600">{promo.description}</p>
                    )}
                    {(promo.start_date || promo.end_date) && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                        <Calendar className="w-3 h-3" />
                        {promo.start_date && <span>Du {new Date(promo.start_date).toLocaleDateString('fr-HT')}</span>}
                        {promo.end_date && <span>au {new Date(promo.end_date).toLocaleDateString('fr-HT')}</span>}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(promo.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une promotion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label>Titre de la promotion *</Label>
              <Input
                value={promoForm.title}
                onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })}
                placeholder="Ex: Promotion du weekend"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={promoForm.description}
                onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
                placeholder="Détails de la promotion"
                rows={2}
              />
            </div>
            <div>
              <Label>Pourcentage de réduction * (%)</Label>
              <Input
                type="number"
                value={promoForm.discount_percent}
                onChange={(e) => setPromoForm({ ...promoForm, discount_percent: e.target.value })}
                placeholder="Ex: 20"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={promoForm.start_date}
                  onChange={(e) => setPromoForm({ ...promoForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Date de fin</Label>
                <Input
                  type="date"
                  value={promoForm.end_date}
                  onChange={(e) => setPromoForm({ ...promoForm, end_date: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>Appliquer à</Label>
              <Select
                value={promoForm.applies_to}
                onValueChange={(val) => setPromoForm({ ...promoForm, applies_to: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les produits</SelectItem>
                  <SelectItem value="category">Par catégorie</SelectItem>
                  <SelectItem value="specific">Produits spécifiques</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSubmit} className="w-full bg-orange-500 hover:bg-orange-600">
              Créer la promotion
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
