import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Upload, Eye, Save, X, ImagePlus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

// Catégories officielles Facebook Product Catalog
const FB_CATEGORIES = [
  { value: "Apparel & Accessories", label: "Vêtements & Accessoires", subs: ["Chaussures", "Sacs & Bagages", "Bijoux", "Montres", "Vêtements Femme", "Vêtements Homme", "Vêtements Enfant"] },
  { value: "Arts & Entertainment", label: "Arts & Divertissement", subs: ["Livres", "Musique", "Films & TV"] },
  { value: "Baby & Toddler", label: "Bébé & Nourrisson", subs: ["Vêtements Bébé", "Jouets Bébé", "Alimentation Bébé"] },
  { value: "Beauty & Personal Care", label: "Beauté & Soins", subs: ["Maquillage", "Soins Peau", "Parfums", "Soins Cheveux"] },
  { value: "Electronics", label: "Électronique", subs: ["Téléphones", "Ordinateurs", "Tablettes", "Accessoires Audio", "Caméras"] },
  { value: "Food, Beverages & Tobacco", label: "Alimentation & Boissons", subs: ["Épicerie", "Boissons", "Snacks"] },
  { value: "Furniture", label: "Mobilier", subs: ["Chambre", "Salon", "Cuisine", "Bureau"] },
  { value: "Hardware", label: "Quincaillerie & Outils", subs: ["Outils", "Matériaux Construction"] },
  { value: "Health & Beauty", label: "Santé & Beauté", subs: ["Vitamines", "Médicaments", "Équipement Médical"] },
  { value: "Home & Garden", label: "Maison & Jardin", subs: ["Décoration", "Jardin", "Cuisine & Table", "Literie"] },
  { value: "Jewelry", label: "Bijouterie", subs: ["Colliers", "Bagues", "Bracelets", "Boucles d'oreilles"] },
  { value: "Sporting Goods", label: "Articles de Sport", subs: ["Fitness", "Sports Plein Air", "Sports Aquatiques"] },
  { value: "Toys & Games", label: "Jouets & Jeux", subs: ["Jouets Enfants", "Jeux de Société", "Jeux Vidéo"] },
  { value: "Vehicles & Parts", label: "Véhicules & Pièces", subs: ["Pièces Auto", "Accessoires Moto"] },
  { value: "Wedding", label: "Mariage & Événements", subs: ["Robes de Mariée", "Décoration Mariage", "Fleurs", "Accessoires Mariage", "Faire-part"] },
  { value: "Flowers & Plants", label: "Fleurs & Plantes", subs: ["Bouquets", "Plantes d'Intérieur", "Arrangements Floraux"] },
];

const CONDITIONS = ["new", "refurbished", "used"];
const CONDITION_LABELS = { new: "Neuf", refurbished: "Reconditionné", used: "Occasion" };

const APP_CATEGORIES = [
  "Fastfood", "Restaurants", "Boutique Fleurs", "Pharmacie", "Mariage",
  "Epicerie", "Café", "Pour Femme", "Electronics", "Pour homme",
  "Maison", "Bébé", "Outils", "Bijoux", "Matériels Décor"
];

const createEmptyRow = () => ({
  id: Date.now() + Math.random(),
  images: [],
  name: '',
  price: '',
  promo_price: '',
  category: '',
  fb_category: '',
  fb_subcategory: '',
  condition: 'new',
  stock_quantity: '',
  is_available: true,
  brand: '',
  errors: {},
  uploading: false,
});

