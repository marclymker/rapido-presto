import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Hook pour gérer le bouton retour natif du navigateur
 * @param {Function} onBack - Fonction à exécuter lors du retour
 * @param {boolean} enabled - Activer ou désactiver le hook
 */
export function useBackButton(onBack, enabled = true) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!enabled) return;

    const handlePopState = (e) => {
      e.preventDefault();
      if (onBack) {
        onBack();
      } else {
        navigate(-1);
      }
    };

    // Ajouter une entrée dans l'historique pour intercepter le retour
    window.history.pushState(null, '', window.location.href);

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [onBack, enabled, navigate]);
}