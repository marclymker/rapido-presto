import React, { useState, useEffect } from 'react';
import { firebaseApi } from '@/api/firebaseClient';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Check, Crown, ArrowLeft, Zap } from 'lucide-react';
import { toast } from "sonner";

export default function Pricing() {
  const [user, setUser] = useState(null);
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    firebaseApi.auth.me().then(u => {
      setUser(u);
      // Fetch shop
      firebaseApi.entities.Shop.filter({ user_id: u.id }).then(shops => {
        if (shops.length > 0) setShop(shops[0]);
      });
    }).catch(() => {});
  }, []);

  const handleSubscribe = async () => {
    if (!shop) {
      toast.error('Boutique non trouvée');
      return;
    }

    setLoading(true);
    try {
      const response = await firebaseApi.functions.invoke('moncashCreatePayment', {
        amount: 1000,
        orderId: `SUB_${shop.id}_${Date.now()}`,
        description: `Abonnement Premium - ${shop.company_name}`
      });

      console.log('Payment response:', response.data);

      if (response.data?.success && response.data?.payment_url) {
        window.location.href = response.data.payment_url;
      } else {
        const errorMsg = response.data?.error || response.data?.details?.message || 'Erreur lors de la création du paiement';
        toast.error(errorMsg);
        console.error('Payment creation failed:', response.data);
      }
    } catch (error) {
      toast.error('Erreur de connexion à MonCash');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const isPremium = shop?.is_premium && shop?.premium_until && new Date(shop.premium_until) > new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-slate-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('EnterpriseDashboard'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-700 px-4 py-2 rounded-full mb-4">
            <Crown className="w-4 h-4" />
            <span className="text-sm font-medium">Pack Premium</span>
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Boostez vos ventes avec le Premium
          </h1>
          <p className="text-lg text-slate-600">
            Diffusez vos produits sur Facebook & Instagram automatiquement
          </p>
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-orange-200 max-w-md mx-auto">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 text-center">
            <h2 className="text-2xl font-bold mb-2">Premium</h2>
            <div className="flex items-end justify-center gap-2">
              <span className="text-5xl font-bold">1,000</span>
              <span className="text-2xl mb-2">HTG</span>
            </div>
            <p className="text-orange-100 mt-1">par mois</p>
          </div>

          <div className="p-8">
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">🎯 Publicités automatiques</p>
                  <p className="text-sm text-slate-600">Vos produits sur Facebook & Instagram Ads</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">✅ Badge Vérifié</p>
                  <p className="text-sm text-slate-600">Augmentez la confiance de vos clients</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">📊 Statistiques avancées</p>
                  <p className="text-sm text-slate-600">Tracking Meta Pixel pour mesurer votre ROI</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-green-100 rounded-full p-1 mt-0.5">
                  <Check className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">🚀 Priorité dans les résultats</p>
                  <p className="text-sm text-slate-600">Votre boutique apparaît en premier</p>
                </div>
              </div>
            </div>

            {isPremium ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                <Crown className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-semibold text-green-800">Vous êtes Premium ! 👑</p>
                <p className="text-sm text-green-600 mt-1">
                  Valide jusqu'au {new Date(shop.premium_until).toLocaleDateString('fr-FR')}
                </p>
              </div>
            ) : (
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-6 text-lg font-semibold"
                onClick={handleSubscribe}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Redirection...
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    Activer le Premium
                  </>
                )}
              </Button>
            )}

            <p className="text-xs text-slate-500 text-center mt-4">
              Paiement sécurisé via MonCash
            </p>
          </div>
        </div>

        {/* Guarantee */}
        <div className="text-center mt-8 text-slate-600">
          <p className="text-sm">
            💡 <strong>Garantie satisfaction :</strong> Annulez à tout moment
          </p>
        </div>
      </main>
    </div>
  );
}
