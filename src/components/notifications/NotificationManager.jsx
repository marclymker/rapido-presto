import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

export function useNotificationSound() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const hasInteractedRef = useRef(false);

  // Technique 1: Créer un son très court qui peut passer les restrictions
  const createShortBeep = useCallback(() => {
    try {
      // Essayer d'abord avec l'API Audio plus permissive
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const context = new AudioContextClass();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.1);
      
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.1);
      
      // Fermer le contexte après utilisation pour éviter la suspension
      setTimeout(() => {
        if (context.state !== 'closed') {
          context.close();
        }
      }, 200);
      
      return true;
    } catch (e) {
      console.log('Web Audio API failed, trying fallback');
      return false;
    }
  }, []);

  // Technique 2: Audio element avec plusieurs tentatives
  const playAudioElement = useCallback(async () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio();
        // Son très court encodé en base64
        audioRef.current.src = 'data:audio/mpeg;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjE5AAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjE5AAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA';
        audioRef.current.volume = 0.5;
        audioRef.current.preload = 'auto';
      }

      // Réinitialiser et jouer
      audioRef.current.currentTime = 0;
      
      // Important: Ne pas attendre la promesse, laisser échouer silencieusement
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Échec silencieux - on continue avec d'autres méthodes
        });
      }
      
      return true;
    } catch (e) {
      return false;
    }
  }, []);

  // Technique 3: Video element (moins restrictif que audio)
  const playVideoElement = useCallback(() => {
    try {
      const video = document.createElement('video');
      video.style.display = 'none';
      video.volume = 0.3;
      video.muted = false;
      
      // Créer une vidéo silencieuse avec une piste audio
      const blob = new Blob([new Uint8Array([0])], { type: 'video/mp4' });
      video.src = URL.createObjectURL(blob);
      
      document.body.appendChild(video);
      
      video.play().catch(() => {
        // Échec attendu
      });
      
      // Nettoyer après
      setTimeout(() => {
        video.pause();
        document.body.removeChild(video);
        URL.revokeObjectURL(video.src);
      }, 100);
      
      return true;
    } catch (e) {
      return false;
    }
  }, []);

  // Technique 4: Utiliser un iframe pour contourner les restrictions
  const playViaIframe = useCallback(() => {
    try {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.sandbox = 'allow-scripts allow-same-origin';
      
      // Générer une page HTML avec du son
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Audio</title>
        </head>
        <body>
          <audio id="audio" src="data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="></audio>
          <script>
            document.getElementById('audio').play().catch(() => {});
          </script>
        </body>
        </html>
      `;
      
      iframe.srcdoc = html;
      document.body.appendChild(iframe);
      
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
      
      return true;
    } catch (e) {
      return false;
    }
  }, []);

  const playSound = useCallback(async () => {
    if (isPlaying) return;
    
    setIsPlaying(true);
    
    // Essayer toutes les méthodes en parallèle
    const methods = [
      createShortBeep,
      playAudioElement,
      playVideoElement,
      playViaIframe
    ];
    
    // Essayer chaque méthode jusqu'à ce qu'une réussisse
    for (const method of methods) {
      try {
        const success = await Promise.resolve(method());
        if (success) {
          console.log('Sound played successfully with method:', method.name);
          break;
        }
      } catch (error) {
        // Continuer avec la méthode suivante
      }
    }
    
    // Réinitialiser après un court délai
    setTimeout(() => setIsPlaying(false), 100);
  }, [createShortBeep, playAudioElement, playVideoElement, playViaIframe, isPlaying]);

  // Initialiser au chargement en essayant de débloquer l'audio
  useEffect(() => {
    // Essayer immédiatement
    setTimeout(() => {
      playSound();
    }, 1000);

    // Marquer l'interaction au premier événement utilisateur
    const markInteraction = () => {
      hasInteractedRef.current = true;
    };

    window.addEventListener('click', markInteraction, { once: true });
    window.addEventListener('keydown', markInteraction, { once: true });
    window.addEventListener('touchstart', markInteraction, { once: true });
    window.addEventListener('scroll', markInteraction, { once: true });

    return () => {
      window.removeEventListener('click', markInteraction);
      window.removeEventListener('keydown', markInteraction);
      window.removeEventListener('touchstart', markInteraction);
      window.removeEventListener('scroll', markInteraction);
    };
  }, [playSound]);

  return { playSound };
}

export function useBrowserNotifications() {
  const requestPermission = async () => {
    return true;
  };

  const showNotification = () => {
    return null;
  };

  return { requestPermission, showNotification };
}

export function useOrderNotifications({ enabled, onNewOrder }) {
  const { playSound } = useNotificationSound();
  const previousCountRef = useRef(0);
  const notificationCooldownRef = useRef(false);

  useEffect(() => {
    if (!enabled || !onNewOrder) return;

    const currentCount = onNewOrder.length || 0;
    
    // Vérifier s'il y a de nouvelles commandes et éviter les notifications trop fréquentes
    if (currentCount > previousCountRef.current && previousCountRef.current > 0 && !notificationCooldownRef.current) {
      notificationCooldownRef.current = true;
      
      // Jouer le son immédiatement
      playSound();

      // Notification toast
      const newOrdersCount = currentCount - previousCountRef.current;
      toast.success(`🔔 ${newOrdersCount} nouvelle(s) commande(s)!`, {
        duration: 4000,
        important: true,
      });

      // Réinitialiser le cooldown après 2 secondes
      setTimeout(() => {
        notificationCooldownRef.current = false;
      }, 2000);
    }
    
    previousCountRef.current = currentCount;
  }, [enabled, onNewOrder, playSound]);
}

// Hook additionnel pour forcer le son au besoin
export function useForceSound() {
  const { playSound } = useNotificationSound();
  
  const forcePlay = useCallback(() => {
    // Créer un contexte audio caché et le maintenir actif
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      
      // Créer un nœud de gain silencieux pour maintenir le contexte actif
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 0;
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(0);
      oscillator.stop(0.001);
      
      // Maintenant jouer le vrai son
      setTimeout(() => {
        playSound();
        audioContext.close();
      }, 50);
    } catch (e) {
      // Fallback simple
      playSound();
    }
  }, [playSound]);
  
  return { forcePlay };
}