import { toast } from 'sonner';

// Fonction pour jouer un son de notification
const playNotificationSound = () => {
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  audio.play().catch(err => console.log("Audio play blocked by browser"));
};

export function useOrderNotifications({ enabled, onNewOrder }) {
  const previousCountRef = useRef(null);

  useEffect(() => {
    if (!enabled || !onNewOrder) return;

    const currentCount = onNewOrder.length || 0;
    
    // Initialisation : on mémorise le compte actuel au chargement
    if (previousCountRef.current === null) {
      previousCountRef.current = currentCount;
      return;
    }
    
    // Détection d'une augmentation
    if (currentCount > previousCountRef.current) {
      const diff = currentCount - previousCountRef.current;
      const title = "🔔 Nouvelle commande !";
      const message = diff > 1 ? `Vous avez ${diff} nouvelles commandes.` : "Une nouvelle commande est arrivée.";

      // 1. Jouer le son
      playNotificationSound();

      // 2. Notification système (Navigateur/Android)
      if ("Notification" in window && Notification.permission === "granted") {
        try {
          new Notification(title, {
            body: message,
            icon: '/favicon.ico',
            tag: 'new-order', // Evite les doublons
            requireInteraction: true // La notification reste jusqu'à lecture
          });
        } catch (e) {
          console.error("Erreur notification native:", e);
        }
      }

      // 3. Notification visuelle dans l'app (Toast)
      toast.success(title, {
        description: message,
        duration: 10000,
      });
    }
    
    previousCountRef.current = currentCount;
  }, [enabled, onNewOrder]);
}