import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * Hook pour gérer les notifications visuelles quand l'utilisateur est sur l'app
 */
export function useOrderNotifications({ enabled, onNewOrder }) {
  const previousCountRef = useRef(null);

  useEffect(() => {
    if (!enabled || !onNewOrder) return;

    const currentCount = onNewOrder.length || 0;
    
    // Initialisation silencieuse au premier chargement
    if (previousCountRef.current === null) {
      previousCountRef.current = currentCount;
      return;
    }
    
    // Si le nombre de commandes augmente
    if (currentCount > previousCountRef.current) {
      const diff = currentCount - previousCountRef.current;
      
      // 1. Notification visuelle dans l'application (Toast)
      toast.success(`🔔 Nouvelle commande !`, {
        description: diff > 1 ? `Vous avez ${diff} nouvelles commandes.` : "Une nouvelle commande vient d'arriver.",
        duration: 8000,
        action: {
          label: "Voir",
          onClick: () => console.log("Rediriger vers commandes")
        },
      });

      // 2. Optionnel : Petit bip sonore interne
      const audio = new Audio('/notification.mp3'); 
      audio.play().catch(() => {}); // Évite l'erreur si l'utilisateur n'a pas encore intéragi
    }
    
    previousCountRef.current = currentCount;
  }, [enabled, onNewOrder]);
}