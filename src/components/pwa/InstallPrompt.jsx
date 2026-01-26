import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Download, Sparkles, Smartphone, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { getAccessSource } from '@/components/utils/detectFacebookInApp';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [user, setUser] = useState(null);
  const [accessSource, setAccessSource] = useState(null);
  const [promptType, setPromptType] = useState(null); // 'browser' | 'inapp' | 'manual'

  useEffect(() => {
    // Fetch current user
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.log('User not logged in');
      }
    };
    fetchUser();

    // Detect access source
    const source = getAccessSource();
    setAccessSource(source);
  }, []);

  useEffect(() => {
    // Check if app is already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                       window.navigator.standalone === true;

    if (isInstalled) {
      console.log('[PWA] App already installed (standalone mode)');
      return;
    }

    // Check if user already dismissed or installed
    const installed = localStorage.getItem('pwa_installed');
    if (installed) {
      console.log('[PWA] User already has pwa_installed flag');
      return;
    }

    console.log('[PWA] Initializing install prompt detection');
    console.log('[PWA] Access source:', accessSource);

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA] beforeinstallprompt event fired');
      e.preventDefault();
      setDeferredPrompt(e);
      setPromptType('browser');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // AFFICHER LA NOTIFICATION POUR TOUS LES UTILISATEURS après 1 seconde
    const universalTimeout = setTimeout(() => {
      console.log('[PWA] Showing universal install prompt');
      
      // Déterminer le type de prompt basé sur l'accès
      const isInAppBrowser = accessSource && ['facebook_inapp', 'instagram_inapp', 'messenger_inapp'].includes(accessSource);
      
      if (isInAppBrowser) {
        setPromptType('inapp');
      } else if (deferredPrompt) {
        setPromptType('browser');
      } else {
        // Pour iOS Safari et autres navigateurs sans support natif
        setPromptType('manual');
      }
      
      setShowPrompt(true);
    }, 1000);

    const cleanup = () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(universalTimeout);
    };

    return cleanup;

    // Check if already in standalone mode (installed)
    const handleAppInstalled = async () => {
      console.log('[PWA] appinstalled event fired');
      localStorage.setItem('pwa_installed', 'true');
      setShowPrompt(false);
      
      if (user) {
        try {
          await base44.auth.updateMe({ pwa_installed: true });
        } catch (error) {
          console.error('Failed to update user profile:', error);
        }
      }
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Relancer la notification toutes les 60 minutes pour ceux qui n'ont pas installé
    const intervalId = setInterval(() => {
      const dismissed = localStorage.getItem('pwa_install_dismissed');
      if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const now = Date.now();
        const minutesSinceDismissed = (now - dismissedTime) / (1000 * 60);
        
        if (minutesSinceDismissed >= 60) {
          console.log('[PWA] Re-showing prompt after 60 minutes');
          setShowPrompt(true);
          localStorage.removeItem('pwa_install_dismissed');
        }
      }
    }, 60000); // Vérifier chaque minute

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(intervalId);
    };
  }, [user, accessSource]);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem('pwa_installed', 'true');
      setShowPrompt(false);
      
      // Save to user profile if logged in
      if (user) {
        try {
          await base44.auth.updateMe({ pwa_installed: true });
        } catch (error) {
          console.error('Failed to update user profile:', error);
        }
      }

      // Wait for app to install and launch in installed app
      setTimeout(() => {
        // Launch the PWA - this will open in the installed app
        window.location.href = window.location.href;
      }, 500);
    } else {
      localStorage.setItem('pwa_install_dismissed', Date.now().toString());
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    setShowPrompt(false);
  };

  const handleOpenInBrowser = () => {
    // Open in default browser for InAPP users
    const url = window.location.href;
    window.location.href = `intent://${window.location.host}${window.location.pathname}#Intent;scheme=https;package=com.android.chrome;action=android.intent.action.VIEW;end`;
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50"
        >
          <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 rounded-2xl shadow-2xl overflow-hidden border-2 border-orange-400/50">
            {/* Sparkle effect background */}
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-2 left-4 animate-pulse">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="absolute top-8 right-8 animate-pulse delay-150">
                <Sparkles className="w-3 h-3 text-white" />
              </div>
              <div className="absolute bottom-4 left-12 animate-pulse delay-300">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors z-10"
            >
              <X className="w-4 h-4 text-white" />
            </button>

            <div className="relative p-5">
              {/* Icon */}
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                  {promptType === 'inapp' ? (
                    <ExternalLink className="w-8 h-8 text-white" />
                  ) : (
                    <Smartphone className="w-8 h-8 text-white" />
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-1">
                    {promptType === 'inapp' 
                      ? 'Ouvrir dans le navigateur' 
                      : promptType === 'manual'
                      ? 'Installer sur iOS'
                      : 'Installer Rapido Presto'}
                  </h3>
                  <p className="text-white/90 text-sm leading-relaxed">
                    {promptType === 'inapp'
                      ? 'Ouvrez l\'app dans votre navigateur pour une meilleure expérience et installer le PWA'
                      : promptType === 'manual'
                      ? 'Appuyez sur le bouton de partage puis "Sur l\'écran d\'accueil" pour installer'
                      : 'Accédez instantanément depuis votre écran d\'accueil pour une expérience plus rapide et fluide'
                    }
                  </p>
                </div>
              </div>

              {/* Benefits */}
              <div className="mb-4 space-y-2">
                <div className="flex items-center gap-2 text-white/95 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  <span>Accès ultra-rapide</span>
                </div>
                <div className="flex items-center gap-2 text-white/95 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  <span>Fonctionne hors ligne</span>
                </div>
                <div className="flex items-center gap-2 text-white/95 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                  <span>Notifications en temps réel</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                {promptType === 'browser' && deferredPrompt ? (
                  <>
                    <Button
                      onClick={handleInstall}
                      className="flex-1 bg-white text-orange-600 hover:bg-orange-50 font-bold shadow-lg h-11 text-base"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Installer maintenant
                    </Button>
                    <Button
                      onClick={handleDismiss}
                      variant="ghost"
                      className="text-white hover:bg-white/10 font-medium"
                    >
                      Plus tard
                    </Button>
                  </>
                ) : promptType === 'inapp' ? (
                  <>
                    <Button
                      onClick={handleOpenInBrowser}
                      className="flex-1 bg-white text-orange-600 hover:bg-orange-50 font-bold shadow-lg h-11 text-base"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ouvrir le navigateur
                    </Button>
                    <Button
                      onClick={handleDismiss}
                      variant="ghost"
                      className="text-white hover:bg-white/10 font-medium"
                    >
                      Plus tard
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={handleDismiss}
                      className="flex-1 bg-white text-orange-600 hover:bg-orange-50 font-bold shadow-lg h-11 text-base"
                    >
                      J'ai compris
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Bottom shine effect */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}