export default function BulkUploadModal({ open, onClose, shopId, shopName, onSuccess }) {
  const [rows, setRows] = useState([createEmptyRow()]);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRefs = useRef({});

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      // Réinitialiser sous-catégorie si catégorie FB change
      if (field === 'fb_category') updated.fb_subcategory = '';
      // Validation en temps réel
      updated.errors = validateRow(updated);
      return updated;
    }));
  };

  const validateRow = (row) => {
    const errors = {};
    if (!row.name.trim()) errors.name = 'Nom requis';
    if (!row.price || isNaN(row.price) || Number(row.price) <= 0) errors.price = 'Prix invalide';
    if (row.promo_price && (isNaN(row.promo_price) || Number(row.promo_price) >= Number(row.price))) {
      errors.promo_price = 'Prix promo doit être < prix normal';
    }
    if (!row.category) errors.category = 'Catégorie requise';
    return errors;
  };

  const addRow = () => setRows(prev => [...prev, createEmptyRow()]);

  const removeRow = (id) => {
    if (rows.length === 1) return;
    setRows(prev => prev.filter(r => r.id !== id));
  };

  const handleImageUpload = async (rowId, files) => {
    if (!files || files.length === 0) return;
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, uploading: true } : r));
    
    const uploadedUrls = [];
    for (const file of Array.from(files)) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploadedUrls.push(file_url);
    }

    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const newImages = [...r.images, ...uploadedUrls].slice(0, 5); // max 5 images
      return { ...r, images: newImages, uploading: false };
    }));
  };

  const removeImage = (rowId, imgIdx) => {
    setRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return { ...r, images: r.images.filter((_, i) => i !== imgIdx) };
    }));
  };

  const isValid = rows.every(r => Object.keys(validateRow(r)).length === 0);

  const handleSave = async () => {
    // Valider toutes les lignes
    const validatedRows = rows.map(r => ({ ...r, errors: validateRow(r) }));
    setRows(validatedRows);
    if (!isValid) {
      toast.error('Corrigez les erreurs avant de sauvegarder');
      return;
    }

    setSaving(true);
    let saved = 0;
    for (const row of rows) {
      const fbCat = FB_CATEGORIES.find(c => c.value === row.fb_category);
      await base44.entities.Product.create({
        name: row.name.trim(),
        price: Number(row.price),
        promo_price: row.promo_price ? Number(row.promo_price) : undefined,
        category: row.category,
        stock_quantity: row.stock_quantity ? Number(row.stock_quantity) : 0,
        is_available: row.is_available,
        image_url: row.images[0] || '',
        additional_images: row.images.slice(1),
        shop_id: shopId,
        product_attributes: {
          condition: row.condition,
          custom_labels: {
            label_0: row.brand || '',
            label_1: row.fb_category || '',
            label_2: row.fb_subcategory || '',
          }
        },
        seo_tags: [row.brand, row.fb_subcategory || fbCat?.label].filter(Boolean),
      });
      saved++;
    }

    setSaving(false);
    toast.success(`${saved} article${saved > 1 ? 's' : ''} créé${saved > 1 ? 's' : ''} avec succès !`);
    onSuccess();
    onClose();
  };

  const fbSubcategories = (fbCat) => FB_CATEGORIES.find(c => c.value === fbCat)?.subs || [];

  const validCount = rows.filter(r => Object.keys(validateRow(r)).length === 0 && r.name).length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] w-full max-h-[96vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold">Ajout en masse d'articles</DialogTitle>
              <p className="text-sm text-slate-500 mt-0.5">Boutique : <span className="font-medium text-slate-700">{shopName}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={validCount === rows.length && rows[0].name ? "default" : "secondary"} className="text-xs">
                {validCount}/{rows.length} valides
              </Badge>
              <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
                <Eye className="w-4 h-4 mr-1" />
                {previewMode ? 'Éditer' : 'Aperçu'}
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto px-4 py-4">
          {previewMode ? (
            <PreviewGrid rows={rows} />
          ) : (
            <div className="space-y-3">
              {rows.map((row, idx) => (
                <RowEditor
                  key={row.id}
                  row={row}
                  idx={idx}
                  fbCategories={FB_CATEGORIES}
                  fbSubcategories={fbSubcategories}
                  appCategories={APP_CATEGORIES}
                  conditions={CONDITIONS}
                  conditionLabels={CONDITION_LABELS}
                  onUpdate={updateRow}
                  onRemove={removeRow}
                  onImageUpload={handleImageUpload}
                  onImageRemove={removeImage}
                  canRemove={rows.length > 1}
                  fileInputRef={el => fileInputRefs.current[row.id] = el}
                />
              ))}

              <Button variant="outline" onClick={addRow} className="w-full border-dashed border-2 h-12 text-slate-500 hover:text-slate-700">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter une ligne
              </Button>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 flex items-center justify-between shrink-0 bg-white">
          <div className="text-sm text-slate-500">
            {rows.length} article{rows.length > 1 ? 's' : ''} en attente
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={saving || !isValid || !rows[0].name}
              className="bg-orange-500 hover:bg-orange-600 min-w-[160px]"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sauvegarde...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Publier {rows.length} article{rows.length > 1 ? 's' : ''}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RowEditor({ row, idx, fbCategories, fbSubcategories, appCategories, conditions, conditionLabels, onUpdate, onRemove, onImageUpload, onImageRemove, canRemove, fileInputRef }) {
  const hasErrors = Object.keys(row.errors).length > 0 && row.name;
  const isComplete = Object.keys(row.errors).length === 0 && row.name;

  return (
    <div className={`bg-white border-2 rounded-xl p-4 transition-colors ${hasErrors ? 'border-red-200' : isComplete ? 'border-green-200' : 'border-slate-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isComplete ? 'bg-green-100 text-green-700' : hasErrors ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
          {isComplete ? <CheckCircle2 className="w-4 h-4" /> : hasErrors ? <AlertCircle className="w-4 h-4" /> : idx + 1}
        </div>
        <span className="text-sm font-medium text-slate-600 flex-1">{row.name || `Article ${idx + 1}`}</span>
        {canRemove && (
          <Button variant="ghost" size="icon" onClick={() => onRemove(row.id)} className="text-red-400 hover:text-red-600 h-7 w-7">
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-9 gap-3">
        {/* Images */}
        <div className="col-span-2 md:col-span-1">
          <label className="text-xs font-medium text-slate-500 mb-1 block">Images</label>
          <div className="flex flex-wrap gap-1">
            {row.images.map((img, i) => (
              <div key={i} className="relative w-12 h-12 rounded border overflow-hidden group">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button onClick={() => onImageRemove(row.id, i)} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                  <X className="w-3 h-3 text-white" />
                </button>
                {i === 0 && <div className="absolute bottom-0 left-0 right-0 bg-orange-500 text-white text-[8px] text-center">Principale</div>}
              </div>
            ))}
            {row.images.length < 5 && (
              <button
                onClick={() => fileInputRef?.click()}
                className="w-12 h-12 rounded border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-orange-400 hover:bg-orange-50 transition-colors"
              >
                {row.uploading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <ImagePlus className="w-4 h-4 text-slate-400" />}
              </button>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => onImageUpload(row.id, e.target.files)}
          />
        </div>

        {/* Nom */}
        <div className="col-span-2">
          <label className="text-xs font-medium text-slate-500 mb-1 block">Nom *</label>
          <Input
            value={row.name}
            onChange={(e) => onUpdate(row.id, 'name', e.target.value)}
            placeholder="Nom de l'article"
            className={`h-9 text-sm ${row.errors.name ? 'border-red-400' : ''}`}
          />
          {row.errors.name && <p className="text-xs text-red-500 mt-0.5">{row.errors.name}</p>}
        </div>

        {/* Prix */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Prix HTG *</label>
          <Input
            type="number"
            value={row.price}
            onChange={(e) => onUpdate(row.id, 'price', e.target.value)}
            placeholder="0"
            className={`h-9 text-sm ${row.errors.price ? 'border-red-400' : ''}`}
          />
          {row.errors.price && <p className="text-xs text-red-500 mt-0.5">{row.errors.price}</p>}
        </div>

        {/* Prix Promo */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Prix Vente</label>
          <Input
            type="number"
            value={row.promo_price}
            onChange={(e) => onUpdate(row.id, 'promo_price', e.target.value)}
            placeholder="Optionnel"
            className={`h-9 text-sm ${row.errors.promo_price ? 'border-red-400' : ''}`}
          />
          {row.errors.promo_price && <p className="text-xs text-red-500 mt-0.5">{row.errors.promo_price}</p>}
        </div>

        {/* Catégorie App */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Catégorie *</label>
          <Select value={row.category} onValueChange={(v) => onUpdate(row.id, 'category', v)}>
            <SelectTrigger className={`h-9 text-sm ${row.errors.category ? 'border-red-400' : ''}`}>
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              {appCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* FB Category */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Catégorie Facebook</label>
          <Select value={row.fb_category} onValueChange={(v) => onUpdate(row.id, 'fb_category', v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="FB Cat." />
            </SelectTrigger>
            <SelectContent>
              {fbCategories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* FB Sub-category */}
        {row.fb_category && (
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Sous-catégorie FB</label>
            <Select value={row.fb_subcategory} onValueChange={(v) => onUpdate(row.id, 'fb_subcategory', v)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Sous-cat." />
              </SelectTrigger>
              <SelectContent>
                {fbSubcategories(row.fb_category).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Condition */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Condition</label>
          <Select value={row.condition} onValueChange={(v) => onUpdate(row.id, 'condition', v)}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {conditions.map(c => <SelectItem key={c} value={c}>{conditionLabels[c]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Stock */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Stock</label>
          <Input
            type="number"
            value={row.stock_quantity}
            onChange={(e) => onUpdate(row.id, 'stock_quantity', e.target.value)}
            placeholder="0"
            className="h-9 text-sm"
          />
        </div>

        {/* Statut */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Statut</label>
          <Select value={row.is_available ? 'true' : 'false'} onValueChange={(v) => onUpdate(row.id, 'is_available', v === 'true')}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Disponible</SelectItem>
              <SelectItem value="false">Indisponible</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Marque */}
        <div>
          <label className="text-xs font-medium text-slate-500 mb-1 block">Marque</label>
          <Input
            value={row.brand}
            onChange={(e) => onUpdate(row.id, 'brand', e.target.value)}
            placeholder="Marque"
            className="h-9 text-sm"
          />
        </div>
      </div>
    </div>
  );
}

function PreviewGrid({ rows }) {
  const validRows = rows.filter(r => r.name && r.price);
  if (!validRows.length) {
    return <div className="text-center py-20 text-slate-400">Aucun article valide à prévisualiser</div>;
  }
  return (
    <div>
      <p className="text-sm text-slate-500 mb-4">{validRows.length} article{validRows.length > 1 ? 's' : ''} prêt{validRows.length > 1 ? 's' : ''} à publier</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {validRows.map((row, i) => (
          <div key={i} className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="aspect-square bg-slate-100 relative">
              {row.images[0] ? (
                <img src={row.images[0]} alt={row.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
              )}
              {row.images.length > 1 && (
                <div className="absolute top-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  +{row.images.length - 1}
                </div>
              )}
              <div className={`absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${row.is_available ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                {row.is_available ? 'Dispo' : 'Indispo'}
              </div>
            </div>
            <div className="p-2">
              <p className="text-xs font-semibold text-slate-800 truncate">{row.name}</p>
              {row.brand && <p className="text-[10px] text-slate-400">{row.brand}</p>}
              <div className="mt-1 flex items-baseline gap-1">
                {row.promo_price ? (
                  <>
                    <span className="text-sm font-bold text-orange-500">{Number(row.promo_price).toLocaleString()} HTG</span>
                    <span className="text-[10px] text-slate-400 line-through">{Number(row.price).toLocaleString()}</span>
                  </>
                ) : (
                  <span className="text-sm font-bold text-slate-800">{Number(row.price).toLocaleString()} HTG</span>
                )}
              </div>
              {row.fb_category && (
                <p className="text-[9px] text-blue-600 mt-0.5 truncate">FB: {row.fb_subcategory || row.fb_category}</p>
              )}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[9px] bg-slate-100 px-1 rounded">{CONDITION_LABELS[row.condition] || row.condition}</span>
                {row.stock_quantity && <span className="text-[9px] text-slate-500">Stock: {row.stock_quantity}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}