import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Trash2, Save, X, ImagePlus, Loader2, Info } from 'lucide-react';

// Catégories officielles Facebook Product Catalog
const FB_CATEGORIES = [
  { value: "Apparel & Accessories > Women's Clothing", label: "Vêtements Femme" },
  { value: "Apparel & Accessories > Men's Clothing", label: "Vêtements Homme" },
  { value: "Apparel & Accessories > Shoes", label: "Chaussures" },
  { value: "Apparel & Accessories > Jewelry", label: "Bijoux & Accessoires" },
  { value: "Apparel & Accessories > Handbags", label: "Sacs & Bagages" },
  { value: "Apparel & Accessories > Wedding", label: "Mariage & Robes" },
  { value: "Electronics > Mobile Phones", label: "Téléphones portables" },
  { value: "Electronics > Computers", label: "Ordinateurs" },
  { value: "Electronics > Audio", label: "Audio" },
  { value: "Electronics > Cameras", label: "Caméras" },
  { value: "Health & Beauty > Skin Care", label: "Soins de la peau" },
  { value: "Health & Beauty > Makeup", label: "Maquillage" },
  { value: "Health & Beauty > Hair Care", label: "Soins capillaires" },
  { value: "Health & Beauty > Fragrances", label: "Parfums" },
  { value: "Home & Garden > Furniture", label: "Mobilier" },
  { value: "Home & Garden > Decor", label: "Décoration intérieure" },
  { value: "Home & Garden > Kitchen", label: "Articles ménagers" },
  { value: "Home & Garden > Plants", label: "Plantes & Fleurs" },
  { value: "Food & Beverages > Groceries", label: "Épicerie" },
  { value: "Food & Beverages > Beverages", label: "Boissons" },
  { value: "Toys & Games > Baby", label: "Articles bébé & enfants" },
  { value: "Sporting Goods", label: "Articles de sport" },
  { value: "Hardware > Tools", label: "Outils & Quincaillerie" },
];

const APP_CATEGORIES = [
  "Habillement et accessoires", "Électronique", "Maison", "Famille",
  "Santé et beauté", "Épicerie", "Loisirs", "Jardin et extérieur",
  "Fournitures de bureau", "Véhicules", "Mariage", "Restauration", "Pharmacie et santé"
];

const createEmptyRow = () => ({
  id: Date.now() + Math.random(),
  image_url: '',
  name: '',
  description: '',
  link: '',
  price: '',
  sale_price: '',
  fb_category: '',
  condition: 'new',
  availability: 'in stock',
  status: 'active',
  brand: '',
  content_id: '',
  category: '',
  uploading: false,
  errors: {},
});

const validateRow = (row) => {
  const errors = {};
  if (!row.name.trim()) errors.name = 'Requis';
  if (!row.price || isNaN(row.price) || Number(row.price) <= 0) errors.price = 'Invalide';
  return errors;
};

