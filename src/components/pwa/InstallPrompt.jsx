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
      
      // Calcul du temps écoulé depuis le dernier refus (12 heures)
      const now = Date.now();
      const twelveHours = 12 * 60 * 60 * 1000;
      const isWaitPeriodOver = !lastDismissed || (now - parseInt(lastDismissed) > twelveHours);

      if (!isInstalled && !alreadyInstalledFlag && isWaitPeriodOver) {
        setShowPrompt(true);
      }
    }, 3000); // On attend 3 secondes avant de montrer l'invite

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
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-72 z-50"
        >
          {/* Version COMPACTE */}
          <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="bg-orange-100 p-1.5 rounded-lg">
                <Smartphone className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900 leading-none">Installer l'app</p>
                <p className="text-[10px] text-gray-500 mt-0.5">Accès rapide</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                onClick={handleInstall}
                size="sm" 
                className="bg-orange-600 hover:bg-orange-700 text-white text-[11px] h-7 px-2"
              >
                OK
              </Button>
              <button 
                onClick={handleDismiss}
                className="p-1 hover:bg-gray-100 rounded-full text-gray-400"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}