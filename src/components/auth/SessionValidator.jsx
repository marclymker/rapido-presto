import { useEffect } from 'react';
import { firebase } from '@/api/firebaseClient';

export default function SessionValidator({ user }) {
  useEffect(() => {
    if (!user) return;

    // Stocker la version de session actuelle au montage
    if (!localStorage.getItem('user_session_version') && user.session_version) {
      localStorage.setItem('user_session_version', user.session_version.toString());
    }

    const checkSession = async () => {
      try {
        const currentUser = await firebase.auth.me();

        if (!currentUser) return;

        const storedVersion = localStorage.getItem('user_session_version');
        const currentVersion = currentUser.session_version;

        // Si la version a changé, déconnecter
        if (storedVersion && currentVersion && currentVersion.toString() !== storedVersion) {
          localStorage.removeItem('user_session_version');
          window.location.href = '/';
          firebase.auth.logout();
        }
      } catch (error) {
        console.error('Session validation error:', error);
      }
    };

    // Vérifier toutes les 10 secondes
    const interval = setInterval(checkSession, 10000);

    return () => clearInterval(interval);
  }, [user]);

  return null;
}