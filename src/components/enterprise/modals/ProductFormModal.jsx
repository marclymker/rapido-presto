import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Loader2, Sparkles, X } from 'lucide-react';
import ProductGuidelinesModal from './ProductGuidelinesModal';

export default function ProductFormModal({ product, shopId, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    promo_price: '',
    description: '',
    category: 'Fastfood',
    stock_quantity: 0,
    image_url: '',
    additional_images: [],
    taille_emballage: 'Moyen',
    delivery_time: '30-45 minutes',
    seo_tags: [],
    is_available: true,
    product_attributes: {
      color: '',
      size: '',
      material: '',
      gender: '',
      age_group: '',
      pattern: '',
      custom_labels: {
        label_0: '',
        label_1: '',
        label_2: '',
        label_3: '',
        label_4: ''
      }
    }
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (open && !product) {
      // Show guidelines only for new products
      setShowGuidelines(true);
      setShowForm(false);
      // Reset form for new product
      setFormData({
        name: '',
        price: '',
        promo_price: '',
        description: '',
        category: 'Fastfood',
        stock_quantity: 0,
        image_url: '',
        additional_images: [],
        taille_emballage: 'Moyen',
        delivery_time: '30-45 minutes',
        seo_tags: [],
        is_available: true,
        product_attributes: {
          color: '',
          size: '',
          material: '',
          gender: '',
          age_group: '',
          pattern: '',
          custom_labels: {
            label_0: '',
            label_1: '',
            label_2: '',
            label_3: '',
            label_4: ''
          }
        }
      });
    } else if (open && product) {
      // Skip guidelines for editing and load product data
      setShowGuidelines(false);
      setShowForm(true);
      setFormData({
        name: product.name || '',
        price: product.price || '',
        promo_price: product.promo_price || '',
        description: product.description || '',
        category: product.category || 'Fastfood',
        stock_quantity: product.stock_quantity || 0,
        image_url: product.image_url || '',
        additional_images: product.additional_images || [],
        taille_emballage: product.taille_emballage || 'Moyen',
        delivery_time: product.delivery_time || '30-45 minutes',
        seo_tags: product.seo_tags || [],
        is_available: product.is_available !== false,
        product_attributes: product.product_attributes || {
          color: '',
          size: '',
          material: '',
          gender: '',
          age_group: '',
          pattern: '',
          custom_labels: {
            label_0: '',
            label_1: '',
            label_2: '',
            label_3: '',
            label_4: ''
          }
        }
      });
    } else {
      setShowGuidelines(false);
      setShowForm(false);
    }
  }, [open, product]);

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

  const handleImageUpload = async (e, isAdditional = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (isAdditional) {
        setFormData({ ...formData, additional_images: [...formData.additional_images, file_url] });
        toast.success('Image ajoutée');
      } else {
        setFormData({ ...formData, image_url: file_url });
        toast.success('Image téléchargée');
      }
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!formData.name || !formData.image_url) {
      toast.error('Ajoutez un titre et une image d\'abord');
      return;
    }

    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analysez ce produit: "${formData.name}". Générez:
