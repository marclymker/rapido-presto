import { useEffect, useState } from 'react';
import OneSignal from 'react-onesignal';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function OneSignalInit({ user }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!user || initialized) return;

    const initOneSignal = async () => {
      try {
        console.log('🔔 Initialisation OneSignal...');
        
        // Get App ID from backend
        const { data } = await base44.functions.invoke('getOneSignalAppId');
        
        if (!data.appId) {
          console.error('❌ OneSignal App ID not found');
          toast.error('Erreur: ID OneSignal manquant');
          return;
        }

        console.log('✅ OneSignal App ID récupéré:', data.appId);

        // Initialize OneSignal
        await OneSignal.init({
          appId: data.appId,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false,
          },
        });

        console.log('✅ OneSignal SDK initialisé');

        // Demander la permission de notification
        const permission = await OneSignal.Notifications.requestPermission();
        console.log('🔔 Permission notifications:', permission);

        if (!permission) {
          toast.error('Veuillez autoriser les notifications pour recevoir les alertes');
          return;
        }

        // Set external user ID
        await OneSignal.login(user.id);
        console.log('✅ User ID défini:', user.id);

        // Add tags for targeting
        await OneSignal.User.addTags({
          user_id: user.id,
          email: user.email,
          role: user.current_profile || 'client',
          commune: user.commune || 'unknown'
        });

        console.log('✅ Tags ajoutés');

        setInitialized(true);
        toast.success('🔔 Notifications activées');
        
      } catch (error) {
        console.error('❌ Erreur OneSignal:', error);
        toast.error('Erreur lors de l\'activation des notifications');
      }
    };

    initOneSignal();
  }, [user, initialized]);

  return null;
}