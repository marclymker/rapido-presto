import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function SessionValidator({ user }) {
  useEffect(() => {
    if (!user) return;

    const checkSession = async () => {
      try {
        const currentUser = await base44.auth.me();
        
        // Vérifier si l'utilisateur a été forcé à se déconnecter
        if (currentUser?.force_logout_at) {
          const logoutTimestamp = new Date(currentUser.force_logout_at).getTime();
          const loginTimestamp = localStorage.getItem('login_timestamp');
          
          // Si le timestamp de déconnexion forcée est après la connexion
          if (loginTimestamp && logoutTimestamp > parseInt(loginTimestamp)) {
            localStorage.removeItem('login_timestamp');
            base44.auth.logout(window.location.pathname);
          }
        }
      } catch (error) {
        console.error('Session validation error:', error);
      }
    };

    // Vérifier toutes les 30 secondes
    const interval = setInterval(checkSession, 30000);
    checkSession(); // Vérifier immédiatement

    return () => clearInterval(interval);
  }, [user]);

  return null;
}