1. Une description marketing attractive (2-3 phrases)
2. Le type d'article (choix: Fastfood, Restaurants, Boutique Fleurs, Pharmacie, Mariage, Epicerie, Café, Pour Femme, Electronics, Pour homme, Maison, Bébé, Outils)
3. 5 tags SEO pertinents en français`,
        file_urls: [formData.image_url],
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            category: { type: "string" },
            seo_tags: { type: "array", items: { type: "string" } }
          }
        }
      });

      setFormData({
        ...formData,
        description: result.description || formData.description,
        category: result.category || formData.category,
        seo_tags: result.seo_tags || formData.seo_tags
      });
      
      toast.success('✨ Informations générées avec AI');
    } catch (error) {
      toast.error('Erreur AI: ' + error.message);
    } finally {
      setAiLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.seo_tags.includes(newTag.trim())) {
      setFormData({ ...formData, seo_tags: [...formData.seo_tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setFormData({ ...formData, seo_tags: formData.seo_tags.filter(t => t !== tag) });
  };

  return (
    <>
      <ProductGuidelinesModal
        open={showGuidelines}
        onConfirm={() => {
          setShowGuidelines(false);
          setShowForm(true);
        }}
        onCancel={onClose}
      />
      
      <Dialog open={showForm} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Modifier l\'article' : 'Nouvel article'}</DialogTitle>
          {aiLoading && (
            <div className="flex items-center gap-2 text-purple-600 text-sm mt-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Génération automatique en cours...</span>
            </div>
          )}
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nom de l'article</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Pizza Margherita"
            />
          </div>

          <div>
            <Label>Photo de l'article</Label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleImageUpload(e, false)} 
              className="w-full border rounded-lg p-2"
            />
            {formData.image_url && (
              <div className="flex items-center gap-4 mt-2">
                <img src={formData.image_url} alt="" className="h-32 w-32 object-cover rounded-lg border-2 border-blue-500" />
                <Button
                  type="button"
                  onClick={handleGenerateWithAI}
                  disabled={aiLoading || !formData.name}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {aiLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Magie AI
                </Button>
              </div>
            )}
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              placeholder="Sera générée automatiquement..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prix (HTG)</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || '' })}
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
            <Label>Images supplémentaires</Label>
            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="w-full" />
            {formData.additional_images.length > 0 && (
              <div className="mt-2 flex gap-2 flex-wrap">
                {formData.additional_images.map((img, idx) => (
                  <div key={idx} className="relative">
                    <img src={img} alt="" className="h-20 w-20 object-cover rounded-lg" />
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        additional_images: formData.additional_images.filter((_, i) => i !== idx)
                      })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type d'article</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fastfood">Fastfood</SelectItem>
                  <SelectItem value="Restaurants">Restaurants</SelectItem>
                  <SelectItem value="Boutique Fleurs">Boutique Fleurs</SelectItem>
                  <SelectItem value="Pharmacie">Pharmacie</SelectItem>
                  <SelectItem value="Mariage">Mariage</SelectItem>
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
              <p className="text-xs text-slate-500 mt-1">
                Le type d'article peut être différent de votre catégorie boutique
              </p>
            </div>

            <div>
              <Label>Stock disponible</Label>
              <Input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Taille d'emballage</Label>
              <Select value={formData.taille_emballage} onValueChange={(v) => setFormData({ ...formData, taille_emballage: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Petit">Petit</SelectItem>
                  <SelectItem value="Moyen">Moyen</SelectItem>
                  <SelectItem value="Grand">Grand</SelectItem>
                  <SelectItem value="Lourd">Lourd</SelectItem>
                  <SelectItem value="Encombrant">Encombrant</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Délai de livraison</Label>
              <Select value={formData.delivery_time} onValueChange={(v) => setFormData({ ...formData, delivery_time: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30-45 minutes">30-45 minutes</SelectItem>
                  <SelectItem value="24 heures">24 heures</SelectItem>
                  <SelectItem value="3-5 jours">3-5 jours</SelectItem>
                  <SelectItem value="15 jours">15 jours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Tags SEO (pour recherche)</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Ex: pizza, italien, végétarien"
              />
              <Button type="button" onClick={addTag} variant="outline">
                Ajouter
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {formData.seo_tags.map(tag => (
                <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                  {tag} <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
          </div>

          {/* Attributs produits pour catalogues Facebook/Google */}
          <div className="border-t pt-4 mt-4">
            <h3 className="font-semibold text-sm mb-3 text-slate-700">
              📊 Attributs pour catalogues (Facebook/Google Shopping)
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Ces informations améliorent la visibilité de vos produits sur Facebook et Google Shopping
            </p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Couleur</Label>
                <Input
                  value={formData.product_attributes.color}
                  onChange={(e) => setFormData({
                    ...formData,
                    product_attributes: { ...formData.product_attributes, color: e.target.value }
                  })}
                  placeholder="Ex: Rouge, Bleu, Noir"
                />
              </div>
              
              <div>
                <Label className="text-xs">Taille</Label>
                <Input
                  value={formData.product_attributes.size}
                  onChange={(e) => setFormData({
                    ...formData,
                    product_attributes: { ...formData.product_attributes, size: e.target.value }
                  })}
                  placeholder="Ex: S, M, L, XL"
                />
              </div>
              
              <div>
                <Label className="text-xs">Matière</Label>
                <Input
                  value={formData.product_attributes.material}
                  onChange={(e) => setFormData({
                    ...formData,
                    product_attributes: { ...formData.product_attributes, material: e.target.value }
                  })}
                  placeholder="Ex: Coton, Polyester"
                />
              </div>
              
              <div>
                <Label className="text-xs">Genre</Label>
                <Select 
                  value={formData.product_attributes.gender} 
                  onValueChange={(v) => setFormData({
                    ...formData,
                    product_attributes: { ...formData.product_attributes, gender: v }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Aucun</SelectItem>
                    <SelectItem value="male">Homme</SelectItem>
                    <SelectItem value="female">Femme</SelectItem>
                    <SelectItem value="unisex">Unisexe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Groupe d'âge</Label>
                <Select 
                  value={formData.product_attributes.age_group} 
                  onValueChange={(v) => setFormData({
                    ...formData,
                    product_attributes: { ...formData.product_attributes, age_group: v }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Aucun</SelectItem>
                    <SelectItem value="adult">Adulte</SelectItem>
                    <SelectItem value="kids">Enfant</SelectItem>
                    <SelectItem value="toddler">Tout-petit</SelectItem>
                    <SelectItem value="infant">Bébé</SelectItem>
                    <SelectItem value="newborn">Nouveau-né</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="text-xs">Motif</Label>
                <Input
                  value={formData.product_attributes.pattern}
                  onChange={(e) => setFormData({
                    ...formData,
                    product_attributes: { ...formData.product_attributes, pattern: e.target.value }
                  })}
                  placeholder="Ex: Rayé, Uni, À pois"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <Label className="text-xs mb-2 block">Labels personnalisés (pour filtrage dans vos publicités)</Label>
              <div className="grid grid-cols-1 gap-2">
                {[0, 1, 2, 3, 4].map(i => (
                  <Input
                    key={i}
                    value={formData.product_attributes.custom_labels[`label_${i}`]}
                    onChange={(e) => setFormData({
                      ...formData,
                      product_attributes: {
                        ...formData.product_attributes,
                        custom_labels: {
                          ...formData.product_attributes.custom_labels,
                          [`label_${i}`]: e.target.value
                        }
                      }
                    })}
                    placeholder={`Label ${i + 1}: Ex: Bestseller, Nouveau, Promo`}
                    className="text-sm"
                  />
                ))}
              </div>
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
    </>
  );
}