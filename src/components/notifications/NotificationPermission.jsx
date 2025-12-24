import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Volume2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function NotificationPermission({ userType }) {
  const [permission, setPermission] = useState(Notification?.permission || 'default');
  const [showDialog, setShowDialog] = useState(false);
  const [swRegistered, setSwRegistered] = useState(false);

  useEffect(() => {
    checkServiceWorker();
  }, []);

  const checkServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        setSwRegistered(!!registration);
      } catch (error) {
        console.error('SW check error:', error);
      }
    }
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
        setSwRegistered(true);
        return true;
      } catch (error) {
        console.error('SW registration failed:', error);
        toast.error('Erreur lors de l\'activation');
        return false;
      }
    }
    return false;
  };

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Notifications non supportées par ce navigateur');
      return;
    }

    try {
      // Register service worker first
      const swOk = await registerServiceWorker();
      if (!swOk) return;

      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result === 'granted') {
        toast.success('Notifications activées avec succès!');
        testNotification();
        setShowDialog(false);
      } else if (result === 'denied') {
        toast.error('Notifications refusées. Activez-les dans les paramètres du navigateur.');
      }
    } catch (error) {
      console.error('Permission error:', error);
      toast.error('Erreur lors de la demande d\'autorisation');
    }
  };

  const testNotification = () => {
    if (Notification.permission === 'granted') {
      playNotificationSound();
      
      const messages = {
        client: 'Votre commande est en cours de préparation!',
        entreprise: 'Nouvelle commande reçue - 850 HTG',
        livreur: 'Nouvelle livraison disponible - Pétion-Ville'
      };

      new Notification('🔔 Test de notification', {
        body: messages[userType] || 'Les notifications fonctionnent!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'test',
        requireInteraction: false
      });
    }
  };

  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = userType === 'entreprise' ? 1000 : 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Audio error:', error);
    }
  };

  const getButtonContent = () => {
    if (permission === 'granted') {
      return (
        <>
          <Bell className="w-4 h-4 text-green-600" />
          <span className="text-xs text-green-600">Activées</span>
        </>
      );
    }
    return (
      <>
        <BellOff className="w-4 h-4 text-slate-400" />
        <span className="text-xs text-slate-600">Notifications</span>
      </>
    );
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="flex flex-col items-center gap-1 h-auto py-2"
        onClick={() => permission === 'granted' ? testNotification() : setShowDialog(true)}
      >
        {getButtonContent()}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              Activer les notifications
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-sm text-slate-700 mb-3">
                Recevez des alertes en temps réel avec son :
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                {userType === 'entreprise' && (
                  <>
                    <li className="flex items-start gap-2">
                      <span>🔔</span>
                      <span>Nouvelles commandes instantanément</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>🔊</span>
                      <span>Alerte sonore pour ne rien manquer</span>
                    </li>
                  </>
                )}
                {userType === 'livreur' && (
                  <>
                    <li className="flex items-start gap-2">
                      <span>📦</span>
                      <span>Livraisons disponibles dans votre zone</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>🔊</span>
                      <span>Notification sonore pour chaque opportunité</span>
                    </li>
                  </>
                )}
                {userType === 'client' && (
                  <>
                    <li className="flex items-start gap-2">
                      <span>✅</span>
                      <span>Statut de votre commande en temps réel</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span>🚚</span>
                      <span>Notification quand votre livreur arrive</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDialog(false)}
              >
                Plus tard
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={requestPermission}
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Activer
              </Button>
            </div>

            <p className="text-xs text-slate-500 text-center">
              Vous pourrez désactiver les notifications à tout moment
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}