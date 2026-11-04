import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User, Building2, Bike, Sparkles } from 'lucide-react';

export default function WelcomeModal({ user, open, onClose }) {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate(createPageUrl('ProfileSetup'));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="text-center py-6">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full mx-auto flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Bienvenue sur Kairos!
            </h2>
            <p className="text-gray-600">
              Bonjour <span className="font-semibold">{user?.full_name}</span>! 👋
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-6 mb-6">
            <p className="text-gray-700 font-medium mb-4">
              Pour continuer, veuillez compléter votre profil:
            </p>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-gray-700"><span className="font-bold">Client</span> - Commander et recevoir</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-700"><span className="font-bold">Entreprise</span> - Vendre vos produits</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <Bike className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-700"><span className="font-bold">Livreur</span> - Effectuer des livraisons</span>
              </div>
            </div>
          </div>

          <Button
            onClick={handleGetStarted}
            className="w-full bg-orange-500 hover:bg-orange-600 h-12 text-lg font-bold"
          >
            Compléter mon profil
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
