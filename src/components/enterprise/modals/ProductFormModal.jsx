import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';

export default function ProductFormModal({ product, shopId, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: product?.name || '',
    price: product?.price || '',
    promo_price: product?.promo_price || '',
    description: product?.description || '',
    category: product?.category || 'Fastfood',
    stock_quantity: product?.stock_quantity || 0,
    image_url: product?.image_url || '',
    taille_emballage: product?.taille_emballage || 'Moyen',
    delivery_time: product?.delivery_time || '30-45 minutes',
    is_available: product?.is_available !== false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (product) {
        await base44.entities.Product.update(product.id, formData);
        toast.success('Article mis à jour');
      } else {
        await base44.entities.Product.create({ ...formData, shop_id: shopId });
        toast.success('Article créé');
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: file_url });
      toast.success('Image téléchargée');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Modifier l\'article' : 'Nouvel article'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nom de l'article *</Label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Pizza Margherita"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prix (HTG) *</Label>
              <Input
                required
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
              />
            </div>
            <div>
              <Label>Prix promo (HTG)</Label>
              <Input
                type="number"
                value={formData.promo_price}
                onChange={(e) => setFormData({ ...formData, promo_price: parseFloat(e.target.value) || null })}
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div>
            <Label>Image de l'article</Label>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full" />
            {formData.image_url && (
              <img src={formData.image_url} alt="" className="mt-2 h-32 w-32 object-cover rounded-lg" />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Catégorie</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fastfood">Fastfood</SelectItem>
                  <SelectItem value="Restaurants">Restaurants</SelectItem>
                  <SelectItem value="Epicerie">Épicerie</SelectItem>
                  <SelectItem value="Pharmacie">Pharmacie</SelectItem>
                  <SelectItem value="Café">Café</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Stock</Label>
              <Input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-blue-600">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {product ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}