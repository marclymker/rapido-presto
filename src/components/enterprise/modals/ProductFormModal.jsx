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
import { 
  Loader2, 
  Sparkles, 
  X, 
  Image as ImageIcon, 
  Tag, 
  Package, 
  Truck, 
  BarChart3, 
  PlusCircle
} from 'lucide-react';
import ProductGuidelinesModal from './ProductGuidelinesModal';

export default function ProductFormModal({ product, shopId, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // État séparé pour la photo
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

  useEffect(() => {
    if (open) {
      if (product) {
        setShowGuidelines(false);
        setShowForm(true);
        setFormData({
          ...product,
          is_available: product.is_available !== false,
          product_attributes: product.product_attributes || formData.product_attributes
        });
      } else {
        setShowGuidelines(true);
        setShowForm(false);
      }
    }
  }, [open, product]);

  // CORRECTION : Gestion du téléchargement sécurisée
  const handleImageUpload = async (e, isAdditional = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true); // Utilisation d'un loader spécifique
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      
      // Extraction sécurisée de l'URL
      const file_url = response.file_url || response.url || response;

      if (isAdditional) {
        setFormData(prev => ({ 
          ...prev, 
          additional_images: [...prev.additional_images, file_url] 
        }));
        toast.success('Image additionnelle ajoutée');
      } else {
        setFormData(prev => ({ ...prev, image_url: file_url }));
        toast.success('Image principale chargée');
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error('Erreur lors du téléchargement. Vérifiez le format du fichier.');
    } finally {
      setUploading(false);
    }
  };

  // OPTION MAGIE AI : Toujours maintenue et renforcée
  const handleGenerateWithAI = async () => {
    if (!formData.image_url || !formData.name) {
      return toast.error('Ajoutez un nom et une image pour activer la Magie AI');
    }
    
    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse cet article de boutique : "${formData.name}". Génère une description persuasive, suggère une catégorie et 5 tags SEO.`,
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

      setFormData(prev => ({
        ...prev,
        description: result.description || prev.description,
        category: result.category || prev.category,
        seo_tags: result.seo_tags || prev.seo_tags
      }));
      toast.success('✨ Magie AI : Fiche complétée !');
    } catch (error) {
      toast.error("L'IA n'a pas pu analyser l'image.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim() || !formData.image_url) {
      return toast.error('Le nom et la photo sont obligatoires');
    }
    
    setLoading(true);
    try {
      if (product) {
        await base44.entities.Product.update(product.id, formData);
        toast.success('Article mis à jour');
      } else {
        await base44.entities.Product.create({ ...formData, shop_id: shopId });
        toast.success('Article créé avec succès');
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.seo_tags.includes(newTag.trim())) {
      setFormData({ ...formData, seo_tags: [...formData.seo_tags, newTag.trim()] });
      setNewTag('');
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
        <DialogContent className="max-w-3xl w-[95vw] h-[95vh] sm:h-auto overflow-y-auto p-0 rounded-2xl shadow-2xl">
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 border-b p-4 flex justify-between items-center">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold italic text-slate-900">
                {product ? 'MODIFIER L\'ARTICLE' : 'NOUVEL ARTICLE'}
              </DialogTitle>
            </DialogHeader>
            {aiLoading && <Badge className="bg-purple-100 text-purple-700 animate-pulse">IA en cours...</Badge>}
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-6 pb-28">
            {/* ZONE PHOTO ET IA */}
            <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 space-y-4">
              <Label className="font-bold flex items-center gap-2"><ImageIcon className="w-4 h-4" /> VISUEL PRINCIPAL</Label>
              
              <div className="relative aspect-video rounded-xl border-2 border-dashed border-slate-300 bg-white overflow-hidden flex items-center justify-center">
                {uploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <span className="text-xs font-bold text-slate-400">CHARGEMENT...</span>
                  </div>
                ) : formData.image_url ? (
                  <>
                    <img src={formData.image_url} alt="Product" className="w-full h-full object-contain" />
                    <label className="absolute bottom-3 right-3 bg-white/90 p-2 rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
                      <PlusCircle className="w-6 h-6 text-blue-600" />
                      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} className="hidden" />
                    </label>
                  </>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                    <PlusCircle className="w-10 h-10 text-slate-300 mb-2" />
                    <span className="text-sm font-bold text-slate-400 text-center px-4">CLIQUEZ POUR AJOUTER UNE PHOTO</span>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e)} className="hidden" />
                  </label>
                )}
              </div>

              {/* BOUTON MAGIE AI - INDISPENSABLE */}
              {formData.image_url && (
                <Button
                  type="button"
                  onClick={handleGenerateWithAI}
                  disabled={aiLoading || !formData.name}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 h-14 rounded-xl shadow-xl transition-all active:scale-95"
                >
                  {aiLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2 text-yellow-300" />}
                  <span className="font-black tracking-tight text-lg">MAGIE AI : GÉNÉRER TOUT</span>
                </Button>
              )}
            </div>

            {/* FORMULAIRE CLASSIQUE */}
            <div className="grid gap-5">
              <div className="space-y-2">
                <Label className="font-bold ml-1">NOM DE L'ARTICLE</Label>
                <Input 
                  className="h-14 text-lg rounded-xl border-slate-200" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Ex: Robe de soirée en soie"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-blue-600 ml-1">PRIX (HTG)</Label>
                  <Input 
                    type="number" 
                    className="h-12 rounded-xl bg-blue-50/50" 
                    value={formData.price} 
                    onChange={(e) => setFormData({...formData, price: e.target.value})} 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-emerald-600 ml-1">PRIX PROMO</Label>
                  <Input 
                    type="number" 
                    className="h-12 rounded-xl bg-emerald-50/50" 
                    value={formData.promo_price} 
                    onChange={(e) => setFormData({...formData, promo_price: e.target.value})} 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold ml-1 text-slate-700 flex items-center gap-2">
                  <Tag className="w-4 h-4" /> TAGS SEO
                </Label>
                <div className="flex gap-2">
                  <Input 
                    value={newTag} 
                    onChange={(e) => setNewTag(e.target.value)} 
                    placeholder="Ajouter un mot-clé..."
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    className="rounded-xl"
                  />
                  <Button type="button" onClick={addTag} className="rounded-xl px-6 bg-slate-900">OK</Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {formData.seo_tags.map(tag => (
                    <Badge key={tag} className="bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600 cursor-pointer py-1 px-3 rounded-full border border-slate-200 shadow-sm" onClick={() => setFormData({...formData, seo_tags: formData.seo_tags.filter(t => t !== tag)})}>
                      #{tag} <X className="w-3 h-3 ml-1" />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* ACTIONS FINALES */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-lg border-t flex gap-3 z-30 sm:relative sm:p-0 sm:border-0 sm:bg-transparent">
              <Button type="button" variant="ghost" onClick={onClose} className="flex-1 h-14 rounded-2xl font-bold text-slate-500">
                ANNULER
              </Button>
              <Button 
                type="submit" 
                disabled={loading || uploading} 
                className="flex-[2] h-14 rounded-2xl bg-black text-white font-black shadow-2xl shadow-blue-200"
              >
                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (product ? 'METTRE À JOUR' : 'PUBLIER L\'ARTICLE')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}