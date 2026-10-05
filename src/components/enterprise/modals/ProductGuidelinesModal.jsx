import React from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from 'lucide-react';

export default function ProductGuidelinesModal({ open, onConfirm, onCancel }) {
  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="max-w-md">
        <div className="text-center py-4">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Consignes pour la création d'articles
          </h2>

          <div className="space-y-4 text-left">
            <div className="bg-orange-50 rounded-2xl p-4 flex items-start gap-3">
              <div className="text-2xl">📝</div>
              <div>
                <p className="font-semibold text-gray-900">Ajoute le Titre de votre article</p>
              </div>
            </div>

            <div className="bg-orange-50 rounded-2xl p-4 flex items-start gap-3">
              <div className="text-2xl">📷</div>
              <div>
                <p className="font-semibold text-gray-900">Ajoute Photos réelles de bonne qualité</p>
              </div>
            </div>

            <div className="bg-purple-50 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles className="w-6 h-6 text-purple-600 mt-1" />
              <div>
                <p className="font-semibold text-purple-900">Lancer avec Magie AI</p>
                <p className="text-sm text-purple-700">(génération automatique de la description et catégorie)</p>
              </div>
            </div>

            <div className="bg-orange-50 rounded-2xl p-4 flex items-start gap-3">
              <div className="text-2xl">💰</div>
              <div>
                <p className="font-semibold text-gray-900">Ajoute les Prix fixe obligatoire en Gourdes</p>
                <p className="text-sm text-gray-600">(aucune négociation possible avec les acheteurs)</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 mt-6">
            <Button
              onClick={onConfirm}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 rounded-2xl font-bold text-base"
            >
              J'ai compris
            </Button>
            <Button
              onClick={onCancel}
              variant="outline"
              className="w-full py-6 rounded-2xl font-semibold text-base"
            >
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
