import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Cookie, Settings } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function CookieConsent({ onAccept, onReject }) {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true, // Toujours actif
    analytics: true,
    marketing: true
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent');
    if (!consent) {
      // Attendre 2 secondes avant d'afficher
      setTimeout(() => setShowBanner(true), 2000);
    } else {
      // Charger les préférences sauvegardées
      const saved = JSON.parse(consent);
      setPreferences(saved);
      if (saved.analytics || saved.marketing) {
        onAccept?.(saved);
      }
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      necessary: true,
      analytics: true,
      marketing: true
    };
    localStorage.setItem('cookie_consent', JSON.stringify(allAccepted));
    setShowBanner(false);
    onAccept?.(allAccepted);
  };

  const handleRejectAll = () => {
    const rejected = {
      necessary: true,
      analytics: false,
      marketing: false
    };
    localStorage.setItem('cookie_consent', JSON.stringify(rejected));
    setShowBanner(false);
    onReject?.();
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookie_consent', JSON.stringify(preferences));
    setShowSettings(false);
    setShowBanner(false);
    if (preferences.analytics || preferences.marketing) {
      onAccept?.(preferences);
    } else {
      onReject?.();
    }
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Bannière de consentement */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-orange-500 shadow-2xl p-4 md:p-6 animate-in slide-in-from-bottom duration-500">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            <div className="flex items-start gap-3 flex-1">
              <Cookie className="w-8 h-8 text-orange-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-lg mb-1">🍪 Cookies & Confidentialité</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser les publicités. 
                  En cliquant sur "Tout accepter", vous acceptez notre utilisation des cookies.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(true)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                <Settings className="w-4 h-4 mr-2" />
                Personnaliser
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRejectAll}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Refuser tout
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAll}
                className="bg-orange-500 hover:bg-orange-600 text-white"
              >
                Tout accepter
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de paramètres */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="w-5 h-5 text-orange-500" />
              Paramètres des cookies
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Cookies nécessaires */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-bold">Cookies nécessaires</h4>
                  <span className="text-xs bg-gray-200 px-2 py-0.5 rounded-full">Toujours actif</span>
                </div>
                <p className="text-sm text-gray-600">
                  Ces cookies sont essentiels au fonctionnement du site. Ils permettent la navigation et l'utilisation des fonctionnalités de base.
                </p>
              </div>
              <Switch checked={true} disabled />
            </div>

            {/* Cookies analytiques */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b">
              <div className="flex-1">
                <h4 className="font-bold mb-2">Cookies analytiques</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Ces cookies nous aident à comprendre comment les visiteurs utilisent notre site via Google Analytics et Google Tag Manager.
                </p>
                <p className="text-xs text-gray-500">
                  Services: Google Analytics, Google Tag Manager
                </p>
              </div>
              <Switch
                checked={preferences.analytics}
                onCheckedChange={(checked) => setPreferences({ ...preferences, analytics: checked })}
              />
            </div>

            {/* Cookies marketing */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h4 className="font-bold mb-2">Cookies marketing</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Ces cookies sont utilisés pour vous proposer des publicités pertinentes sur Facebook, Instagram et Google Ads.
                </p>
                <p className="text-xs text-gray-500">
                  Services: Meta Pixel (Facebook/Instagram), Google Ads
                </p>
              </div>
              <Switch
                checked={preferences.marketing}
                onCheckedChange={(checked) => setPreferences({ ...preferences, marketing: checked })}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowSettings(false)}
            >
              Annuler
            </Button>
            <Button
              className="flex-1 bg-orange-500 hover:bg-orange-600"
              onClick={handleSavePreferences}
            >
              Enregistrer mes préférences
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}