export default function BulkUploadModal({ open, onClose, shopId, shopName, onSuccess }) {
  const [rows, setRows] = useState(() => Array.from({ length: 8 }, createEmptyRow));
  const [saving, setSaving] = useState(false);
  const fileInputRefs = useRef({});

  const updateRow = (id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [field]: value };
      updated.errors = validateRow(updated);
      return updated;
    }));
  };

  const addRow = () => setRows(prev => [...prev, createEmptyRow()]);
  const removeRow = (id) => setRows(prev => prev.filter(r => r.id !== id));

  const handleImageUpload = async (rowId, file) => {
    if (!file) return;
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, uploading: true } : r));
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setRows(prev => prev.map(r => r.id === rowId ? { ...r, image_url: file_url, uploading: false } : r));
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
      const slug = row.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 60);
      await base44.entities.Product.create({
        name: row.name.trim(),
        description: row.description || '',
        price: Number(row.price),
        promo_price: row.sale_price ? Number(row.sale_price) : undefined,
        category: row.category || 'Habillement et accessoires',
        is_available: row.availability === 'in stock',
        image_url: row.image_url || '',
        shop_id: shopId,
        slug,
        seo_tags: [row.brand, row.fb_category].filter(Boolean),
        product_attributes: {
          condition: row.condition,
          custom_labels: { label_0: row.brand || '', label_1: row.content_id || '' }
        },
      });
      saved++;
    }

    setSaving(false);
    toast.success(`${saved} article${saved > 1 ? 's' : ''} créé${saved > 1 ? 's' : ''} !`);
    onSuccess();
    onClose();
  };

  const colClass = "px-3 py-2 border-r border-slate-100 bg-white";

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
            <div className="flex items-center gap-2">
              <Badge className={validCount === filledRows.length && filledRows.length > 0 ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-600"}>
                {validCount}/{filledRows.length} valides
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs border-collapse" style={{ minWidth: 1400 }}>
            {/* Column Headers */}
            <thead className="sticky top-0 z-20">
              <tr className="bg-slate-50 border-b-2 border-slate-200">
                <th className="w-8 px-2 py-3 text-left font-semibold text-slate-500 border-r border-slate-200"></th>
                <th className="w-28 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">
                  Images et vidéos <Info className="inline w-3 h-3 text-slate-400 ml-1" />
                </th>
                <th className="w-40 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">
                  Titre <Info className="inline w-3 h-3 text-slate-400 ml-1" />
                </th>
                <th className="w-48 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">Description</th>
                <th className="w-40 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">Lien</th>
                <th className="w-28 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">
                  Prix <Info className="inline w-3 h-3 text-slate-400 ml-1" />
                </th>
                <th className="w-28 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">
                  Prix de vente <span className="text-slate-400 font-normal">· Optionnel</span>
                </th>
                <th className="w-44 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">
                  Catégorie Facebook <span className="text-slate-400 font-normal">· Optionnel</span>
                </th>
                <th className="w-32 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">Catégorie app</th>
                <th className="w-28 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">Condition</th>
                <th className="w-28 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">Disponibilité</th>
                <th className="w-24 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">Statut</th>
                <th className="w-28 px-3 py-3 text-left font-semibold text-slate-600 border-r border-slate-200">
                  Marque <span className="text-slate-400 font-normal">· Optionnel</span>
                </th>
                <th className="w-28 px-3 py-3 text-left font-semibold text-slate-600">
                  Content ID <span className="text-slate-400 font-normal">· Optionnel</span>
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, idx) => {
                const hasError = Object.keys(row.errors).length > 0 && row.name;
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-slate-100 transition-colors ${hasError ? 'bg-red-50' : 'hover:bg-blue-50/30'}`}
                  >
                    {/* Row number + remove */}
                    <td className="w-8 px-2 text-center border-r border-slate-100">
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
                      <div className="flex items-center gap-1">
                        {row.image_url ? (
                          <div className="relative w-10 h-10 rounded border overflow-hidden group shrink-0">
                            <img src={row.image_url} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => updateRow(row.id, 'image_url', '')}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center"
                            >
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => fileInputRefs.current[row.id]?.click()}
                            className="w-10 h-10 rounded border-2 border-dashed border-slate-300 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors shrink-0"
                          >
                            {row.uploading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <ImagePlus className="w-4 h-4 text-slate-300" />}
                          </button>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          ref={el => fileInputRefs.current[row.id] = el}
                          onChange={e => handleImageUpload(row.id, e.target.files?.[0])}
                        />
                      </div>
                    </td>

                    {/* Title */}
                    <td className={colClass}>
                      <Input
                        value={row.name}
                        onChange={e => updateRow(row.id, 'name', e.target.value)}
                        placeholder="Entrer un titre court"
                        className={`h-8 text-xs border-0 shadow-none bg-transparent focus:ring-1 focus:ring-blue-400 px-0 ${row.errors.name ? 'ring-1 ring-red-400' : ''}`}
                      />
                    </td>

                    {/* Description */}
                    <td className={colClass}>
                      <Input
                        value={row.description}
                        onChange={e => updateRow(row.id, 'description', e.target.value)}
                        placeholder="Décrire les caractéristiques..."
                        className="h-8 text-xs border-0 shadow-none bg-transparent focus:ring-1 focus:ring-blue-400 px-0"
                      />
                    </td>

                    {/* Link */}
                    <td className={colClass}>
                      <Input
                        value={row.link}
                        onChange={e => updateRow(row.id, 'link', e.target.value)}
                        placeholder="https://exemple.com/item"
                        className="h-8 text-xs border-0 shadow-none bg-transparent focus:ring-1 focus:ring-blue-400 px-0"
                      />
                    </td>

                    {/* Price */}
                    <td className={colClass}>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-xs shrink-0">HTG</span>
                        <Input
                          type="number"
                          value={row.price}
                          onChange={e => updateRow(row.id, 'price', e.target.value)}
                          placeholder="0"
                          className={`h-8 text-xs border-0 shadow-none bg-transparent focus:ring-1 focus:ring-blue-400 px-1 ${row.errors.price ? 'ring-1 ring-red-400' : ''}`}
                        />
                      </div>
                    </td>

                    {/* Sale price */}
                    <td className={colClass}>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-400 text-xs shrink-0">HTG</span>
                        <Input
                          type="number"
                          value={row.sale_price}
                          onChange={e => updateRow(row.id, 'sale_price', e.target.value)}
                          placeholder="0"
                          className="h-8 text-xs border-0 shadow-none bg-transparent focus:ring-1 focus:ring-blue-400 px-1"
                        />
                      </div>
                    </td>

                    {/* FB Category */}
                    <td className={colClass}>
                      <Select value={row.fb_category} onValueChange={v => updateRow(row.id, 'fb_category', v)}>
                        <SelectTrigger className="h-8 text-xs border border-slate-200 bg-white">
                          <SelectValue placeholder="Sélectionner une catégorie" />
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
                      <Select value={row.category} onValueChange={v => updateRow(row.id, 'category', v)}>
                        <SelectTrigger className="h-8 text-xs border border-slate-200 bg-white">
                          <SelectValue placeholder="Catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          {APP_CATEGORIES.map(c => (
                            <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Condition */}
                    <td className={colClass}>
                      <Select value={row.condition} onValueChange={v => updateRow(row.id, 'condition', v)}>
                        <SelectTrigger className="h-8 text-xs border border-slate-200 bg-white">
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
                      <Select value={row.availability} onValueChange={v => updateRow(row.id, 'availability', v)}>
                        <SelectTrigger className="h-8 text-xs border border-slate-200 bg-white">
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
                    <td className={colClass}>
                      <Select value={row.status} onValueChange={v => updateRow(row.id, 'status', v)}>
                        <SelectTrigger className="h-8 text-xs border border-slate-200 bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className="text-xs">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block" /> Actif</span>
                          </SelectItem>
                          <SelectItem value="inactive" className="text-xs">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-slate-300 rounded-full inline-block" /> Inactif</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    {/* Brand */}
                    <td className={colClass}>
                      <Input
                        value={row.brand}
                        onChange={e => updateRow(row.id, 'brand', e.target.value)}
                        placeholder="Marque"
                        className="h-8 text-xs border-0 shadow-none bg-transparent focus:ring-1 focus:ring-blue-400 px-0"
                      />
                    </td>

                    {/* Content ID */}
                    <td className="px-3 py-2 bg-white">
                      <Input
                        value={row.content_id}
                        onChange={e => updateRow(row.id, 'content_id', e.target.value)}
                        placeholder="ID"
                        className="h-8 text-xs border-0 shadow-none bg-transparent focus:ring-1 focus:ring-blue-400 px-0"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Add row button */}
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <Button
              variant="outline"
              size="sm"
              onClick={addRow}
              className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nouvelle ligne
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-3 flex items-center justify-between shrink-0 bg-white">
          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{filledRows.length}</span> article{filledRows.length !== 1 ? 's' : ''} rempli{filledRows.length !== 1 ? 's' : ''} · <span className="text-green-600 font-semibold">{validCount}</span> valide{validCount !== 1 ? 's' : ''}
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