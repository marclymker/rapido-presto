import React, { useState, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { X, Download, Sparkles, Smartphone, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { getAccessSource } from '@/components/utils/detectFacebookInApp';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [user, setUser] = useState(null);
  const [promptType, setPromptType] = useState(null); // 'browser' | 'inapp'

  // 1. Détection de l'utilisateur et du contexte In-App
  useEffect(() => {
    const initContext = async () => {
      // Fetch User
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.log('[PWA] Utilisateur non connecté');
      }

      // Détection In-App (FB, Instagram, etc.)
      const source = getAccessSource();
      const isInApp = ['facebook_inapp', 'instagram_inapp', 'messenger_inapp'].includes(source);

      if (isInApp) {
        setPromptType('inapp');
        checkAndShowPrompt();
      }
    };

    initContext();
  }, []);

  // 2. Capture de l'événement d'installation du navigateur
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA] beforeinstallprompt capturé');
      // Empêche la barre native du navigateur d'apparaître
      e.preventDefault();
      
      // Stocke l'événement pour l'utiliser lors du clic sur "Installer"
      setDeferredPrompt(e);
      setPromptType('browser');
      
      checkAndShowPrompt();
    };

    const handleAppInstalled = () => {
      console.log('[PWA] Application installée avec succès');
      localStorage.setItem('pwa_installed', 'true');
      setShowPrompt(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // 3. Logique d'affichage (Vérifie les flags localeStorage)
  const checkAndShowPrompt = useCallback(() => {
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const hasBeenInstalledFlag = localStorage.getItem('pwa_installed');
    const dismissedAt = localStorage.getItem('pwa_install_dismissed');

    if (isInstalled || hasBeenInstalledFlag) return;

    // Si l'utilisateur l'a fermé, on attend 24h avant de le remontrer (plus user-friendly que 5min)
    if (dismissedAt) {
      const lastDismissed = parseInt(dismissedAt);
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - lastDismissed < dayInMs) return;
    }

    // Affichage après un court délai pour l'UX
    setTimeout(() => {
      setShowPrompt(true);
    }, 3000);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Déclenche le prompt natif
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Résultat de l'installation: ${outcome}`);

    if (outcome === 'accepted') {
      localStorage.setItem('pwa_installed', 'true');
      if (user) {
        try {
          await base44.auth.updateMe({ pwa_installed: true });
        } catch (e) { console.error(e); }
      }
    } else {
      localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  const handleOpenInBrowser = () => {
    // Tente de forcer l'ouverture dans Chrome sur Android depuis une WebView
    const url = window.location.href.replace(/^https?:\/\//, '');
    window.location.href = `intent://${url}#Intent;scheme=https;package=com.android.chrome;action=android.intent.action.VIEW;end`;
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50"
        >
          <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-2xl shadow-2xl overflow-hidden border-2 border-orange-400/50 p-5 relative">
            
            {/* Background Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <Sparkles className="absolute top-2 left-4 w-4 h-4 text-white" />
                <Sparkles className="absolute bottom-4 right-12 w-6 h-6 text-white" />
            </div>

            <button onClick={handleDismiss} className="absolute top-3 right-3 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors z-10">
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="flex items-start gap-4 mb-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3">
                {promptType === 'inapp' ? <ExternalLink className="w-8 h-8 text-white" /> : <Smartphone className="w-8 h-8 text-white" />}
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-lg">
                  {promptType === 'inapp' ? 'Ouvrir dans le navigateur' : 'Installer Rapido Presto'}
                </h3>
                <p className="text-white/90 text-sm">
                  {promptType === 'inapp' 
                    ? "Quittez l'aperçu Facebook pour installer l'application sur votre écran d'accueil."
                    : "Accédez à vos services plus rapidement et même hors ligne !"}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {promptType === 'browser' ? (
                <Button onClick={handleInstall} className="flex-1 bg-white text-orange-600 hover:bg-orange-50 font-bold h-11">
                  <Download className="w-4 h-4 mr-2" /> Installer
                </Button>
              ) : (
                <Button onClick={handleOpenInBrowser} className="flex-1 bg-white text-orange-600 hover:bg-orange-50 font-bold h-11">
                  <ExternalLink className="w-4 h-4 mr-2" /> Ouvrir Chrome
                </Button>
              )}
              <Button onClick={handleDismiss} variant="ghost" className="text-white hover:bg-white/10">Plus tard</Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}