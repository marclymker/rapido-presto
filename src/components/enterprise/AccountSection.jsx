import React, { useState } from 'react';
import { User, MapPin, CreditCard, Lock, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AccountSection({ user, shop }) {
  const entrepriseData = user?.profiles?.entreprise || {};
  const [editModal, setEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState(null);

  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Home'));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let logo_url = entrepriseData.company_logo_url;
      
      if (logoFile) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: logoFile });
        logo_url = file_url;
      }

      await base44.auth.updateMe({
        profiles: {
          ...user.profiles,
          entreprise: {
            ...entrepriseData,
            company_logo_url: logo_url
          }
        }
      });

      if (shop) {
        await base44.entities.Shop.update(shop.id, { company_logo_url: logo_url });
      }

      toast.success('Profil mis à jour');
      setEditModal(false);
      window.location.reload();
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h2 className="text-2xl font-black mb-6 text-gray-900">Mon Compte</h2>
      
      {/* Photo de profil */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        <div className="flex items-center gap-4 pb-4 border-b">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-3xl overflow-hidden">
            {entrepriseData.company_logo_url ? (
              <img src={entrepriseData.company_logo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              '📸'
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg text-gray-900">{entrepriseData.company_name}</p>
            <p className="text-sm text-gray-500">{entrepriseData.company_category}</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setEditModal(true)}
            className="rounded-xl"
          >
            Modifier
          </Button>
        </div>
      </div>

      {/* Informations */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border space-y-4">
        <h3 className="font-bold text-gray-900 mb-4">Informations de l'entreprise</h3>
        
        <div className="flex items-start gap-4 py-3 border-b">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Propriétaire</label>
            <p className="font-medium text-gray-900">{user?.full_name || user?.email}</p>
          </div>
        </div>

        <div className="flex items-start gap-4 py-3 border-b">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <MapPin className="w-5 h-5 text-purple-600" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Adresse</label>
            <p className="font-medium text-gray-900">
              {shop?.region || entrepriseData.region || 'Non définie'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-4 py-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Méthode de paiement</label>
            <p className="font-medium text-green-600">
              {shop?.bank_name ? `${shop.bank_name}: ${shop.account_number}` : 'Non configuré'}
            </p>
          </div>
        </div>
      </div>

      {/* Sécurité */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border space-y-3">
        <h3 className="font-bold text-gray-900 mb-4">Sécurité</h3>
        
        <Button variant="outline" className="w-full justify-start gap-3 py-6 rounded-xl">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Lock className="w-5 h-5 text-gray-600" />
          </div>
          <span className="font-medium">Changer le mot de passe</span>
        </Button>

        <Button 
          variant="outline" 
          onClick={handleLogout}
          className="w-full justify-start gap-3 py-6 rounded-xl text-red-600 border-red-200 hover:bg-red-50"
        >
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <LogOut className="w-5 h-5 text-red-600" />
          </div>
          <span className="font-medium">Se déconnecter</span>
        </Button>
      </div>

      <Dialog open={editModal} onOpenChange={setEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le profil</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <Label>Logo de l'entreprise</Label>
              <input 
                type="file" 
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0])}
                className="w-full"
              />
              {entrepriseData.company_logo_url && !logoFile && (
                <img src={entrepriseData.company_logo_url} alt="" className="mt-2 h-20 w-20 object-cover rounded-lg" />
              )}
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setEditModal(false)} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" disabled={loading} className="flex-1 bg-blue-600">
                Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}