import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function OneSignalInit({ user }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!user || initialized || typeof window === 'undefined') return;

    const initOneSignal = async () => {
      try {
        console.log('🔔 Initialisation OneSignal...');
        
        // Get App ID from backend
        const { data } = await base44.functions.invoke('getOneSignalAppId');
        
        if (!data.appId) {
          console.error('❌ OneSignal App ID not found');
          return;
        }

        console.log('✅ OneSignal App ID récupéré:', data.appId);

        // Initialize OneSignal via script
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        
        window.OneSignalDeferred.push(async function(OneSignal) {
          await OneSignal.init({
            appId: data.appId,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: {
              enable: false,
            },
          });

          console.log('✅ OneSignal SDK initialisé');

          // Set external user ID
          OneSignal.setExternalUserId(user.id);
          console.log('✅ User ID défini:', user.id);

          // Add tags for targeting
          OneSignal.sendTags({
            user_id: user.id,
            email: user.email,
            role: user.current_profile || 'client',
            commune: user.commune || 'unknown'
          });

          console.log('✅ Tags ajoutés');
        });

        // Load OneSignal script
        if (!document.getElementById('onesignal-script')) {
          const script = document.createElement('script');
          script.id = 'onesignal-script';
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
          script.defer = true;
          document.head.appendChild(script);
        }

        setInitialized(true);
        console.log('✅ OneSignal initialisé');
        
      } catch (error) {
        console.error('❌ Erreur OneSignal:', error);
      }
    };

    initOneSignal();
  }, [user, initialized]);

  return null;
}