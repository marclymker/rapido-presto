import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Save, X, ImagePlus, Loader2, Sparkles, Info } from 'lucide-react';

const FB_CATEGORIES = [
  { value: "Apparel & Accessories > Women's Clothing", label: "Vêtements Femme", appCat: "Habillement et accessoires" },
  { value: "Apparel & Accessories > Men's Clothing", label: "Vêtements Homme", appCat: "Habillement et accessoires" },
  { value: "Apparel & Accessories > Shoes", label: "Chaussures", appCat: "Habillement et accessoires" },
  { value: "Apparel & Accessories > Jewelry", label: "Bijoux & Accessoires", appCat: "Habillement et accessoires" },
  { value: "Apparel & Accessories > Handbags", label: "Sacs & Bagages", appCat: "Habillement et accessoires" },
  { value: "Apparel & Accessories > Wedding", label: "Mariage & Robes", appCat: "Mariage" },
  { value: "Electronics > Mobile Phones", label: "Téléphones portables", appCat: "Électronique" },
  { value: "Electronics > Computers", label: "Ordinateurs", appCat: "Électronique" },
  { value: "Electronics > Audio", label: "Audio", appCat: "Électronique" },
  { value: "Electronics > Cameras", label: "Caméras", appCat: "Électronique" },
  { value: "Health & Beauty > Skin Care", label: "Soins de la peau", appCat: "Santé et beauté" },
  { value: "Health & Beauty > Makeup", label: "Maquillage", appCat: "Santé et beauté" },
  { value: "Health & Beauty > Hair Care", label: "Soins capillaires", appCat: "Santé et beauté" },
  { value: "Health & Beauty > Fragrances", label: "Parfums", appCat: "Santé et beauté" },
  { value: "Home & Garden > Furniture", label: "Mobilier", appCat: "Maison" },
  { value: "Home & Garden > Decor", label: "Décoration intérieure", appCat: "Maison" },
  { value: "Home & Garden > Kitchen", label: "Articles ménagers", appCat: "Maison" },
  { value: "Home & Garden > Plants", label: "Plantes & Fleurs", appCat: "Maison" },
  { value: "Food & Beverages > Groceries", label: "Épicerie", appCat: "Épicerie" },
  { value: "Food & Beverages > Beverages", label: "Boissons", appCat: "Épicerie" },
  { value: "Toys & Games > Baby", label: "Articles bébé & enfants", appCat: "Famille" },
  { value: "Sporting Goods", label: "Articles de sport", appCat: "Loisirs" },
  { value: "Hardware > Tools", label: "Outils & Quincaillerie", appCat: "Maison" },
  { value: "Food & Beverages > Restaurant", label: "Restauration", appCat: "Restauration" },
  { value: "Health > Pharmacy", label: "Pharmacie", appCat: "Pharmacie et santé" },
];

const generateSlug = (name) =>
  name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 60);

const createEmptyRow = () => ({
  id: Date.now() + Math.random(),
  image_url: '',
  image_alt: '',
  name: '',
  description: '',
  price: '',
  sale_price: '',
  fb_category: '',
  category: '',
  condition: 'new',
  availability: 'in stock',
  status: 'active',
  brand: '',
  seo_tags: [],
  uploading: false,
  aiLoading: false,
  aiDone: false,
  errors: {},
});

const validateRow = (row) => {
  const errors = {};
  if (!row.name.trim()) errors.name = 'Requis';
  if (!row.price || isNaN(row.price) || Number(row.price) <= 0) errors.price = 'Invalide';
  return errors;
};

