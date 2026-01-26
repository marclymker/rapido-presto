import React, { useState, useEffect, useCallback } from 'react';
// ... vos imports restent identiques

export default function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [user, setUser] = useState(null);
  const [accessSource, setAccessSource] = useState(null);
  const [promptType, setPromptType] = useState(null);

  // 1. Capture immédiate de l'événement (doit être fait hors du flux async)
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      console.log('[PWA] Event beforeinstallprompt capturé');
      // Empêche la bannière par défaut du navigateur
      e.preventDefault();
      // Stocke l'événement pour plus tard
      setDeferredPrompt(e);
      setPromptType('browser');
      
      // On vérifie si on doit l'afficher (pas déjà installé, pas refusé récemment)
      const isDismissed = localStorage.getItem('pwa_install_dismissed');
      const isInstalled = localStorage.getItem('pwa_installed');
      
      if (!isDismissed && !isInstalled) {
        // Petit délai pour laisser l'utilisateur respirer après le chargement
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // 2. Gestion de l'état utilisateur et InApp
  useEffect(() => {
    const initData = async () => {
      // User data
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (e) { /* ignore */ }

      // Source detection
      const source = getAccessSource();
      setAccessSource(source);

      // Cas spécifique In-App (Instagram/FB) qui ne supportent pas beforeinstallprompt
      const isInApp = ['facebook_inapp', 'instagram_inapp', 'messenger_inapp'].includes(source);
      if (isInApp && !localStorage.getItem('pwa_install_dismissed')) {
        setPromptType('inapp');
        setTimeout(() => setShowPrompt(true), 2000);
      }
    };

    initData();
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Affiche le prompt natif
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] Choix utilisateur : ${outcome}`);

    if (outcome === 'accepted') {
      localStorage.setItem('pwa_installed', 'true');
      if (user) await base44.auth.updateMe({ pwa_installed: true });
    } else {
      localStorage.setItem('pwa_install_dismissed', Date.now().toString());
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  // ... (handleDismiss et handleOpenInBrowser restent identiques)