import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import VendorContactModal from '@/components/enterprise/modals/VendorContactModal';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue, 
  SelectGroup, 
  SelectLabel  
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
  ShieldCheck,
  Camera,
  MapPin
} from 'lucide-react';

import { base44 } from '@/api/base44Client';
import FbCategorySelector from '@/components/product/FbCategorySelector';
import { getTaxonomyMappingPrompt, getCategoryPath } from '@/lib/fbTaxonomy';

// SINGLE SOURCE OF TRUTH POUR LA LOCALISATION
const REGIONS = [
  "Port-au-Prince", "Kenscoff", "Pétion-Ville", "Delmas", "Tabarre",
  "Clercine", "Cité Soleil", "Croix des Bouquets", "Lilavois",
  "Fontamara", "Carrefour", "Gressier", "Léogâne",
  "Ennery", "L'Estère", "Gonaïves", "Plaine du Nord", "Vaudreuil",
  "Cap-Haïtien", "Madeline", "Limonade", "Pignon", "Hinche"
];

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
  const [showContactModal, setShowContactModal] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [aiGenerated, setAiGenerated] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    promo_price: '',
    description: '',
    category: 'Mode',
    subcategory: '',
    stock_quantity: 1, // Par défaut à 1 comme sur FB
    sku: '',
    location: 'Port-au-Prince',
    image_url: '',
    image_alt: '',
    additional_images: [],
    taille_emballage: 'Moyen',
    delivery_time: '30-45 minutes',
    seo_tags: [],
    is_available: true,
    fb_category_id: null,
    product_attributes: {
      condition: 'new', // État
      color: '',
      size: '',
      material: '',
      gender: '',
      age_group: '',
      pattern: '',
      custom_labels: {
        label_0: '', label_1: '', label_2: '', label_3: '', label_4: ''
      }
    }
  });
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (open && !product) {
      base44.auth.me().then(u => {
        if (!u?.phone) {
          setShowContactModal(true);
          setShowGuidelines(false);
        } else {
          setShowGuidelines(true);
        }
      });
      setShowForm(false);
      setAiGenerated(false);
      setFormData({
        name: '', price: '', promo_price: '', description: '', category: 'Mode', subcategory: '',
        stock_quantity: 1, sku: '', location: 'Port-au-Prince',
        image_url: '', image_alt: '', additional_images: [], taille_emballage: 'Moyen', delivery_time: '30-45 minutes',
        seo_tags: [], is_available: true, fb_category_id: null,
        product_attributes: { condition: 'new', color: '', size: '', material: '', gender: '', age_group: '', pattern: '', custom_labels: { label_0: '', label_1: '', label_2: '', label_3: '', label_4: '' } }
      });
    } else if (open && product) {
      setShowGuidelines(false);
      setShowForm(true);
      setAiGenerated(true); 
      setFormData({
        name: product.name || '',
        price: product.price || '',
        promo_price: product.promo_price || '',
        description: product.description || '',
        category: product.category || 'Mode',
        subcategory: product.subcategory || product.subCategory || '',
        stock_quantity: product.stock_quantity !== undefined ? product.stock_quantity : 1,
        sku: product.sku || '',
        location: product.location || 'Port-au-Prince',
        image_url: product.image_url || '',
        image_alt: product.image_alt || '',
        additional_images: product.additional_images || [],
        taille_emballage: product.taille_emballage || 'Moyen',
        delivery_time: product.delivery_time || '30-45 minutes',
        seo_tags: product.seo_tags || [],
        is_available: product.is_available !== false,
        fb_category_id: product.fb_category_id || null,
        product_attributes: product.product_attributes || {
          condition: 'new', color: '', size: '', material: '', gender: '', age_group: '', pattern: '',
          custom_labels: { label_0: '', label_1: '', label_2: '', label_3: '', label_4: '' }
        }
      });
    } else {
      setShowGuidelines(false);
      setShowForm(false);
      setAiGenerated(false);
    }
  }, [open, product]);

  useEffect(() => {
    if (formData.name && formData.image_url && !aiGenerated && !aiLoading && showForm) {
      handleGenerateWithAI();
    }
  }, [formData.name, formData.image_url, aiGenerated, aiLoading, showForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
     
    if (!formData.name || !formData.name.trim()) return toast.error('Le nom de l\'article est obligatoire');
    if (!formData.image_url) return toast.error('La photo de l\'article est obligatoire');
    if (!formData.price || formData.price <= 0) return toast.error('Le prix est obligatoire et doit être supérieur à 0');
    if (!shopId) return toast.error('Erreur: Boutique non identifiée');
     
    setLoading(true);
     
    try {
      const slug = formData.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 60);
      const dataWithSlug = { ...formData, slug: slug || undefined, image_alt: formData.image_alt || formData.name };

      if (product) {
        await base44.entities.Product.update(product.id, dataWithSlug);
        toast.success('Annonce mise à jour');
      } else {
        await base44.entities.Product.create({ ...dataWithSlug, shop_id: shopId });
        toast.success('Annonce publiée');
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
    toast.info('📸 Téléchargement et vérification en cours...');

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const scanResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyse cette image. Y a-t-il un numéro de téléphone visible (ex: +509, 509, 3xxxxxxx, 4xxxxxxx, numéro haïtien ou autre) écrit ou imprimé sur l'image ? Réponds UNIQUEMENT par JSON : {"has_phone": true/false, "reason": "..."}`,
        file_urls: [file_url],
        response_json_schema: { type: "object", properties: { has_phone: { type: "boolean" }, reason: { type: "string" } }, required: ["has_phone"] }
      });

      if (scanResult?.has_phone) {
        toast.error('🚫 Photo refusée : numéro de téléphone détecté. Veuillez supprimer le numéro de la photo avant de la publier.', { duration: 6000 });
        setLoading(false);
        return;
      }

      if (isAdditional || formData.image_url) {
        if (!formData.image_url) {
            setFormData(prev => ({ ...prev, image_url: file_url }));
        } else {
            setFormData(prev => ({ ...prev, additional_images: [...prev.additional_images, file_url] }));
        }
      } else {
        setFormData(prev => ({ ...prev, image_url: file_url }));
      }
    } catch (error) {
      toast.error('Erreur lors du téléchargement: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const removeImage = (isMain, idx = 0) => {
    if (isMain) {
        if (formData.additional_images.length > 0) {
            const newMain = formData.additional_images[0];
            const newAdd = formData.additional_images.slice(1);
            setFormData({ ...formData, image_url: newMain, additional_images: newAdd });
        } else {
            setFormData({ ...formData, image_url: '' });
        }
    } else {
        setFormData({ ...formData, additional_images: formData.additional_images.filter((_, i) => i !== idx) });
    }
  };

  const handleGenerateWithAI = async () => {
    if (!formData.name || !formData.image_url) return toast.error('Ajoutez un titre et une image d\'abord');

    setAiLoading(true);
    try {
      const taxonomyList = getTaxonomyMappingPrompt();
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es un expert en vision par ordinateur ET en e-commerce haïtien (RapidoPresto).

ÉTAPE 1 — ANALYSE VISUELLE DE LA PHOTO :
Examine attentivement l'image fournie. Identifie précisément :
- Le type d'objet principal visible (vêtement, appareil électronique, bijou, meuble, etc.)
- Les caractéristiques visuelles clés (couleur, forme, matière apparente, marque visible)
- Le contexte d'utilisation (cuisine, chambre, sport, cérémonie, etc.)

ÉTAPE 2 — CROISEMENT AVEC LE TITRE :
Titre du produit : "${formData.name}"
Utilise l'analyse visuelle ET le titre pour confirmer ou affiner ta compréhension du produit.

ÉTAPE 3 — CLASSIFICATION :
FB_CATEGORY_ID : Choisis l'ID numérique Facebook/Google Taxonomy le plus précis en te basant PRINCIPALEMENT sur ce que tu vois dans la photo :
${taxonomyList}
Retourne UNIQUEMENT le nombre entier (ex: 225 pour Smartphones, 211 pour Bagues, 195 pour chaussures femmes).

ÉTAPE 4 — RÉDACTION (FRANÇAIS uniquement) :
1. DESCRIPTION : 3-4 lignes, emojis, bénéfice client, urgence, CTA. Villes haïtiennes (Delmas, Cap-Haïtien, Gonaïves).
2. IMAGE_ALT : 15-20 mots décrivant la photo précisément (SEO français).
3. SEO_TAGS : EXACTEMENT 20 tags en français et créole UNIQUEMENT (zéro anglais). Inclure OBLIGATOIREMENT : "cap haitien", "port-au-prince", "gonaives", "haiti", "makarios bridal". Les 15 autres : synonymes larges du produit, occasions (mariage, fête, cérémonie, bal, graduation), matières, adjectifs (élégant, luxueux, unique, bèl), termes créoles (rad, mariaj, ansanm, chic, boutique mode haïti, tenue, style haïtien).

Réponds en JSON strict.`,
        file_urls: [formData.image_url],
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            fb_category_id: { type: "number" },
            seo_tags: { type: "array", items: { type: "string" } },
            image_alt: { type: "string" }
          },
          required: ["description", "fb_category_id", "seo_tags", "image_alt"]
        }
      });

      setFormData({
        ...formData,
        description: result.description || formData.description,
        seo_tags: result.seo_tags || formData.seo_tags,
        image_alt: result.image_alt || formData.image_alt,
        fb_category_id: result.fb_category_id || formData.fb_category_id,
      });
      
      setAiGenerated(true);
      toast.success('✨ Description, catégorie et tags générés par IA');
    } catch (error) {
      toast.error('Erreur IA: ' + error.message);
      setAiGenerated(true); 
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

  // Styles communs façon FB : Textes NOIRS et GRAS
  const inputClass = "w-full h-12 px-3 bg-white border border-slate-300 rounded-md text-[15px] font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400 placeholder:font-normal";
  const labelClass = "block text-sm font-bold text-slate-900 mb-1.5";

  return (
    <>
      <VendorContactModal
        open={showContactModal}
        onConfirm={async ({ phone, region }) => {
          await base44.auth.updateMe({ phone, region });
          setShowContactModal(false);
          setShowGuidelines(true);
        }}
        onCancel={() => { setShowContactModal(false); onClose?.(); }}
      />
      <ProductGuidelinesModal
        open={showGuidelines}
        onConfirm={() => {
          setShowGuidelines(false);
          setShowForm(true);
        }}
        onCancel={onClose}
      />
       
      <Dialog open={showForm} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl h-[100dvh] sm:h-[90vh] p-0 flex flex-col bg-[#F0F2F5] rounded-none sm:rounded-xl overflow-hidden border-0">
          
          {/* HEADER FB STYLE */}
          <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="flex items-center gap-3">
               <button type="button" onClick={onClose} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-slate-700">
                 <X className="w-6 h-6"/>
               </button>
               <h2 className="text-[17px] font-bold text-slate-900">
                 {product ? 'Modifier l\'annonce' : 'Nouvelle annonce'}
               </h2>
            </div>
            <Button 
                onClick={handleSubmit} 
                disabled={loading} 
                className="bg-[#0866FF] hover:bg-[#0054D1] text-white rounded-md px-5 h-9 font-bold text-[15px]"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publier'}
            </Button>
          </div>
        
          <div className="flex-1 overflow-y-auto pb-8">
            <form onSubmit={handleSubmit}>
              
              {/* SECTION 1: PHOTOS (Grille horizontale fluide) */}
              <div className="bg-white p-4 mb-2">
                <Label className={labelClass}>Photos <span className="text-slate-400 font-normal text-xs ml-1">· Ajouter jusqu'à 10 photos</span></Label>
                
                <div className="flex gap-2 overflow-x-auto pb-2 mt-2 scrollbar-hide">
                    {/* Bouton d'ajout */}
                    <label className="shrink-0 w-24 h-24 border border-slate-300 bg-slate-50 rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors">
                        <Camera className="w-6 h-6 text-slate-600 mb-1" />
                        <span className="text-xs font-bold text-slate-600">Ajouter</span>
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="hidden" />
                    </label>

                    {/* Image Principale */}
                    {formData.image_url && (
                        <div className="shrink-0 relative w-24 h-24 group rounded-md overflow-hidden border border-slate-200">
                            <img src={formData.image_url} alt="Main" className="w-full h-full object-cover" />
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] font-bold text-center py-0.5">PRINCIPALE</div>
                            <button type="button" onClick={() => removeImage(true)} className="absolute top-1 right-1 bg-white/80 rounded-full p-1 shadow-sm hover:bg-white text-slate-800">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}

                    {/* Images Additionnelles */}
                    {formData.additional_images.map((img, idx) => (
                        <div key={idx} className="shrink-0 relative w-24 h-24 group rounded-md overflow-hidden border border-slate-200">
                            <img src={img} alt={`Add ${idx}`} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeImage(false, idx)} className="absolute top-1 right-1 bg-white/80 rounded-full p-1 shadow-sm hover:bg-white text-slate-800">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
              </div>

              {/* SECTION 2: INFOS DE BASE (Titre, Prix, Catégorie, Etat, Description) */}
              <div className="bg-white p-4 mb-2 space-y-4 border-y border-slate-200">
                
                <div>
                  <Label className={labelClass}>Titre <span className="text-red-500">*</span></Label>
                  <Input className={inputClass} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  
                  {/* BOUTON MAGIE AI STRATÉGIQUEMENT PLACÉ SOUS LE TITRE */}
                  {formData.image_url && (
                    <Button 
                        type="button" 
                        onClick={handleGenerateWithAI} 
                        disabled={aiLoading || !formData.name}
                        className="w-full mt-2 bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 shadow-none font-bold h-10"
                    >
                        {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Générer les détails avec l'IA
                    </Button>
                  )}
                </div>

                <div>
                  <Label className={labelClass}>Prix (HTG) <span className="text-red-500">*</span></Label>
                  <Input type="number" min="0" className={inputClass} value={formData.price} onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || '' })} required />
                </div>

                <div>
                  <Label className={labelClass}>Catégorie</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mode">Vêtements et chaussures</SelectItem>
                      <SelectItem value="Electronics">Électronique</SelectItem>
                      <SelectItem value="Maison">Maison et jardin</SelectItem>
                      <SelectItem value="Mariage">Mariage</SelectItem>
                      <SelectItem value="Boutique Fleurs">Fleurs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className={labelClass}>État</Label>
                  <Select value={formData.product_attributes.condition} onValueChange={(v) => setFormData({ ...formData, product_attributes: { ...formData.product_attributes, condition: v }})}>
                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Neuf</SelectItem>
                      <SelectItem value="like_new">Occasion - Comme neuf</SelectItem>
                      <SelectItem value="good">Occasion - Bon état</SelectItem>
                      <SelectItem value="fair">Occasion - Assez bon état</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className={labelClass}>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={5}
                    className="w-full p-3 bg-white border border-slate-300 rounded-md text-[15px] font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400 placeholder:font-normal resize-none"
                    placeholder="Décrivez votre article..."
                  />
                </div>
              </div>

              {/* SECTION 3: LOCALISATION (Liée au système) */}
              <div className="bg-white p-4 mb-2 border-y border-slate-200">
                <Label className={labelClass}>Localisation (Point d'expédition)</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 z-10" />
                  <Select value={formData.location} onValueChange={(v) => setFormData({ ...formData, location: v })}>
                    <SelectTrigger className={`${inputClass} pl-10`}>
                      <SelectValue placeholder="Sélectionnez votre zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIONS.map(r => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SECTION 4: DÉTAILS D'INVENTAIRE & TAGS */}
              <div className="bg-white p-4 mb-2 space-y-4 border-y border-slate-200">
                
                <div>
                  <Label className={labelClass}>Mots-clés (Tags) <span className="text-slate-400 font-normal text-xs ml-1">· Optimise la recherche</span></Label>
                  <div className="flex gap-2 mb-2">
                    <Input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Ex: Robe" className="h-10 text-[15px] font-bold text-slate-900" />
                    <Button type="button" onClick={addTag} className="h-10 bg-slate-200 text-slate-800 hover:bg-slate-300 shadow-none font-bold px-4">Ajouter</Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {formData.seo_tags.map(tag => (
                        <span key={tag} onClick={() => removeTag(tag)} className="inline-flex items-center gap-1 px-3 py-1 bg-[#E4E6EB] text-slate-800 text-sm rounded-full font-bold cursor-pointer hover:bg-slate-300">
                            {tag} <X className="w-3 h-3" />
                        </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className={labelClass}>SKU (Référence)</Label>
                      <Input className={inputClass} value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} placeholder="Ref interne" />
                    </div>
                    <div>
                      <Label className={labelClass}>Disponibilité (Qté)</Label>
                      <Input type="number" min="0" className={inputClass} value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })} placeholder="1" />
                    </div>
                </div>

                {formData.stock_quantity > 0 ? (
                    <div className="bg-green-50 text-green-700 text-sm font-bold p-3 rounded-md flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500"></span> Indiqué comme en stock
                    </div>
                ) : (
                    <div className="bg-red-50 text-red-700 text-sm font-bold p-3 rounded-md flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500"></span> Rupture de stock
                    </div>
                )}
              </div>

              {/* SECTION 5: OPTIONS RAPIDO PRESTO (Emballage, Meta, Alt) */}
              <div className="bg-white p-4 border-t border-slate-200 space-y-4">
                  <h3 className="font-bold text-slate-800 text-base mb-2">Options Avancées de Livraison & Meta</h3>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-bold text-slate-700 mb-1 block">Taille colis</Label>
                      <Select value={formData.taille_emballage} onValueChange={(v) => setFormData({ ...formData, taille_emballage: v })}>
                        <SelectTrigger className="h-10 text-sm font-bold text-slate-900"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Petit">Petit</SelectItem>
                          <SelectItem value="Moyen">Moyen</SelectItem>
                          <SelectItem value="Grand">Grand</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs font-bold text-slate-700 mb-1 block">Délai estimé</Label>
                      <Select value={formData.delivery_time} onValueChange={(v) => setFormData({ ...formData, delivery_time: v })}>
                        <SelectTrigger className="h-10 text-sm font-bold text-slate-900"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30-45 minutes">30-45 min</SelectItem>
                          <SelectItem value="24 heures">24 heures</SelectItem>
                          <SelectItem value="3-5 jours">3-5 jours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-bold text-slate-700 mb-1 block">Prix Promo (Optionnel)</Label>
                    <Input type="number" className="h-10 text-sm font-bold text-slate-900" value={formData.promo_price} onChange={(e) => setFormData({ ...formData, promo_price: parseFloat(e.target.value) || null })} />
                  </div>

                  <div>
                     <Label className="text-xs font-bold text-slate-700 mb-1 block">Catégorie Meta Ads</Label>
                     <FbCategorySelector value={formData.fb_category_id} onChange={(id) => setFormData({ ...formData, fb_category_id: id })} />
                  </div>

                  <div>
                     <Label className="text-xs font-bold text-slate-700 mb-1 block">Texte Alternatif Image (SEO)</Label>
                     <Input className="h-10 text-sm font-bold text-slate-900" value={formData.image_alt} onChange={(e) => setFormData({ ...formData, image_alt: e.target.value })} />
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
                     <p className="text-xs font-bold text-slate-600 mb-2">Attributs Produit (Couleur, Taille...)</p>
                     <div className="grid grid-cols-2 gap-2">
                        <Input className="h-8 text-xs bg-white font-bold text-slate-900" placeholder="Couleur (ex: Rouge)" value={formData.product_attributes.color} onChange={(e) => setFormData({...formData, product_attributes: {...formData.product_attributes, color: e.target.value}})} />
                        <Input className="h-8 text-xs bg-white font-bold text-slate-900" placeholder="Taille (ex: XL)" value={formData.product_attributes.size} onChange={(e) => setFormData({...formData, product_attributes: {...formData.product_attributes, size: e.target.value}})} />
                     </div>
                  </div>

              </div>

            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}