export default function BulkUploadModal({ open, onClose, shopId, shopName, onSuccess }) {
  const [rows, setRows] = useState(() => Array.from({ length: 6 }, createEmptyRow));
  const [saving, setSaving] = useState(false);
  const [draggingOver, setDraggingOver] = useState(null);
  const fileInputRefs = useRef({});

  const updateRow = (id, fields) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...fields };
      updated.errors = validateRow(updated);
      return updated;
    }));
  };

  const addRow = () => setRows(prev => [...prev, createEmptyRow()]);
  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));

  const handleImageUpload = async (rowId, file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Fichier image requis'); return; }
    updateRow(rowId, { uploading: true });
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateRow(rowId, { image_url: file_url, uploading: false });
    } catch {
      updateRow(rowId, { uploading: false });
      toast.error('Erreur upload image');
    }
  };

  const handleDrop = (e, rowId) => {
    e.preventDefault();
    setDraggingOver(null);
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageUpload(rowId, file);
  };

  const handleMagieAI = async (rowId) => {
    const row = rows.find(r => r.id === rowId);
    if (!row.name.trim()) { toast.error('Ajoutez un titre d\'abord'); return; }
    if (!row.image_url) { toast.error('Ajoutez une image d\'abord'); return; }

    updateRow(rowId, { aiLoading: true });
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analysez ce produit à partir du titre "${row.name}" et de l'image fournie.

Générez en français:
1. Une description marketing puissante et détaillée (2-3 phrases percutantes)
2. La catégorie Facebook la plus précise parmi: ${FB_CATEGORIES.map(c => c.value).join(', ')}
3. La catégorie app correspondante parmi: Habillement et accessoires, Électronique, Maison, Famille, Santé et beauté, Épicerie, Loisirs, Mariage, Restauration, Pharmacie et santé
4. 7 à 10 tags SEO ultra-pertinents en français et créole haïtien pour maximiser la visibilité (mots-clés de recherche, synonymes, termes locaux haïtiens)
5. La marque si identifiable (sinon laisser vide)
6. Un texte ALT pour l'image (15-20 mots max, décrivant précisément l'image pour Google Images et l'accessibilité, en français)

Répondez en JSON strict.`,
        file_urls: [row.image_url],
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            fb_category: { type: "string" },
            category: { type: "string" },
            seo_tags: { type: "array", items: { type: "string" } },
            brand: { type: "string" },
            image_alt: { type: "string" }
          },
          required: ["description", "fb_category", "category", "seo_tags", "image_alt"]
        }
      });

      updateRow(rowId, {
        description: result.description || row.description,
        fb_category: result.fb_category || row.fb_category,
        category: result.category || row.category,
        seo_tags: result.seo_tags || row.seo_tags,
        brand: result.brand || row.brand,
        image_alt: result.image_alt || row.image_alt,
        aiLoading: false,
        aiDone: true,
      });
      toast.success('✨ IA terminée pour cet article');
    } catch (error) {
      updateRow(rowId, { aiLoading: false });
      toast.error('Erreur IA: ' + error.message);
    }
  };

  const filledRows = rows.filter(r => r.name.trim() && r.price);
  const validCount = filledRows.filter(r => Object.keys(validateRow(r)).length === 0).length;

  const handleSave = async () => {
    const toSave = rows.filter(r => r.name.trim() && r.price);
    if (!toSave.length) { toast.error('Aucun article à sauvegarder'); return; }
    const invalid = toSave.some(r => Object.keys(validateRow(r)).length > 0);
    if (invalid) { toast.error('Corrigez les erreurs d\'abord'); return; }

    setSaving(true);
    let saved = 0;
    for (const row of toSave) {
      const slug = generateSlug(row.name) + '-' + Date.now().toString(36);
      await base44.entities.Product.create({
        name: row.name.trim(),
        slug,
        description: row.description || '',
        price: Number(row.price),
        promo_price: row.sale_price ? Number(row.sale_price) : undefined,
        category: row.category || 'Habillement et accessoires',
        is_available: row.availability === 'in stock',
        image_url: row.image_url || '',
        image_alt: row.image_alt || row.name,
        shop_id: shopId,
        seo_tags: row.seo_tags || [],
        product_attributes: {
          condition: row.condition,
          custom_labels: { label_0: row.brand || '' }
        },
      });
      saved++;
    }

    setSaving(false);
    toast.success(`${saved} article${saved > 1 ? 's' : ''} créé${saved > 1 ? 's' : ''} !`);
    onSuccess();
    onClose();
  };

  const colClass = "px-3 py-2 border-r border-slate-100 bg-white align-top";
  const inputClass = "h-8 text-xs border-slate-200 text-slate-900 placeholder:text-slate-400";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[99vw] w-full max-h-[96vh] overflow-hidden flex flex-col p-0 rounded-xl">
        {/* Header */}
        <DialogHeader className="px-6 pt-4 pb-3 border-b shrink-0 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-bold text-slate-800">Ajout en masse — Facebook Shop</DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">{shopName} · {filledRows.length} article{filledRows.length !== 1 ? 's' : ''} rempli{filledRows.length !== 1 ? 's' : ''}</p>
            </div>
            <Badge className={validCount === filledRows.length && filledRows.length > 0 ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-600"}>
              {validCount}/{filledRows.length} valides
            </Badge>
          </div>
        </DialogHeader>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs border-collapse" style={{ minWidth: 1100 }}>
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                <th className="w-8 px-2 py-3 border-r border-slate-200"></th>
                <th className="w-28 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">
                  Image <span className="text-red-500">*</span>
                </th>
                <th className="w-44 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">
                  Titre <span className="text-red-500">*</span>
                </th>
                <th className="w-20 px-3 py-3 text-center font-semibold text-slate-600 border-r border-slate-200">
                  <div className="flex items-center justify-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                    <span>Magie AI</span>
                  </div>
                </th>
                <th className="w-56 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">
                  Description <span className="text-slate-400 font-normal">· via IA</span>
                </th>
                <th className="w-28 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">
                  Prix (HTG) <span className="text-red-500">*</span>
                </th>
                <th className="w-28 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">
                  Prix promo <span className="text-slate-400 font-normal">· Optionnel</span>
                </th>
                <th className="w-44 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">
                  Catégorie Facebook <span className="text-slate-400 font-normal">· via IA</span>
                </th>
                <th className="w-36 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">
                  Catégorie app <span className="text-slate-400 font-normal">· via IA</span>
                </th>
                <th className="w-28 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">Condition</th>
                <th className="w-28 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">Disponibilité</th>
                <th className="w-24 px-3 py-3 text-left font-semibold text-slate-600">Statut</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const hasError = Object.keys(row.errors).length > 0 && row.name;
                return (
                  <tr key={row.id} className={`border-b border-slate-100 transition-colors ${hasError ? 'bg-red-50/60' : 'hover:bg-blue-50/20'}`}>
                    {/* Remove */}
                    <td className="w-8 px-2 text-center border-r border-slate-100 align-middle">
                      <button
                        onClick={() => rows.length > 1 && removeRow(row.id)}
                        className="text-slate-300 hover:text-red-400 transition-colors"
                        disabled={rows.length === 1}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>

                    {/* Image */}
                    <td className={colClass}>
                      <div
                        onDragOver={e => { e.preventDefault(); setDraggingOver(row.id); }}
                        onDragLeave={() => setDraggingOver(null)}
                        onDrop={e => handleDrop(e, row.id)}
                      >
                        {row.image_url ? (
                          <div className={`relative w-16 h-16 rounded border-2 overflow-hidden group ${draggingOver === row.id ? 'border-blue-400 border-dashed' : 'border-transparent'}`}>
                            <img src={row.image_url} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => updateRow(row.id, { image_url: '', aiDone: false })}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => fileInputRefs.current[row.id]?.click()}
                            className={`w-16 h-16 rounded border-2 border-dashed flex flex-col items-center justify-center transition-colors text-center gap-0.5
                              ${draggingOver === row.id
                                ? 'border-blue-500 bg-blue-50 scale-105'
                                : 'border-slate-300 hover:border-blue-400 hover:bg-blue-50'
                              }`}
                          >
                            {row.uploading
                              ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                              : <>
                                  <ImagePlus className="w-4 h-4 text-slate-400" />
                                  <span className="text-[8px] text-slate-400 leading-tight">Glisser<br/>ou cliquer</span>
                                </>
                            }
                          </button>
                        )}
                      </div>
                      <input
                        type="file" accept="image/*" className="hidden"
                        ref={el => fileInputRefs.current[row.id] = el}
                        onChange={e => handleImageUpload(row.id, e.target.files?.[0])}
                      />
                    </td>

                    {/* Title */}
                    <td className={colClass}>
                      <Input
                        value={row.name}
                        onChange={e => updateRow(row.id, { name: e.target.value })}
                        placeholder="Titre de l'article"
                        className={`h-8 text-xs text-slate-900 placeholder:text-slate-400 border-slate-200 ${row.errors.name ? 'border-red-400 focus-visible:ring-red-300' : ''}`}
                      />
                    </td>

                    {/* Magie AI */}
                    <td className="px-2 py-2 border-r border-slate-100 bg-white text-center align-middle">
                      <Button
                        size="sm"
                        disabled={row.aiLoading || !row.name.trim() || !row.image_url}
                        onClick={() => handleMagieAI(row.id)}
                        className={`h-8 px-2 text-xs ${row.aiDone ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-300' : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'}`}
                        title={!row.name.trim() || !row.image_url ? 'Ajoutez titre et image' : 'Générer avec IA'}
                      >
                        {row.aiLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : row.aiDone ? (
                          <span>✓ Fait</span>
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </td>

                    {/* Description */}
                    <td className={colClass}>
                      <Input
                        value={row.description}
                        onChange={e => updateRow(row.id, { description: e.target.value })}
                        placeholder={row.aiDone ? '' : 'Générée par IA ✨'}
                        className="h-8 text-xs text-slate-900 placeholder:text-slate-400 border-slate-200"
                      />
                      {row.seo_tags?.length > 0 && (
                        <div className="flex flex-wrap gap-0.5 mt-1">
                          {row.seo_tags.slice(0, 3).map(t => (
                            <span key={t} className="text-[9px] bg-purple-50 text-purple-600 px-1 rounded">{t}</span>
                          ))}
                          {row.seo_tags.length > 3 && <span className="text-[9px] text-slate-400">+{row.seo_tags.length - 3}</span>}
                        </div>
                      )}
                    </td>

                    {/* Price */}
                    <td className={colClass}>
                      <Input
                        type="number"
                        value={row.price}
                        onChange={e => updateRow(row.id, { price: e.target.value })}
                        placeholder="0"
                        className={`h-8 text-xs text-slate-900 placeholder:text-slate-400 border-slate-200 ${row.errors.price ? 'border-red-400' : ''}`}
                      />
                    </td>

                    {/* Sale price */}
                    <td className={colClass}>
                      <Input
                        type="number"
                        value={row.sale_price}
                        onChange={e => updateRow(row.id, { sale_price: e.target.value })}
                        placeholder="0"
                        className="h-8 text-xs text-slate-900 placeholder:text-slate-400 border-slate-200"
                      />
                    </td>

                    {/* FB Category */}
                    <td className={colClass}>
                      <Select value={row.fb_category} onValueChange={v => updateRow(row.id, { fb_category: v })}>
                        <SelectTrigger className="h-8 text-xs text-slate-900 border-slate-200">
                          <SelectValue placeholder={row.aiDone ? '—' : 'Via IA ✨'} />
                        </SelectTrigger>
                        <SelectContent>
                          {FB_CATEGORIES.map(c => (
                            <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* App Category */}
                    <td className={colClass}>
                      <Select value={row.category} onValueChange={v => updateRow(row.id, { category: v })}>
                        <SelectTrigger className="h-8 text-xs text-slate-900 border-slate-200">
                          <SelectValue placeholder={row.aiDone ? '—' : 'Via IA ✨'} />
                        </SelectTrigger>
                        <SelectContent>
                          {["Habillement et accessoires","Électronique","Maison","Famille","Santé et beauté","Épicerie","Loisirs","Jardin et extérieur","Mariage","Restauration","Pharmacie et santé"].map(c => (
                            <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Condition */}
                    <td className={colClass}>
                      <Select value={row.condition} onValueChange={v => updateRow(row.id, { condition: v })}>
                        <SelectTrigger className="h-8 text-xs text-slate-900 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new" className="text-xs">Neuf</SelectItem>
                          <SelectItem value="refurbished" className="text-xs">Reconditionné</SelectItem>
                          <SelectItem value="used" className="text-xs">Occasion</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Availability */}
                    <td className={colClass}>
                      <Select value={row.availability} onValueChange={v => updateRow(row.id, { availability: v })}>
                        <SelectTrigger className="h-8 text-xs text-slate-900 border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in stock" className="text-xs">En stock</SelectItem>
                          <SelectItem value="out of stock" className="text-xs">Hors stock</SelectItem>
                          <SelectItem value="preorder" className="text-xs">Précommande</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2 bg-white align-top">
                      <Select value={row.status} onValueChange={v => updateRow(row.id, { status: v })}>
                        <SelectTrigger className="h-8 text-xs border-slate-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className="text-xs">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block" />Actif</span>
                          </SelectItem>
                          <SelectItem value="inactive" className="text-xs">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-300 rounded-full inline-block" />Inactif</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Add row */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <Button variant="outline" size="sm" onClick={addRow} className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nouvelle ligne
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 flex items-center justify-between shrink-0 bg-white">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{filledRows.length}</span> article{filledRows.length !== 1 ? 's' : ''} · <span className="text-green-600 font-semibold">{validCount}</span> valide{validCount !== 1 ? 's' : ''} · Le slug et l'ID sont générés automatiquement
          </p>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
            <Button
              onClick={handleSave}
              disabled={saving || filledRows.length === 0}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sauvegarde...</>
              ) : (
                <><Save className="w-4 h-4 mr-2" />Publier {filledRows.length} article{filledRows.length !== 1 ? 's' : ''}</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}