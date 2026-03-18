import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  SelectGroup, // Ajouté pour le correctif
  SelectLabel  // Ajouté pour le correctif
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Loader2, 
  Sparkles, 
  X, 
  Image as ImageIcon, 
  Tag, 
  DollarSign, 
  Package, 
  Truck, 
  Layers, 
  Info,
  Palette,
  Ruler,
  User,
  ShoppingBag,
  Type,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import FbCategorySelector from '@/components/product/FbCategorySelector';
import { getTaxonomyMappingPrompt, getCategoryPath } from '@/lib/fbTaxonomy';

const ProductGuidelinesModal = ({ open, onConfirm, onCancel }) => {
  if (!open) return null;

  const guidelines = [
    {
      icon: <Sparkles className="w-5 h-5 text-pink-500" />,
      title: "Utilisez Magie AI",
      description: "Sélectionnez Magie AI pour générer automatiquement la description, catégorie, sous-catégorie et tags SEO."
    },
    {
      icon: <ImageIcon className="w-5 h-5 text-blue-500" />,
      title: "Photos de haute qualité",
      description: "Utilisez un éclairage naturel. Montrez le produit sous plusieurs angles. Évitez les photos floues ou trop sombres."
    },
    {
      icon: <Type className="w-5 h-5 text-purple-500" />,
      title: "Titre et Description clairs",
      description: "Indiquez la marque, le modèle et l'état. Mentionnez tout défaut éventuel pour éviter les retours."
    },
    {
      icon: <Tag className="w-5 h-5 text-green-500" />,
      title: "Prix juste et transparent",
      description: "Fixez un prix compétitif par rapport au marché. Pas de frais cachés."
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-orange-500" />,
      title: "Articles autorisés uniquement",
      description: "Assurez-vous que votre produit respecte nos conditions de vente (pas de contrefaçons)."
    }
  ];

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white rounded-xl border-0 shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
          <div className="relative z-10">
            <div className="mx-auto bg-white/20 w-12 h-12 rounded-full flex items-center justify-center mb-3 backdrop-blur-sm shadow-inner">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <DialogTitle className="text-xl font-bold text-white">Avant de publier</DialogTitle>
            <p className="text-blue-100 text-sm mt-1 font-light">
              Suivez ces quelques règles pour vendre plus rapidement et éviter les refus.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {guidelines.map((item, index) => (
            <div key={index} className="flex gap-4 items-start group">
              <div className="mt-0.5 bg-slate-50 p-2.5 rounded-xl shrink-0 group-hover:bg-blue-50 transition-colors border border-slate-100 group-hover:border-blue-100">
                {item.icon}
              </div>
              <div>
                <h4 className="font-semibold text-slate-800 text-sm mb-0.5">{item.title}</h4>
                <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-50 border-t flex gap-3">
           <Button variant="ghost" onClick={onCancel} className="flex-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200">
             Annuler
           </Button>
           <Button onClick={onConfirm} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 font-medium">
             J'ai compris, continuer
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function ProductFormModal({ product, shopId = "shop_123", open = true, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    promo_price: '',
    description: '',
    category: 'Fastfood',
    subcategory: '',
    stock_quantity: 0,
    image_url: '',
    image_alt: '',
    additional_images: [],
    taille_emballage: 'Moyen',
    delivery_time: '30-45 minutes',
    seo_tags: [],
    is_available: true,
    fb_category_id: null,
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
      setAiGenerated(false);
      // Reset form for new product
      setFormData({
        name: '',
        price: '',
        promo_price: '',
        description: '',
        category: 'Fastfood',
        subcategory: '',
        stock_quantity: 0,
        image_url: '',
        image_alt: '',
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
      setAiGenerated(true); // Don't auto-generate for existing products
      setFormData({
        name: product.name || '',
        price: product.price || '',
        promo_price: product.promo_price || '',
        description: product.description || '',
        category: product.category || 'Fastfood',
        subcategory: product.subcategory || product.subCategory || '',
        stock_quantity: product.stock_quantity || 0,
        image_url: product.image_url || '',
        image_alt: product.image_alt || '',
        additional_images: product.additional_images || [],
        taille_emballage: product.taille_emballage || 'Moyen',
        delivery_time: product.delivery_time || '30-45 minutes',
        seo_tags: product.seo_tags || [],
        is_available: product.is_available !== false,
        fb_category_id: product.fb_category_id || null,
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
      setAiGenerated(false);
    }
  }, [open, product]);

  // Auto-trigger AI when title and image are filled
  useEffect(() => {
    if (formData.name && formData.image_url && !aiGenerated && !aiLoading && showForm) {
      handleGenerateWithAI();
    }
  }, [formData.name, formData.image_url, aiGenerated, aiLoading, showForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
     
    // Validation des champs obligatoires
    if (!formData.name || !formData.name.trim()) {
      toast.error('Le nom de l\'article est obligatoire');
      return;
    }
    if (!formData.image_url) {
      toast.error('La photo de l\'article est obligatoire');
      return;
    }
    if (!formData.price || formData.price <= 0) {
      toast.error('Le prix est obligatoire et doit être supérieur à 0');
      return;
    }
    if (!shopId) {
      toast.error('Erreur: Boutique non identifiée');
      return;
    }
     
    setLoading(true);
     
    try {
      // Generate slug from product name
      const slug = formData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 60);

      const dataWithSlug = { ...formData, slug: slug || undefined, image_alt: formData.image_alt || formData.name };

      if (product) {
        await base44.entities.Product.update(product.id, dataWithSlug);
        toast.success('Article mis à jour');
      } else {
        await base44.entities.Product.create({ ...dataWithSlug, shop_id: shopId });
        toast.success('Article créé');
      }
      onSuccess?.();
      onClose?.();
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
    toast.info('📸 Téléchargement en cours...');
    
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      if (isAdditional) {
        setFormData(prev => ({ ...prev, additional_images: [...prev.additional_images, file_url] }));
        toast.success('Image ajoutée');
      } else {
        setFormData(prev => ({ ...prev, image_url: file_url }));
        toast.success('Image téléchargée avec succès');
      }
    } catch (error) {
      toast.error('Erreur lors du téléchargement: ' + error.message);
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
      const taxonomyList = getTaxonomyMappingPrompt();
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es un Expert SEO Senior et Copywriter E-commerce spécialisé dans le marché haïtien. Tu travailles pour la marketplace RapidoPresto en Haïti.

À partir du nom du produit "${formData.name}" et de l'image fournie, génère une annonce complète.

RÈGLES :

1. DESCRIPTION : 3-4 lignes MAX avec emojis, axée bénéfice client + urgence + CTA. Intègre Delmas, Cap-Haïtien ou Gonaïves. EN FRANÇAIS.

2. CATEGORY : Catégorie parmi: "Habillement et accessoires", "Électronique", "Maison", "Famille", "Santé et beauté", "Épicerie", "Loisirs", "Mariage", "Restauration", "Pharmacie et santé"

3. SUBCATEGORY : La plus précise selon la catégorie.

4. FB_CATEGORY_ID : Attribue l'ID de catégorie Facebook/Google Taxonomy le plus précis parmi cette liste :
${taxonomyList}
Retourne UNIQUEMENT l'ID numérique (ex: 225 pour Smartphones, 211 pour Bagues, etc.)

5. SEO_TAGS : 10-15 mots-clés en français + anglais + créole + villes haïtiennes.

6. IMAGE_ALT : 15-20 mots décrivant l'image pour SEO.

Réponds en JSON strict.`,
        file_urls: [formData.image_url],
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            category: { type: "string" },
            subcategory: { type: "string" },
            fb_category_id: { type: "number" },
            seo_tags: { type: "array", items: { type: "string" } },
            image_alt: { type: "string" }
          },
          required: ["description", "category", "seo_tags", "image_alt"]
        }
      });

      setFormData({
        ...formData,
        description: result.description || formData.description,
        category: result.category || formData.category,
        subcategory: result.category === 'Mariage' ? (result.subcategory || formData.subcategory) : formData.subcategory,
        seo_tags: result.seo_tags || formData.seo_tags,
        image_alt: result.image_alt || formData.image_alt,
        fb_category_id: result.fb_category_id || formData.fb_category_id,
      });
      
      setAiGenerated(true);
      toast.success('✨ Description, catégorie et tags générés par IA');
    } catch (error) {
      toast.error('Erreur IA: ' + error.message);
      setAiGenerated(true); // Mark as attempted even on error
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

  // --- CATEGORIES FACEBOOK MARKETPLACE OFFICIELLES ---
  const FB_CATEGORIES = {
    'Habillement et accessoires': [
      'Vêtements pour femmes', 'Vêtements pour hommes', 'Chaussures',
      'Sacs et bagages', 'Bijoux et accessoires', 'Robes', 'Costumes', 'Vêtements bébé'
    ],
    'Électronique': [
      'Téléphones portables', 'Ordinateurs', 'Électronique grand public',
      'Audio', 'Caméras', 'Accessoires informatiques'
    ],
    'Maison': [
      'Meubles', 'Décoration intérieure', 'Articles ménagers',
      'Jardin', 'Outils', 'Décoration de fête', 'Fleurs et plantes artificielles'
    ],
    'Famille': [
      'Articles pour bébés et enfants', 'Jouets et jeux', 'Puériculture', 'Poussettes'
    ],
    'Santé et beauté': [
      'Soins de la peau', 'Maquillage', 'Soins capillaires',
      'Bain et corps', 'Parfums', 'Perruques et extensions'
    ],
    'Épicerie': [
      'Boissons', 'Nourriture', 'Produits frais', 'Café', 'Paniers-cadeaux', 'Chocolats'
    ],
    'Loisirs': [
      'Articles de sport', 'Instruments de musique', 'Livres', 'Artisanat', 'Films et musique'
    ],
    'Jardin et extérieur': [
      'Meubles de jardin', 'Barbecue', 'Plantes', 'Fleurs naturelles'
    ],
    'Fournitures de bureau': [
      'Équipement de bureau', 'Papeterie', 'Fournitures scolaires'
    ],
    'Véhicules': [
      'Voitures et camions', 'Motos', 'Pièces de véhicules', 'Accessoires auto'
    ],
    'Mariage': [
      'Robe Sirène', 'Robe Catalina', 'Robe Ponpon (Princesse)', 'Robe de Cérémonie',
      'Demoiselle d\'honneur', 'Témoins', 'Bague de Mariage', 'Bague',
      'Accessoires', 'Carte et programmation', 'Matériels Décor'
    ],
    'Restauration': [
      'Fastfood', 'Restaurant', 'Café', 'Épicerie fine', 'Traiteur'
    ],
    'Pharmacie et santé': [
      'Médicaments sans ordonnance', 'Compléments alimentaires', 'Matériel médical'
    ],
  };

  const FB_CATEGORY_ICONS = {
    'Habillement et accessoires': '👗',
    'Électronique': '📱',
    'Maison': '🏠',
    'Famille': '👶',
    'Santé et beauté': '💄',
    'Épicerie': '🛒',
    'Loisirs': '🎸',
    'Jardin et extérieur': '🌿',
    'Fournitures de bureau': '📋',
    'Véhicules': '🚗',
    'Mariage': '💍',
    'Restauration': '🍽️',
    'Pharmacie et santé': '💊',
  };

  // Sous-catégories actives selon la catégorie choisie
  const activeSubCategories = FB_CATEGORIES[formData.category] || [];

  // --- CORRECTION ET AJOUT DES SOUS-CATEGORIES MARIAGE (legacy) ---
  const weddingGeneralCategories = [
    'Demoiselle d\'honneur',
    'Témoins',
    'Bague de Mariage',
    'Bague',
    'Accessoires',
    'Carte et programmation',
    'Matériels Décor'
  ];

  const weddingDressCategories = [
    'Robe Sirène',
    'Robe Catalina',
    'Robe Ponpon (Princesse)',
    'Robe de Cérémonie'
  ];

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
        <DialogContent className="max-w-full sm:max-w-3xl h-[100vh] sm:h-[90vh] p-0 flex flex-col bg-white rounded-none sm:rounded-xl overflow-hidden">
        <DialogHeader className="p-4 sm:p-6 border-b bg-slate-50 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="bg-blue-100 p-2 rounded-full">
                 <ShoppingBag className="w-5 h-5 text-blue-600" />
              </div>
              {product ? 'Modifier l\'article' : 'Nouvel article'}
          </DialogTitle>
          {aiLoading && (
            <div className="flex items-center gap-2 text-purple-600 text-sm mt-2 animate-pulse bg-purple-50 p-2 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>L'intelligence artificielle travaille pour vous...</span>
            </div>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
        <form onSubmit={handleSubmit} className="space-y-6 pb-20 sm:pb-0">
           
          {/* Section 1: Informations de base */}
          <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                 <Info className="w-4 h-4 text-slate-900" />
                 <h3 className="font-semibold text-slate-900">Informations principales</h3>
              </div>

              <div>
                <Label className="mb-1.5 flex items-center gap-1">Nom de l'article <span className="text-red-500">*</span></Label>
                <Input
                  className="h-11 text-lg"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Pizza Margherita"
                  required
                />
              </div>

              <div>
                <Label className="mb-2 flex items-center gap-1">Photo principale <span className="text-red-500">*</span></Label>
                
                <div className={`border-2 border-dashed rounded-xl p-4 transition-colors text-center ${formData.image_url ? 'border-blue-200 bg-blue-50/30' : 'border-slate-300 hover:border-blue-400 bg-slate-50'}`}>
                    <div className="flex flex-col items-center justify-center gap-3">
                        {formData.image_url ? (
                            <div className="relative w-full max-w-xs mx-auto group">
                                <img src={formData.image_url} alt="Aperçu" className="w-full h-48 object-cover rounded-lg shadow-md" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                    <span className="text-white font-medium">Changer l'image</span>
                                </div>
                            </div>
                        ) : (
                            <div className="py-6 text-slate-400">
                                <ImageIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                                <p className="text-sm font-medium">Appuyez pour ajouter une image</p>
                            </div>
                        )}
                        
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleImageUpload(e, false)} 
                          className={`absolute inset-0 w-full h-full opacity-0 cursor-pointer ${formData.image_url ? 'h-12 mt-auto relative' : ''}`} // Si image présente, l'input est subtilement caché
                          required={!formData.image_url}
                        />
                    </div>

                    {formData.image_url && (
                        <div className="mt-4 flex justify-center">
                            <Button
                              type="button"
                              onClick={handleGenerateWithAI}
                              disabled={aiLoading || !formData.name}
                              className="w-full sm:w-auto bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 text-white shadow-lg hover:shadow-purple-500/25 border-none"
                            >
                              {aiLoading ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Sparkles className="w-4 h-4 mr-2" />
                              )}
                              Remplir automatiquement avec l'IA
                            </Button>
                        </div>
                    )}
                </div>
              </div>

              <div>
                <Label className="mb-1.5">Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="resize-none bg-slate-50"
                  placeholder="Décrivez votre produit... (ou laissez l'IA le faire)"
                />
              </div>

              <div>
                <Label className="mb-1.5 flex items-center gap-2">
                  Texte ALT de l'image
                  <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">SEO · Google Images · Accessibilité</span>
                </Label>
                <Input
                  value={formData.image_alt}
                  onChange={(e) => setFormData({ ...formData, image_alt: e.target.value })}
                  placeholder="Ex: Robe de mariée sirène blanche avec traîne, vue de face — généré par IA"
                  className="bg-slate-50"
                  maxLength={150}
                />
                {formData.image_alt && (
                  <p className="text-xs text-slate-400 mt-1">{formData.image_alt.length}/150 caractères</p>
                )}
              </div>
          </div>

          {/* Section 2: Prix et Stock */}
          <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                 <DollarSign className="w-4 h-4 text-slate-900" />
                 <h3 className="font-semibold text-slate-900">Prix & Inventaire</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 text-xs uppercase tracking-wide text-slate-900">Prix (HTG) <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 font-bold">$</span>
                    <Input
                      type="number"
                      className="pl-7 font-semibold text-slate-900"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || '' })}
                      required
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 text-xs uppercase tracking-wide text-slate-900">Promo (HTG)</Label>
                  <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-900 font-bold">$</span>
                      <Input
                        type="number"
                        className="pl-7 text-slate-900 font-medium"
                        value={formData.promo_price}
                        onChange={(e) => setFormData({ ...formData, promo_price: parseFloat(e.target.value) || null })}
                      />
                  </div>
                </div>
              </div>

              <div>
                <Label className="mb-1.5 flex items-center gap-2 text-slate-900"><Package className="w-4 h-4" /> Stock disponible</Label>
                <Input
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                  className="max-w-[150px] text-slate-900"
                />
              </div>
          </div>

          {/* Section 3: Catégorisation Facebook */}
          <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                 <Layers className="w-4 h-4 text-slate-900" />
                 <h3 className="font-semibold text-slate-900">Catégorie Facebook</h3>
                 <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Marketplace</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <Label className="mb-1.5">Catégorie principale</Label>
                   <Select 
                     value={formData.category} 
                     onValueChange={(v) => setFormData({ ...formData, category: v, subcategory: '' })}
                   >
                     <SelectTrigger className="h-11">
                       <SelectValue />
                     </SelectTrigger>
                     <SelectContent>
                       {Object.keys(FB_CATEGORIES).map((cat) => (
                         <SelectItem key={cat} value={cat}>
                           {FB_CATEGORY_ICONS[cat]} {cat}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>

                 {activeSubCategories.length > 0 && (
                   <div className="animate-in fade-in slide-in-from-top-2">
                     <Label className="mb-1.5">Sous-catégorie</Label>
                     <Select 
                       value={formData.subcategory} 
                       onValueChange={(v) => setFormData({ ...formData, subcategory: v })}
                     >
                       <SelectTrigger className="h-11 border-blue-200 bg-blue-50/30">
                         <SelectValue placeholder="Sélectionner..." />
                       </SelectTrigger>
                       <SelectContent>
                         {activeSubCategories.map((sub) => (
                           <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>
                 )}
             </div>
          </div>

          {/* Section 4: Logistique */}
          <div className="bg-white p-4 rounded-xl shadow-sm border space-y-4">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b">
                <Truck className="w-4 h-4 text-slate-900" />
                <h3 className="font-semibold text-slate-900">Logistique</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 text-xs text-slate-900">Taille colis</Label>
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
                  <Label className="mb-1.5 text-xs text-slate-900">Livraison estimée</Label>
                  <Select value={formData.delivery_time} onValueChange={(v) => setFormData({ ...formData, delivery_time: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30-45 minutes">⚡ 30-45 min</SelectItem>
                      <SelectItem value="24 heures">🕒 24 heures</SelectItem>
                      <SelectItem value="3-5 jours">📅 3-5 jours</SelectItem>
                      <SelectItem value="15 jours">🚢 15 jours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
          </div>

          {/* Section 5: Images additionnelles */}
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <Label className="mb-3 block flex items-center gap-2 text-slate-900"><ImageIcon className="w-4 h-4" /> Galerie d'images</Label>
             
            <div className="flex flex-wrap gap-3">
                 <label className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                    <span className="text-2xl text-slate-400">+</span>
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" />
                 </label>

                {formData.additional_images.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 group">
                    <img src={img} alt="" className="w-full h-full object-cover rounded-lg border" />
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        additional_images: formData.additional_images.filter((_, i) => i !== idx)
                      })}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
            </div>
          </div>

          {/* Section 6: SEO */}
          <div className="bg-white p-4 rounded-xl shadow-sm border">
            <Label className="mb-2 block flex items-center gap-2 text-slate-900"><Tag className="w-4 h-4" /> Mots-clés (SEO)</Label>
            <div className="flex gap-2 mb-3">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Ajouter un tag..."
                className="h-9 text-slate-900"
              />
              <Button type="button" onClick={addTag} variant="secondary" size="sm">
                Ajouter
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap min-h-[2rem]">
              {formData.seo_tags.length === 0 && <span className="text-sm text-slate-400 italic">Aucun tag pour le moment</span>}
              {formData.seo_tags.map(tag => (
                <Badge key={tag} variant="outline" className="pl-3 pr-1 py-1 gap-1 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer transition-colors" onClick={() => removeTag(tag)}>
                  {tag} <div className="bg-blue-200 rounded-full p-0.5"><X className="w-2 h-2" /></div>
                </Badge>
              ))}
            </div>
          </div>

          {/* Section 7: Attributs Avancés */}
          <div className="border border-slate-200 bg-slate-50 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-100/50">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <div className="bg-white p-1 rounded shadow-sm">📊</div> 
                  Détails avancés (Catalogue Meta/Google)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Remplissez ces champs pour booster votre visibilité publicitaire.
                </p>
            </div>
             
            <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-slate-900 mb-1 flex gap-1"><Palette className="w-3 h-3"/> Couleur</Label>
                    <Input
                      className="bg-white h-9 text-slate-900"
                      value={formData.product_attributes.color}
                      onChange={(e) => setFormData({
                        ...formData,
                        product_attributes: { ...formData.product_attributes, color: e.target.value }
                      })}
                      placeholder="Rouge..."
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-slate-900 mb-1 flex gap-1"><Ruler className="w-3 h-3"/> Taille</Label>
                    <Input
                      className="bg-white h-9 text-slate-900"
                      value={formData.product_attributes.size}
                      onChange={(e) => setFormData({
                        ...formData,
                        product_attributes: { ...formData.product_attributes, size: e.target.value }
                      })}
                      placeholder="XL, 42..."
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-slate-900 mb-1">Matière</Label>
                    <Input
                      className="bg-white h-9 text-slate-900"
                      value={formData.product_attributes.material}
                      onChange={(e) => setFormData({
                        ...formData,
                        product_attributes: { ...formData.product_attributes, material: e.target.value }
                      })}
                      placeholder="Coton..."
                    />
                  </div>
                  
                  <div>
                    <Label className="text-xs text-slate-900 mb-1 flex gap-1"><User className="w-3 h-3"/> Genre</Label>
                    <Select 
                      value={formData.product_attributes.gender} 
                      onValueChange={(v) => setFormData({
                        ...formData,
                        product_attributes: { ...formData.product_attributes, gender: v }
                      })}
                    >
                      <SelectTrigger className="bg-white h-9">
                        <SelectValue placeholder="-" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>Aucun</SelectItem>
                        <SelectItem value="male">Homme</SelectItem>
                        <SelectItem value="female">Femme</SelectItem>
                        <SelectItem value="unisex">Unisexe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Label className="text-xs text-slate-900 mb-1">Groupe d'âge</Label>
                    <Select 
                      value={formData.product_attributes.age_group} 
                      onValueChange={(v) => setFormData({
                        ...formData,
                        product_attributes: { ...formData.product_attributes, age_group: v }
                      })}
                    >
                      <SelectTrigger className="bg-white h-9">
                        <SelectValue placeholder="-" />
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
                </div>
                
                <div className="pt-2 border-t border-slate-200">
                  <Label className="text-xs font-semibold mb-2 block text-slate-600">Labels personnalisés (Filtres Pubs)</Label>
                  <div className="space-y-2">
                    {[0, 1].map(i => (
                      <Input
                        key={i}
                        className="bg-white h-8 text-sm text-slate-900"
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
                        placeholder={`Label ${i + 1} (ex: Soldes)`}
                      />
                    ))}
                    {/* On cache les labels 2,3,4 sur mobile pour simplifier sauf si remplis, ici on affiche juste les 2 premiers pour le design "joli" demandé, le reste est accessible via code si besoin d'étendre */}
                  </div>
                </div>
            </div>
          </div>

          {/* Action Buttons Footer - Sticky on Mobile */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t sm:relative sm:border-t-0 sm:bg-transparent sm:p-0 flex gap-3 z-10">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 border-slate-300">
              Annuler
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-base font-semibold shadow-lg shadow-blue-200">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {product ? 'Sauvegarder' : 'Créer l\'article'}
            </Button>
          </div>
           
        </form>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}