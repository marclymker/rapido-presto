import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download, Share, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from '@/api/base44Client';

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    const installed = window.matchMedia('(display-mode: standalone)').matches || 
                     window.navigator.standalone === true ||
                     localStorage.getItem('pwa_installed');
    setIsInstalled(installed);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(iOS);

    // Listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Android/Chrome - Installation native
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        localStorage.setItem('pwa_installed', 'true');
        setIsInstalled(true);
        
        try {
          const user = await base44.auth.me();
          if (user) {
            await base44.auth.updateMe({ pwa_installed: true });
          }
        } catch (error) {
          console.log('Could not update user');
        }
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      // iOS - Afficher instructions
      setShowInstructions(true);
    } else {
      // Autres navigateurs - Afficher instructions
      setShowInstructions(true);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <Button
        onClick={handleInstall}
        className="bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg"
      >
        <Download className="w-4 h-4 mr-2" />
        Installer l'application
      </Button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-orange-600" />
              Installer Rapido Presto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {isIOS ? (
              <>
                <p className="text-sm text-slate-600">
                  Pour installer l'application sur iOS :
                </p>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-100 text-orange-600 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">1</span>
                    <span>Appuyez sur le bouton <Share className="w-4 h-4 inline" /> (Partager) en bas de l'écran</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-100 text-orange-600 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">2</span>
                    <span>Faites défiler et sélectionnez "Sur l'écran d'accueil"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-100 text-orange-600 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">3</span>
                    <span>Appuyez sur "Ajouter"</span>
                  </li>
                </ol>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  Pour installer l'application :
                </p>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-100 text-orange-600 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">1</span>
                    <span>Ouvrez le menu de votre navigateur (⋮)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-100 text-orange-600 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">2</span>
                    <span>Sélectionnez "Installer l'application" ou "Ajouter à l'écran d'accueil"</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="bg-orange-100 text-orange-600 font-bold w-6 h-6 rounded-full flex items-center justify-center shrink-0">3</span>
                    <span>Confirmez l'installation</span>
                  </li>
                </ol>
              </>
            )}

            <Button 
              onClick={() => setShowInstructions(false)} 
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              J'ai compris
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}