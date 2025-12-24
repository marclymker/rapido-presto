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
        // Get App ID from backend
        const { data } = await base44.functions.invoke('getOneSignalAppId');
        
        if (!data.appId) {
          console.error('OneSignal App ID not found');
          return;
        }

        // Initialize OneSignal
        await OneSignal.init({
          appId: data.appId,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: false,
          },
        });

        // Set external user ID
        OneSignal.setExternalUserId(user.id);

        // Add tags for targeting
        OneSignal.sendTags({
          user_id: user.id,
          email: user.email,
          role: user.current_profile || 'client',
        });

        setInitialized(true);
        console.log('OneSignal initialized');
      } catch (error) {
        console.error('OneSignal initialization error:', error);
      }
    };

    initOneSignal();
  }, [user, initialized]);

  return null;
}