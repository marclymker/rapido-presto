import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Mail, MapPin, Phone, CreditCard, Save } from 'lucide-react';
import { toast } from 'sonner';
import ProfileSwitcher from '@/components/profile/ProfileSwitcher';

export default function AgentAccount() {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    moncash_number: '',
    natcash_number: '',
    bank_account: ''
  });

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setFormData({
        full_name: u.full_name || '',
        email: u.email || '',
        phone: u.profiles?.agent?.phone || '',
        address: u.profiles?.agent?.address || '',
        moncash_number: u.profiles?.agent?.moncash_number || '',
        natcash_number: u.profiles?.agent?.natcash_number || '',
        bank_account: u.profiles?.agent?.bank_account || ''
      });
    }).catch(() => {});
  }, []);

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      await base44.auth.updateMe({
        full_name: data.full_name,
        profiles: {
          ...user.profiles,
          agent: {
            ...user.profiles?.agent,
            phone: data.phone,
            address: data.address,
            moncash_number: data.moncash_number,
            natcash_number: data.natcash_number,
            bank_account: data.bank_account
          }
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      toast.success('Profil mis à jour');
      setIsEditing(false);
      base44.auth.me().then(setUser);
    }
  });

  const handleSubmit = () => {
    updateMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 pb-24">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-black text-slate-900">Mon Compte</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold">
                {user?.full_name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div>
                <h2 className="text-xl font-bold">{user?.full_name}</h2>
                <p className="text-sm opacity-90">Agent de Vente</p>
              </div>
            </div>
          </div>

          {/* Switch Profile */}
          <div className="p-4 border-b border-slate-100">
            <Label className="text-xs text-slate-500 mb-2 block">Changer de profil</Label>
            <ProfileSwitcher user={user} />
          </div>

          {/* Informations */}
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-900">Informations personnelles</h3>
              {!isEditing && (
                <Button size="sm" onClick={() => setIsEditing(true)}>
                  Modifier
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label className="flex items-center gap-2 text-slate-700 mb-1">
                  <User className="w-4 h-4" />
                  Nom complet
                </Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-slate-50' : ''}
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 text-slate-700 mb-1">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  value={formData.email}
                  disabled
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-500 mt-1">L'email ne peut pas être modifié</p>
              </div>

              <div>
                <Label className="flex items-center gap-2 text-slate-700 mb-1">
                  <Phone className="w-4 h-4" />
                  Téléphone
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-slate-50' : ''}
                  placeholder="+509 1234 5678"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 text-slate-700 mb-1">
                  <MapPin className="w-4 h-4" />
                  Adresse
                </Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  disabled={!isEditing}
                  className={!isEditing ? 'bg-slate-50' : ''}
                  placeholder="Port-au-Prince, Haïti"
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Informations de paiement
              </h3>

              <div className="space-y-4">
                <div>
                  <Label className="text-slate-700 mb-1">Numéro MonCash</Label>
                  <Input
                    value={formData.moncash_number}
                    onChange={(e) => setFormData({...formData, moncash_number: e.target.value})}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-slate-50' : ''}
                    placeholder="xxxx xxxx"
                  />
                </div>

                <div>
                  <Label className="text-slate-700 mb-1">Numéro NatCash</Label>
                  <Input
                    value={formData.natcash_number}
                    onChange={(e) => setFormData({...formData, natcash_number: e.target.value})}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-slate-50' : ''}
                    placeholder="xxxx xxxx"
                  />
                </div>

                <div>
                  <Label className="text-slate-700 mb-1">Compte Bancaire (SOGEBANK)</Label>
                  <Input
                    value={formData.bank_account}
                    onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                    disabled={!isEditing}
                    className={!isEditing ? 'bg-slate-50' : ''}
                    placeholder="Numéro de compte"
                  />
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex gap-3 mt-6 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={updateMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Enregistrer
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full mt-4 text-red-600 hover:bg-red-50"
          onClick={() => base44.auth.logout()}
        >
          Déconnexion
        </Button>
      </div>
    </div>
  );
}
