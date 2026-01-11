import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
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

  // Gestion de l'ouverture et fermeture
  useEffect(() => {
    if (open) {
      if (product) {
        // MODIFICATION : Pas de guidelines, on affiche direct le formulaire
        setShowForm(true);
        setShowGuidelines(false);
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
        // CRÉATION : On montre d'abord les guidelines
        setShowGuidelines(true);
        setShowForm(false);
      }
    } else {
      // RESET COMPLET À LA FERMETURE
      setShowForm(false);
      setShowGuidelines(false);
    }
  }, [open, product]);

  // Fonction pour tout fermer proprement (Bouton Annuler et Sortir)
  const handleCloseAll = () => {
    setShowForm(false);
    setShowGuidelines(false);
    onClose(); // Appelle la fonction de fermeture passée par le parent
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.image_url || !formData.price) {
      toast.error('Veuillez remplir les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      if (product && product.id) {
        await base44.entities.Product.update(product.id, formData);
        toast.success('Article mis à jour');
      } else {
        await base44.entities.Product.create({ ...formData, shop_id: shopId });
        toast.success('Article créé');
      }
      onSuccess?.();
      handleCloseAll();
    } catch (error) {
      toast.error('Erreur : ' + error.message);
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
      {/* Modal des consignes */}
      <ProductGuidelinesModal
        open={showGuidelines}
        onConfirm={() => {
          setShowGuidelines(false);
          setShowForm(true);
        }}
        onCancel={handleCloseAll} // Correction : Utilise handleCloseAll
      />
      
      {/* Modal du Formulaire */}
      <Dialog open={showForm} onOpenChange={handleCloseAll}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {product ? `Modifier l'article` : 'Ajouter un article'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom de l'article <span className="text-red-500">*</span></Label>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label>Photo principale <span className="text-red-500">*</span></Label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, false)} 
                  className="w-full border rounded-md p-1.5 text-sm" 
                />
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
                <Label>Catégorie</Label>
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
                <div className="space-y-2">
                  <Label className="text-orange-600 font-bold">Sous-catégorie Mariage</Label>
                  <Select value={formData.subcategory} onValueChange={(v) => setFormData({ ...formData, subcategory: v })}>
                    <SelectTrigger className="border-orange-300">
                      <SelectValue placeholder="Choisir le type..." />
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
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCloseAll} // Correction : Ferme tout
                className="flex-1"
              >
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 bg-orange-600 hover:bg-orange-700">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {product ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}