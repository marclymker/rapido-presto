import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Store, Trash2, Edit } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";

// MISE À JOUR : Liste standardisée des régions (Single Source of Truth)
const REGIONS = [
  "Port-au-Prince", "Kenscoff", "Pétion-Ville", "Delmas", "Tabarre",
  "Clercine", "Cité Soleil", "Croix des Bouquets", "Lilavois",
  "Fontamara", "Carrefour", "Gressier", "Léogâne",
  "Ennery", "L'Estère", "Gonaïves", "Plaine du Nord", "Vaudreuil",
  "Cap-Haïtien", "Madeline", "Limonade", "Pignon", "Hinche"
];

const categories = [
  "Fastfood", "Mode", "Boutique Fleurs", "Pharmacie", "Vêtements", 
  "Epicerie", "Café", "Boulangerie", "Pour Femme", "Electronics", "Pour homme", "Maison"
];

export default function AdminShops() {
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingShop, setEditingShop] = useState(null);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    company_name: '',
    company_category: '',
    region: '',
    company_logo_url: '',
    email: '',
    phone: '',
    opening_hours: '',
    account_number: '',
    bank_name: '',
    account_holder_name: '',
    user_id: ''
  });

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u.role !== 'admin') {
        window.location.href = '/';
      }
    }).catch(() => {
      window.location.href = '/';
    });
  }, []);

  const { data: shops = [] } = useQuery({
    queryKey: ['admin-shops'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('adminShops', { action: 'list' });
      return data.shops;
    },
    enabled: !!user
  });

  const { data: enterpriseUsers = [] } = useQuery({
    queryKey: ['enterprise-users'],
    queryFn: async () => {
      const { data } = await base44.functions.invoke('adminShops', { action: 'listEnterpriseUsers' });
      return data.users;
    },
    enabled: !!user
  });

  const createShopMutation = useMutation({
    mutationFn: async (shopData) => {
      const { data } = await base44.functions.invoke('adminShops', { action: 'create', data: shopData });
      return data.shop;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-shops']);
      toast.success('Boutique créée avec succès');
      setShowForm(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const updateShopMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const result = await base44.functions.invoke('adminShops', { action: 'update', shopId: id, data });
      return result.data.shop;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-shops']);
      toast.success('Boutique mise à jour');
      setShowForm(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erreur: ' + error.message);
    }
  });

  const deleteShopMutation = useMutation({
    mutationFn: async (id) => {
      await base44.functions.invoke('adminShops', { action: 'delete', shopId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-shops']);
      toast.success('Boutique supprimée');
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data } = await base44.functions.invoke('uploadFile', { file });
      setFormData({ ...formData, company_logo_url: data.file_url });
      toast.success('Image téléchargée');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    }
    setUploading(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.company_name || !formData.company_category || !formData.region) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const shopData = {
      company_name: formData.company_name,
      company_category: formData.company_category,
      region: formData.region,
      user_id: formData.user_id || user.id
    };

    // Add optional fields only if they have values
    if (formData.company_logo_url) shopData.company_logo_url = formData.company_logo_url;
    if (formData.email) shopData.email = formData.email;
    if (formData.phone) shopData.phone = formData.phone;
    if (formData.account_number) shopData.account_number = formData.account_number;
    if (formData.bank_name) shopData.bank_name = formData.bank_name;
    if (formData.account_holder_name) shopData.account_holder_name = formData.account_holder_name;
    
    if (editingShop) {
      updateShopMutation.mutate({ id: editingShop.id, data: shopData });
    } else {
      createShopMutation.mutate(shopData);
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      company_category: '',
      region: '',
      company_logo_url: '',
      email: '',
      phone: '',
      opening_hours: '',
      account_number: '',
      bank_name: '',
      account_holder_name: '',
      user_id: ''
    });
    setEditingShop(null);
  };

  const handleEdit = (shop) => {
    setEditingShop(shop);
    setFormData({
      company_name: shop.company_name || '',
      company_category: shop.company_category || '',
      region: shop.region || '',
      company_logo_url: shop.company_logo_url || '',
      email: shop.email || '',
      phone: shop.phone || '',
      opening_hours: shop.opening_hours || '',
      account_number: shop.account_number || '',
      bank_name: shop.bank_name || '',
      account_holder_name: shop.account_holder_name || '',
      user_id: shop.user_id || ''
    });
    setShowForm(true);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Gestion des Boutiques</h1>
          <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-orange-500 hover:bg-orange-600">
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une boutique
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shops.map(shop => (
            <Card key={shop.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center overflow-hidden">
                      {shop.company_logo_url ? (
                        <img src={shop.company_logo_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Store className="w-6 h-6 text-orange-500" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{shop.company_name}</CardTitle>
                      <p className="text-sm text-slate-500">{shop.company_category}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(shop)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteShopMutation.mutate(shop.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><strong>Région:</strong> {shop.region}</p>
                <p><strong>Email:</strong> {shop.email || 'Non renseigné'}</p>
                <p><strong>Téléphone:</strong> {shop.phone || 'Non renseigné'}</p>
                <p><strong>Horaires:</strong> {typeof shop.opening_hours === 'object' ? 'Configuré' : (shop.opening_hours || 'Non renseigné')}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {shops.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            Aucune boutique pour le moment
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingShop ? 'Modifier' : 'Ajouter'} une boutique</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nom de la boutique *</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  required
                />
              </div>

              <div className="col-span-2">
                <Label>Assigner à un utilisateur entreprise</Label>
                <Select value={formData.user_id} onValueChange={(val) => setFormData({ ...formData, user_id: val === "" ? "" : val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un utilisateur (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>Aucun utilisateur</SelectItem>
                    {enterpriseUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.full_name} ({u.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Catégorie *</Label>
                <Select value={formData.company_category} onValueChange={(val) => setFormData({ ...formData, company_category: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Région *</Label>
                <Select value={formData.region} onValueChange={(val) => setFormData({ ...formData, region: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    {REGIONS.map(reg => (
                      <SelectItem key={reg} value={reg}>{reg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div>
                <Label>Téléphone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label>Horaires</Label>
                <Textarea
                  value={formData.opening_hours}
                  onChange={(e) => setFormData({ ...formData, opening_hours: e.target.value })}
                  placeholder="Ex: Lun-Ven: 8h-18h, Sam: 9h-17h"
                />
              </div>

              <div className="col-span-2 border-t pt-4">
                <h3 className="font-semibold mb-3">Informations bancaires</h3>
              </div>

              <div>
                <Label>Numéro de compte</Label>
                <Input
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                />
              </div>

              <div>
                <Label>Nom de la banque</Label>
                <Input
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label>Nom du titulaire du compte</Label>
                <Input
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                />
              </div>

              <div className="col-span-2">
                <Label>Photo de profil</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                {formData.company_logo_url && (
                  <img src={formData.company_logo_url} alt="Preview" className="mt-2 h-20 w-20 object-cover rounded-lg" />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                Annuler
              </Button>
              <Button type="submit" className="bg-orange-500 hover:bg-orange-600">
                {editingShop ? 'Mettre à jour' : 'Créer'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}