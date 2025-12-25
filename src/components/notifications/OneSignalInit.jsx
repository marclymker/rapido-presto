import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function OneSignalInit({ user }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const initOneSignal = async () => {
      try {
        console.log('🔔 Initialisation OneSignal pour:', user.current_profile);
        
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
          if (!initialized) {
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
          }

          // Update tags based on profile
          const baseTags = {
            user_id: user.id,
            email: user.email,
            role: user.current_profile || 'client',
          };

          // Add profile-specific tags
          if (user.current_profile === 'client') {
            baseTags.user_type = 'client';
            baseTags.region = user.region || 'unknown';
          } else if (user.current_profile === 'entreprise') {
            baseTags.user_type = 'entreprise';
            baseTags.id_entite = user.profiles?.entreprise?.company_name?.toLowerCase().replace(/\s+/g, '_') || user.id;
            baseTags.shop_id = user.profiles?.entreprise?.shop_id || 'unknown';
            baseTags.company_name = user.profiles?.entreprise?.company_name || 'unknown';
            baseTags.company_category = user.profiles?.entreprise?.company_category || 'unknown';
          } else if (user.current_profile === 'livreur') {
            baseTags.user_type = 'livreur';
            baseTags.zone = user.region || 'unknown';
            baseTags.driver_status = user.profiles?.livreur?.status || 'pending';
            baseTags.is_available = String(user.profiles?.livreur?.is_available || false);
          }

          OneSignal.sendTags(baseTags);
          console.log('✅ Tags mis à jour:', baseTags);
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
        console.log('✅ OneSignal initialisé pour:', user.current_profile);
        
      } catch (error) {
        console.error('❌ Erreur OneSignal:', error);
      }
    };

    initOneSignal();
  }, [user, user?.current_profile]);

  return null;
}