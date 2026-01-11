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
import { Loader2, Sparkles, X, ImageIcon, PlusCircle } from 'lucide-react';
import ProductGuidelinesModal from './ProductGuidelinesModal';

export default function ProductFormModal({ product, shopId, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // État séparé pour le téléchargement
  const [aiLoading, setAiLoading] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    promo_price: '',
    description: '',
    category: 'Fastfood',
    subCategory: '',
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

  const [newTag, setNewTag] = useState('');

  // Initialisation du formulaire
  useEffect(() => {
    if (open) {
      if (product) {
        setShowGuidelines(false);
        setShowForm(true);
        setFormData({ ...product, is_available: product.is_available !== false });
      } else {
        setShowGuidelines(true);
        setShowForm(false);
      }
    }
  }, [open, product]);

  // CORRECTION : Gestion sécurisée du téléchargement d'image
  const handleImageUpload = async (e, isAdditional = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Vérification locale avant envoi
    if (file.size > 10 * 1024 * 1024) {
      toast.error("L'image est trop lourde (max 10Mo)");
      return;
    }

    setUploading(true);
    try {
      // Appel API base44
      const response = await base44.integrations.Core.UploadFile({ file });
      
      if (!response || !response.file_url) {
        throw new Error("L'URL de retour est manquante");
      }

      const uploadedUrl = response.file_url;

      if (isAdditional) {
        setFormData(prev => ({ 
          ...prev, 
          additional_images: [...prev.additional_images, uploadedUrl] 
        }));
        toast.success('Image additionnelle ajoutée');
      } else {
        setFormData(prev => ({ ...prev, image_url: uploadedUrl }));
        toast.success('Image principale chargée');
      }
    } catch (error) {
      console.error("Erreur Upload:", error);
      toast.error("Échec du téléchargement. Vérifiez votre connexion.");
    } finally {
      setUploading(false);
    }
  };

  // OPTION MAGIE AI (MAINTENUE ET RENFORCÉE)
  const handleGenerateWithAI = async () => {
    if (!formData.image_url) {
      toast.error('Veuillez d\'abord télécharger une photo');
      return;
    }
    if (!formData.name) {
      toast.error('Donnez un nom même partiel pour aider l\'IA');
      return;
    }

    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse cette image de produit nommé "${formData.name}". 
        Génère une description marketing courte, suggère la meilleure catégorie parmi (Fastfood, Restaurants, Boutique Fleurs, Pharmacie, Mariage, Epicerie, Café, Pour Femme, Electronics, Pour homme, Maison, Bébé, Outils) et crée 5 tags SEO.`,
        file_urls: [formData.image_url],
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            category: { type: "string" },
            seo_tags: { type: "array", items: { type: "string" } }
          },
          required: ["description", "category", "seo_tags"]
        }
      });

      setFormData(prev => ({
        ...prev,
        description: result.description || prev.description,
        category: result.category || prev.category,
        seo_tags: Array.isArray(result.seo_tags) ? result.seo_tags : prev.seo_tags
      }));
      
      toast.success('✨ Magie AI opérée avec succès !');
    } catch (error) {
      toast.error("L'IA n'a pas pu analyser l'image.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || uploading) return;
    
    setLoading(true);
    try {
      if (product) {
        await base44.entities.Product.update(product.id, formData);
      } else {
        await base44.entities.Product.create({ ...formData, shop_id: shopId });
      }
      toast.success('Enregistré !');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ProductGuidelinesModal open={showGuidelines} onConfirm={() => { setShowGuidelines(false); setShowForm(true); }} onCancel={onClose} />
      
      <Dialog open={showForm} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-0 rounded-2xl">
          <div className="p-6 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold italic tracking-tight text-slate-900">
                {product ? 'Éditer l\'article' : 'Créer un article'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6 pb-6">
              {/* ZONE PHOTO PRINCIPALE */}
              <div className="space-y-3">
                <Label className="text-sm font-bold text-slate-600 uppercase">Photo principale *</Label>
                <div className={`relative h-48 w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all ${formData.image_url ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-slate-50'}`}>
                  {uploading ? (
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                      <p className="text-xs mt-2 text-slate-500">Téléchargement...</p>
                    </div>
                  ) : formData.image_url ? (
                    <div className="relative w-full h-full">
                      <img src={formData.image_url} alt="Preview" className="w-full h-full object-contain p-2 rounded-2xl" />
                      <label className="absolute bottom-2 right-2 bg-white shadow-xl p-2 rounded-full cursor-pointer border hover:scale-110 transition-transform">
                        <PlusCircle className="w-5 h-5 text-blue-600" />
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} className="hidden" />
                      </label>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center cursor-pointer p-10">
                      <ImageIcon className="w-10 h-10 text-slate-400 mb-2" />
                      <span className="text-sm font-medium text-slate-500 text-center">Cliquez pour ajouter une photo</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} className="hidden" />
                    </label>
                  )}
                </div>

                {/* BOUTON MAGIE AI - TOUJOURS PRÉSENT SI IMAGE DISPONIBLE */}
                {formData.image_url && (
                  <Button 
                    type="button"
                    disabled={aiLoading}
                    onClick={handleGenerateWithAI}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 h-12 rounded-xl shadow-lg shadow-purple-100 transition-all active:scale-95"
                  >
                    {aiLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2 text-yellow-300" />}
                    <span className="font-bold">MAGIE AI : Générer Description & Tags</span>
                  </Button>
                )}
              </div>

              {/* CHAMPS DE TEXTE */}
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="font-bold ml-1">Nom de l'article</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Ex: Burger Gourmet XXL"
                    className="h-12 rounded-xl border-slate-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="font-bold ml-1 text-blue-700">Prix (HTG)</Label>
                    <Input 
                      type="number"
                      value={formData.price} 
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      className="h-12 rounded-xl bg-blue-50/50 border-blue-100"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="font-bold ml-1 text-emerald-700">Prix Promo</Label>
                    <Input 
                      type="number"
                      value={formData.promo_price} 
                      onChange={(e) => setFormData({...formData, promo_price: e.target.value})}
                      className="h-12 rounded-xl bg-emerald-50/50 border-emerald-100"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label className="font-bold ml-1">Description marketing</Label>
                  <Textarea 
                    value={formData.description} 
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="L'IA peut s'en charger avec le bouton ci-dessus..."
                    className="min-h-[100px] rounded-xl"
                  />
                </div>
              </div>

              {/* BOUTONS D'ACTION */}
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-12 rounded-xl text-slate-500 font-bold">
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || uploading} 
                  className="flex-[2] h-12 rounded-xl bg-slate-900 hover:bg-black text-white font-bold shadow-xl"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : (product ? 'Mettre à jour' : 'Publier l\'article')}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}