import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Loader2, X } from 'lucide-react';
import ProductGuidelinesModal from './ProductGuidelinesModal';

export default function ProductFormModal({ product, shopId, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    price: '',
    promo_price: '',
    description: '',
    category: 'Fastfood',
    subcategory: '',
    stock_quantity: 0,
    image_url: '',
    additional_images: [],
    taille_emballage: 'Moyen',
    delivery_time: '30-45 minutes',
    seo_tags: [],
    is_available: true,
    product_attributes: {
      color: '', size: '', material: '', gender: '', age_group: '', pattern: '',
      custom_labels: { label_0: '', label_1: '', label_2: '', label_3: '', label_4: '' }
    }
  });

  // Synchronisation des données au chargement
  useEffect(() => {
    if (open) {
      if (product) {
        // Mode MODIFICATION
        setShowGuidelines(false);
        setShowForm(true);
        setFormData({
          ...product,
          category: product.category || 'Fastfood',
          subcategory: product.subcategory || '',
          product_attributes: product.product_attributes || {
            color: '', size: '', material: '', gender: '', age_group: '', pattern: '',
            custom_labels: { label_0: '', label_1: '', label_2: '', label_3: '', label_4: '' }
          }
        });
      } else {
        // Mode CRÉATION
        setShowGuidelines(true);
        setShowForm(false);
        setFormData({
          name: '', price: '', promo_price: '', description: '',
          category: 'Fastfood', subcategory: '', stock_quantity: 0,
          image_url: '', additional_images: [], taille_emballage: 'Moyen',
          delivery_time: '30-45 minutes', seo_tags: [], is_available: true,
          product_attributes: {
            color: '', size: '', material: '', gender: '', age_group: '', pattern: '',
            custom_labels: { label_0: '', label_1: '', label_2: '', label_3: '', label_4: '' }
          }
        });
      }
    }
  }, [open, product]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.image_url || !formData.price) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      // LOGIQUE DE CORRECTION : Vérification stricte de l'ID pour la mise à jour
      if (product && product.id) {
        // On utilise l'ID du produit passé en props pour mettre à jour l'entité existante
        await base44.entities.Product.update(product.id, formData);
        toast.success('Article mis à jour avec succès');
      } else {
        // Si pas de produit/ID, on crée un nouvel article lié à la boutique
        await base44.entities.Product.create({ ...formData, shop_id: shopId });
        toast.success('Nouvel article créé');
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement : ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e, isAdditional = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (isAdditional) {
        setFormData(prev => ({ ...prev, additional_images: [...prev.additional_images, file_url] }));
      } else {
        setFormData(prev => ({ ...prev, image_url: file_url }));
      }
      toast.success('Image téléchargée');
    } catch (error) {
      toast.error('Erreur upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ProductGuidelinesModal
        open={showGuidelines}
        onConfirm={() => { setShowGuidelines(false); setShowForm(true); }}
        onCancel={onClose}
      />
      
      <Dialog open={showForm} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {product ? `Modifier : ${product.name}` : 'Ajouter un nouvel article'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom de l'article <span className="text-red-500">*</span></Label>
                <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Titre du produit" />
              </div>
              <div className="space-y-2">
                <Label>Photo principale <span className="text-red-500">*</span></Label>
                <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="w-full border rounded-md p-1.5 text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prix (HTG) *</Label>
                <Input type="number" value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || '' })} required />
              </div>
              <div className="space-y-2">
                <Label>Prix promo (HTG)</Label>
                <Input type="number" value={formData.promo_price} onChange={(e) => setFormData({ ...formData, promo_price: parseFloat(e.target.value) || '' })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border">
              <div className="space-y-2">
                <Label>Catégorie Principale</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v, subcategory: '' })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fastfood">Fastfood</SelectItem>
                    <SelectItem value="Restaurants">Restaurants</SelectItem>
                    <SelectItem value="Mariage">Mariage</SelectItem>
                    <SelectItem value="Boutique Fleurs">Boutique Fleurs</SelectItem>
                    <SelectItem value="Pharmacie">Pharmacie</SelectItem>
                    <SelectItem value="Epicerie">Épicerie</SelectItem>
                    <SelectItem value="Café">Café</SelectItem>
                    <SelectItem value="Pour Femme">Pour Femme</SelectItem>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Pour homme">Pour homme</SelectItem>
                    <SelectItem value="Maison">Maison</SelectItem>
                    <SelectItem value="Bébé">Bébé</SelectItem>
                    <SelectItem value="Outils">Outils</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.category === 'Mariage' && (
                <div className="space-y-2 animate-in fade-in duration-300">
                  <Label className="text-orange-600 font-semibold">Sous-catégorie Mariage</Label>
                  <Select value={formData.subcategory} onValueChange={(v) => setFormData({ ...formData, subcategory: v })}>
                    <SelectTrigger className="border-orange-200">
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Demoiselle d'honneur">Demoiselle d'honneur</SelectItem>
                      <SelectItem value="Annonceuse">Annonceuse</SelectItem>
                      <SelectItem value="Temoins">Temoins</SelectItem>
                      <SelectItem value="Robe de Mariee">Robe de Mariee</SelectItem>
                      <SelectItem value="Bague de Mariage">Bague de Mariage</SelectItem>
                      <SelectItem value="Accessoires">Accessoires</SelectItem>
                      <SelectItem value="Carte & Programmation">Carte & Programmation</SelectItem>
                      <SelectItem value="Materiels Decor">Materiels Decor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} placeholder="Détails du produit..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Taille d'emballage</Label>
                <Select value={formData.taille_emballage} onValueChange={(v) => setFormData({ ...formData, taille_emballage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Petit">Petit</SelectItem>
                    <SelectItem value="Moyen">Moyen</SelectItem>
                    <SelectItem value="Grand">Grand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stock disponible</Label>
                <Input type="number" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })} />
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">Annuler</Button>
              <Button type="submit" disabled={loading} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white shadow-lg">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {product ? 'Enregistrer les modifications' : 'Créer l\'article'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}