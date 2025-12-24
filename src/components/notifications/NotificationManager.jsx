import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// Créer un contexte audio global
let audioContext = null;
let oscillatorBuffer = null;
let isAudioUnlocked = false;

export function useNotificationSound() {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialiser au premier clic/touch sur la page
    const unlockAudio = async () => {
      if (isAudioUnlocked) return;

      try {
        if (!audioContext) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }

        // Créer un son de notification
        if (!oscillatorBuffer) {
          const sampleRate = audioContext.sampleRate;
          const duration = 0.2;
          const bufferSize = sampleRate * duration;
          oscillatorBuffer = audioContext.createBuffer(1, bufferSize, sampleRate);
          const channelData = oscillatorBuffer.getChannelData(0);

          // Générer une tonalité simple (800Hz)
          for (let i = 0; i < bufferSize; i++) {
            const t = i / sampleRate;
            channelData[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 5);
          }
        }

        // Jouer un son silencieux pour débloquer
        const source = audioContext.createBufferSource();
        source.buffer = oscillatorBuffer;
        const gainNode = audioContext.createGain();
        gainNode.gain.value = 0;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start(0);

        await audioContext.resume();
        isAudioUnlocked = true;
        setIsInitialized(true);
      } catch (err) {
        console.log('Audio unlock failed:', err);
      }
    };

    // Écouter les interactions utilisateur
    const events = ['click', 'touchstart', 'keydown'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudio, { once: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudio);
      });
    };
  }, []);

  const playSound = () => {
    if (!audioContext || !oscillatorBuffer || !isAudioUnlocked) {
      console.log('Audio not ready yet');
      return;
    }

    try {
      const source = audioContext.createBufferSource();
      source.buffer = oscillatorBuffer;
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0.3;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start(0);
    } catch (err) {
      console.log('Sound play failed:', err);
    }
  };

  const initialize = () => {
    // Compatibilité avec l'ancienne API
    setIsInitialized(isAudioUnlocked);
  };

  return { playSound, initialize, isInitialized };
}

export function useBrowserNotifications() {
  const requestPermission = async () => {
    // Ne pas vérifier l'API Notification, OneSignal gère cela
    return true;
  };

  const showNotification = () => {
    // OneSignal gère les notifications
    return null;
  };

  return { requestPermission, showNotification };
}

export function useOrderNotifications({ enabled, onNewOrder }) {
  const { playSound } = useNotificationSound();
  const previousCountRef = useRef(0);

  useEffect(() => {
    if (enabled && onNewOrder) {
      const currentCount = onNewOrder.length || 0;
      
      // Vérifier s'il y a de nouvelles commandes
      if (currentCount > previousCountRef.current && previousCountRef.current > 0) {
        // Jouer le son
        playSound();

        // Toast visuel dans l'app
        toast.success(`🔔 Nouvelle commande reçue!`, {
          duration: 5000
        });
      }
      
      previousCountRef.current = currentCount;
    }
  }, [enabled, onNewOrder, playSound]);
}