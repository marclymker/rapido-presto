import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload, X, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";

const CATEGORIES = [
  "Fastfood", "Mode", "Boutique Fleurs", "Pharmacie", "Mariage",
  "Epicerie", "Café", "Pour Femme", "Electronics", "Pour homme",
  "Maison", "Bébé", "Outils", "Bijoux", "Hotels/Piscine"
];

export default function QuickSellButton({ user }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    category: 'Pour Femme',
    image_url: '',
    phone: user?.phone || '',
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, image_url: result.file_url });
      toast.success('Image téléchargée');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price || !formData.phone) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setLoading(true);
    try {
      await base44.entities.Product.create({
        name: formData.name,
        price: parseFloat(formData.price),
        description: formData.description,
        category: formData.category,
        image_url: formData.image_url,
        shop_id: user.id,
        shop_name: user.full_name || 'Vendeur particulier',
        seller_phone: formData.phone,
        seller_type: 'individual',
        is_available: true,
        delivery_time: '24 heures',
        stock_quantity: 1
      });

      toast.success('Article publié avec succès!');
      setOpen(false);
      setFormData({
        name: '',
        price: '',
        description: '',
        category: 'Pour Femme',
        image_url: '',
        phone: user?.phone || '',
      });
    } catch (error) {
      toast.error('Erreur lors de la publication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          Vendre un article
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vendre un article</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Image Upload */}
          <div>
            <Label>Photo du produit *</Label>
            {formData.image_url ? (
              <div className="relative mt-2">
                <img 
                  src={formData.image_url} 
                  alt="Preview" 
                  className="w-full h-48 object-cover rounded-lg"
                />
                <button
                  onClick={() => setFormData({ ...formData, image_url: '' })}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <label className="mt-2 flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
                {uploadingImage ? (
                  <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-500">Cliquez pour télécharger</span>
                  </>
                )}
              </label>
            )}
          </div>

          {/* Product Name */}
          <div>
            <Label>Nom du produit *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Robe de soirée"
            />
          </div>

          {/* Price */}
          <div>
            <Label>Prix (HTG) *</Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="Ex: 5000"
            />
          </div>

          {/* Category */}
          <div>
            <Label>Catégorie</Label>
            <Select 
              value={formData.category} 
              onValueChange={(val) => setFormData({ ...formData, category: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez votre produit..."
              rows={3}
            />
          </div>

          {/* Phone */}
          <div>
            <Label>Téléphone de contact *</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+509 1234 5678"
            />
          </div>

          {/* Submit */}
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publication...
              </>
            ) : (
              'Publier mon article'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}