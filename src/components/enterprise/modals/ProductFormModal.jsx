import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Loader2, Sparkles, X, Upload, Tag, Package, Truck, Smartphone, Image as ImageIcon, Info, CheckCircle, AlertCircle, Star } from 'lucide-react';
import ProductGuidelinesModal from './ProductGuidelinesModal';

export default function ProductFormModal({ product, shopId, open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
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
      setShowGuidelines(true);
      setShowForm(false);
      setFormData({
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
      setShowGuidelines(false);
      setShowForm(true);
      setFormData({
        name: product.name || '',
        price: product.price || '',
        promo_price: product.promo_price || '',
        description: product.description || '',
        category: product.category || 'Fastfood',
        subCategory: product.subCategory || '',
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
      if (product) {
        await base44.entities.Product.update(product.id, formData);
        toast.success('🎉 Article mis à jour avec succès');
      } else {
        await base44.entities.Product.create({ ...formData, shop_id: shopId });
        toast.success('✨ Article créé avec succès');
      }
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('❌ Erreur: ' + error.message);
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
        toast.success('✅ Image supplémentaire ajoutée');
      } else {
        setFormData({ ...formData, image_url: file_url });
        toast.success('📸 Photo principale téléchargée');
      }
    } catch (error) {
      toast.error('❌ Erreur lors du téléchargement');
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
      
      toast.success('🤖 Informations générées avec l\'IA');
    } catch (error) {
      toast.error('❌ Erreur IA: ' + error.message);
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

  const weddingSubCategories = [
    'Demoiselle d\'honneur',
    'Annonceuse',
    'Temoins',
    'Robe de Mariee',
    'Bague de Mariage',
    'Accessoires',
    'Carte & Programmation',
    'Materiels Decor'
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
        <DialogContent className="max-w-3xl max-h-[95vh] overflow-y-auto sm:max-w-[90vw] p-4 sm:p-6">
          <DialogHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl sm:text-2xl font-bold text-gray-800">
                {product ? '✏️ Modifier l\'article' : '🆕 Nouvel article'}
              </DialogTitle>
              {product && (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Existant
                </Badge>
              )}
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs sm:text-sm text-blue-700">
                  Remplissez les champs marqués d'une <span className="text-red-500 font-bold">*</span> pour créer votre article
                </p>
              </div>
            </div>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 mb-6 bg-gray-100 p-1">
              <TabsTrigger value="basic" className="data-[state=active]:bg-white">
                <Smartphone className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Informations</span>
                <span className="sm:hidden">Infos</span>
              </TabsTrigger>
              <TabsTrigger value="media" className="data-[state=active]:bg-white">
                <ImageIcon className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Médias</span>
                <span className="sm:hidden">Photos</span>
              </TabsTrigger>
              <TabsTrigger value="advanced" className="data-[state=active]:bg-white">
                <Star className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Avancé</span>
                <span className="sm:hidden">+</span>
              </TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <TabsContent value="basic" className="space-y-6 mt-0">
                <Card className="border-2 border-blue-50">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                          <span>Nom de l'article</span>
                          <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Ex: Pizza Margherita extra cheese"
                          className="h-12 text-base"
                          required
                        />
                        <p className="text-xs text-gray-500 mt-2">
                          Donnez un nom clair et attractif à votre produit
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                            <span>Prix (HTG)</span>
                            <span className="text-red-500">*</span>
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={formData.price}
                              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || '' })}
                              required
                              min="1"
                              className="h-12 pl-10"
                            />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">HTG</span>
                          </div>
                        </div>
                        
                        <div>
                          <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">Optionnel</span>
                            <span>Prix promo</span>
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={formData.promo_price}
                              onChange={(e) => setFormData({ ...formData, promo_price: parseFloat(e.target.value) || null })}
                              className="h-12 pl-10 border-dashed"
                            />
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">HTG</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                          <span>Description</span>
                          {formData.description && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </Label>
                        <Textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={4}
                          placeholder="Décrivez votre produit de manière attractive... (Sera générée automatiquement avec l'IA)"
                          className="resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                            <Package className="w-4 h-4" />
                            <span>Type d'article</span>
                          </Label>
                          <Select 
                            value={formData.category} 
                            onValueChange={(v) => setFormData({ ...formData, category: v, subCategory: v === 'Mariage' ? formData.subCategory : '' })}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Fastfood">🍔 Fastfood</SelectItem>
                              <SelectItem value="Restaurants">🍽️ Restaurants</SelectItem>
                              <SelectItem value="Boutique Fleurs">💐 Boutique Fleurs</SelectItem>
                              <SelectItem value="Pharmacie">💊 Pharmacie</SelectItem>
                              <SelectItem value="Mariage">💍 Mariage</SelectItem>
                              <SelectItem value="Epicerie">🛒 Épicerie</SelectItem>
                              <SelectItem value="Café">☕ Café</SelectItem>
                              <SelectItem value="Pour Femme">👚 Pour Femme</SelectItem>
                              <SelectItem value="Electronics">📱 Electronics</SelectItem>
                              <SelectItem value="Pour homme">👔 Pour homme</SelectItem>
                              <SelectItem value="Maison">🏠 Maison</SelectItem>
                              <SelectItem value="Bébé">👶 Bébé</SelectItem>
                              <SelectItem value="Outils">🛠️ Outils</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                            <span>Stock disponible</span>
                          </Label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={formData.stock_quantity}
                              onChange={(e) => setFormData({ ...formData, stock_quantity: parseInt(e.target.value) || 0 })}
                              className="h-12"
                            />
                            {formData.stock_quantity === 0 && (
                              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                <Badge variant="destructive" className="text-xs">Épuisé</Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {formData.category === 'Mariage' && (
                        <div className="animate-fadeIn">
                          <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                            <span>💍 Sous-catégorie Mariage</span>
                          </Label>
                          <Select 
                            value={formData.subCategory} 
                            onValueChange={(v) => setFormData({ ...formData, subCategory: v })}
                          >
                            <SelectTrigger className="h-12">
                              <SelectValue placeholder="Sélectionner une sous-catégorie" />
                            </SelectTrigger>
                            <SelectContent>
                              {weddingSubCategories.map((subCat) => (
                                <SelectItem key={subCat} value={subCat}>
                                  {subCat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Truck className="w-5 h-5 text-green-600" />
                      <h3 className="font-semibold text-gray-800">Livraison et emballage</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-700 mb-2 block">Taille d'emballage</Label>
                        <Select value={formData.taille_emballage} onValueChange={(v) => setFormData({ ...formData, taille_emballage: v })}>
                          <SelectTrigger className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Petit">📦 Petit</SelectItem>
                            <SelectItem value="Moyen">📦 Moyen</SelectItem>
                            <SelectItem value="Grand">📦 Grand</SelectItem>
                            <SelectItem value="Lourd">⚖️ Lourd</SelectItem>
                            <SelectItem value="Encombrant">🚚 Encombrant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-gray-700 mb-2 block">Délai de livraison</Label>
                        <Select value={formData.delivery_time} onValueChange={(v) => setFormData({ ...formData, delivery_time: v })}>
                          <SelectTrigger className="h-12">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30-45 minutes">⏱️ 30-45 minutes</SelectItem>
                            <SelectItem value="24 heures">📅 24 heures</SelectItem>
                            <SelectItem value="3-5 jours">📦 3-5 jours</SelectItem>
                            <SelectItem value="15 jours">🗓️ 15 jours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="media" className="space-y-6 mt-0">
                <Card className="border-2 border-purple-50">
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      <div>
                        <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                          <span>Photo principale</span>
                          <span className="text-red-500">*</span>
                          {formData.image_url && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                        </Label>
                        
                        <div className="space-y-4">
                          <div className="relative">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => handleImageUpload(e, false)} 
                              className="hidden"
                              id="main-image"
                              required={!formData.image_url}
                            />
                            <label
                              htmlFor="main-image"
                              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-purple-300 rounded-xl cursor-pointer bg-purple-50 hover:bg-purple-100 transition-colors"
                            >
                              {formData.image_url ? (
                                <div className="relative w-full h-full p-4">
                                  <img 
                                    src={formData.image_url} 
                                    alt="Preview" 
                                    className="w-full h-full object-contain rounded-lg"
                                  />
                                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                                    <Button
                                      type="button"
                                      variant="secondary"
                                      size="sm"
                                      className="bg-white/90 backdrop-blur-sm"
                                    >
                                      <Upload className="w-4 h-4 mr-2" />
                                      Changer la photo
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <Upload className="w-12 h-12 text-purple-500 mb-3" />
                                  <span className="text-purple-700 font-medium">Cliquez pour télécharger</span>
                                  <span className="text-sm text-gray-500 mt-1">PNG, JPG max 5MB</span>
                                </>
                              )}
                            </label>
                          </div>

                          {formData.image_url && (
                            <div className="flex items-center justify-center">
                              <Button
                                type="button"
                                onClick={handleGenerateWithAI}
                                disabled={aiLoading || !formData.name}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
                                size="lg"
                              >
                                {aiLoading ? (
                                  <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Génération IA...
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-5 h-5 mr-2" />
                                    Magie IA 🤖
                                  </>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label className="flex items-center gap-2 text-gray-700 font-medium mb-2">
                          <span>Images supplémentaires</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Optionnel</span>
                        </Label>
                        
                        <div className="space-y-4">
                          <div className="relative">
                            <input 
                              type="file" 
                              accept="image/*" 
                              onChange={(e) => handleImageUpload(e, true)} 
                              className="hidden"
                              id="additional-images"
                            />
                            <label
                              htmlFor="additional-images"
                              className="flex items-center justify-center w-full p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <div className="text-center">
                                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                <span className="text-gray-600 font-medium">Ajouter plus de photos</span>
                                <span className="text-sm text-gray-500 block mt-1">Maximum 10 images</span>
                              </div>
                            </label>
                          </div>

                          {formData.additional_images.length > 0 && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium text-gray-700">
                                  {formData.additional_images.length} image(s) supplémentaire(s)
                                </span>
                                <span className="text-xs text-gray-500">Glissez pour réorganiser</span>
                              </div>
                              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {formData.additional_images.map((img, idx) => (
                                  <div key={idx} className="relative group">
                                    <img 
                                      src={img} 
                                      alt={`Supplémentaire ${idx + 1}`} 
                                      className="w-full h-24 object-cover rounded-lg border-2 border-transparent group-hover:border-blue-500 transition-all"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                      <button
                                        type="button"
                                        onClick={() => setFormData({
                                          ...formData,
                                          additional_images: formData.additional_images.filter((_, i) => i !== idx)
                                        })}
                                        className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                      {idx + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6 mt-0">
                <Card className="border-2 border-yellow-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Tag className="w-5 h-5 text-yellow-600" />
                      <h3 className="font-semibold text-gray-800">Tags SEO (recherche)</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <Label className="text-gray-700 mb-2 block">
                          Ajoutez des mots-clés pour que vos clients vous trouvent facilement
                        </Label>
                        <div className="flex flex-col sm:flex-row gap-2 mb-3">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                            placeholder="Ex: pizza, italien, végétarien, livraison rapide"
                            className="h-12 flex-1"
                          />
                          <Button 
                            type="button" 
                            onClick={addTag} 
                            variant="outline"
                            className="h-12"
                          >
                            <Tag className="w-4 h-4 mr-2" />
                            Ajouter
                          </Button>
                        </div>
                      </div>

                      {formData.seo_tags.length > 0 ? (
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex flex-wrap gap-2">
                            {formData.seo_tags.map(tag => (
                              <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="cursor-pointer hover:bg-red-100 hover:text-red-800 transition-colors group pl-3 pr-2 py-1.5"
                                onClick={() => removeTag(tag)}
                              >
                                #{tag}
                                <X className="w-3 h-3 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center bg-gray-50">
                          <Tag className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">
                            Aucun tag ajouté. Ajoutez des mots-clés pour améliorer la visibilité.
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-indigo-50">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded">PRO</span>
                        <h3 className="font-semibold text-gray-800">Attributs pour catalogues</h3>
                      </div>
                      
                      <div className="bg-indigo-50 p-3 rounded-lg mb-4">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-indigo-700">
                            Ces informations améliorent la visibilité sur Facebook Ads et Google Shopping
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { key: 'color', label: 'Couleur', placeholder: 'Ex: Rouge, Bleu, Noir' },
                          { key: 'size', label: 'Taille', placeholder: 'Ex: S, M, L, XL' },
                          { key: 'material', label: 'Matière', placeholder: 'Ex: Coton, Polyester' },
                          { key: 'pattern', label: 'Motif', placeholder: 'Ex: Rayé, Uni, À pois' },
                        ].map(({ key, label, placeholder }) => (
                          <div key={key}>
                            <Label className="text-xs font-medium text-gray-600 mb-1">{label}</Label>
                            <Input
                              value={formData.product_attributes[key]}
                              onChange={(e) => setFormData({
                                ...formData,
                                product_attributes: { ...formData.product_attributes, [key]: e.target.value }
                              })}
                              placeholder={placeholder}
                              className="h-10 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <div className="sticky bottom-0 bg-white pt-4 border-t mt-8">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={onClose}
                    className="h-12 flex-1 border-2"
                  >
                    Annuler
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="h-12 flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Enregistrement...
                      </>
                    ) : product ? (
                      '💾 Mettre à jour'
                    ) : (
                      '✨ Créer l\'article'
                    )}
                  </Button>
                </div>
                
                <div className="flex items-center justify-center mt-4 gap-2 text-xs text-gray-500">
                  <div className={`w-3 h-3 rounded-full ${activeTab === 'basic' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${activeTab === 'media' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                  <div className={`w-3 h-3 rounded-full ${activeTab === 'advanced' ? 'bg-blue-500' : 'bg-gray-300'}`}></div>
                  <span className="ml-2">Étape {['basic', 'media', 'advanced'].indexOf(activeTab) + 1}/3</span>
                </div>
              </div>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}