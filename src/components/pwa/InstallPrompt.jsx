import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { X, Download, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { getAccessSource } from '@/components/utils/detectFacebookInApp';
import { toast } from 'sonner';

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [accessSource, setAccessSource] = useState(null);

  useEffect(() => {
    setAccessSource(getAccessSource());

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // LOGIQUE DE DISCRÉTION
    const timer = setTimeout(() => {
      const isInstalled = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
      const alreadyInstalledFlag = localStorage.getItem('pwa_installed');
      const lastDismissed = localStorage.getItem('pwa_dismissed_at');
      
      // Calcul du temps écoulé depuis le dernier refus
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      const isWaitPeriodOver = !lastDismissed || (now - parseInt(lastDismissed) > oneHour);

      if (!isInstalled && !alreadyInstalledFlag && isWaitPeriodOver) {
        setShowPrompt(true);
      }
    }, 10000); // On attend 10 secondes avant de montrer l'invite

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      // Si pas de prompt natif (iOS), on montre juste un petit toast d'aide
      toast.info("Pour installer : Menu Partage > Sur l'écran d'accueil");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem('pwa_installed', 'true');
      setShowPrompt(false);
      toast.success('Installation lancée !');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem('pwa_dismissed_at', Date.now().toString());
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50"
        >
          {/* Version MINI et DISCRÈTE */}
          <div className="bg-white border border-gray-200 shadow-xl rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-lg">
                <Smartphone className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-none">Rapido Presto App</p>
                <p className="text-[11px] text-gray-500 mt-1">Installer pour un accès rapide</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                onClick={handleInstall}
                size="sm" 
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-8 px-3"
              >
                Installer
              </Button>
              <button 
                onClick={handleDismiss}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}