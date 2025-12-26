import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, Store, CheckCircle, XCircle } from 'lucide-react';

export default function MerchantProfileAlert({ user }) {
  const [open, setOpen] = useState(false);
  const [missingFields, setMissingFields] = useState([]);

  useEffect(() => {
    if (!user) return;

    const entrepriseProfile = user.profiles?.entreprise;
    
    // Si le profil entreprise existe mais n'est pas actif ou incomplet
    if (entrepriseProfile && !entrepriseProfile.is_active) {
      const required = [
        { field: 'company_name', label: 'Nom de l\'entreprise' },
        { field: 'company_category', label: 'Catégorie' },
        { field: 'region', label: 'Région' },
        { field: 'phone', label: 'Téléphone' },
        { field: 'company_logo_url', label: 'Logo de l\'entreprise' }
      ];

      const missing = required.filter(item => !entrepriseProfile[item.field]);
      
      if (missing.length > 0) {
        setMissingFields(missing);
        
        // Vérifier si on a déjà affiché la popup récemment
        const lastShown = localStorage.getItem('merchantProfileAlertLastShown');
        const now = Date.now();
        
        if (!lastShown || now - parseInt(lastShown) >= 24 * 60 * 60 * 1000) {
          // Afficher après 2 secondes
          setTimeout(() => {
            setOpen(true);
            localStorage.setItem('merchantProfileAlertLastShown', now.toString());
          }, 2000);
        }
      }
    }
  }, [user]);

  if (!user || missingFields.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Store className="w-6 h-6 text-orange-500" />
            Complétez votre profil marchand
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800 mb-1">
                  💰 Commencez à gagner de l'argent !
                </p>
                <p className="text-sm text-slate-600">
                  Il vous manque quelques informations pour activer votre boutique et vendre vos produits.
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              Informations manquantes :
            </p>
            <div className="space-y-2">
              {missingFields.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <Link to={createPageUrl('ManageProfiles')} onClick={() => setOpen(false)}>
              <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-base">
                Compléter mon profil
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              className="w-full mt-2"
              onClick={() => setOpen(false)}
            >
              Plus tard
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}