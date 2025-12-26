import React from 'react';
import { User, MapPin, CreditCard, Lock, LogOut } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

export default function AccountSection({ user, shop }) {
  const entrepriseData = user?.profiles?.entreprise || {};

  const handleLogout = () => {
    base44.auth.logout(createPageUrl('Home'));
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
          <Button variant="outline" size="sm" className="rounded-xl">
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
    </div>
  );
}