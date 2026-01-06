import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function OneSignalInit({ user }) {
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const initOneSignal = async () => {
      try {
        // Récupération de l'App ID depuis Supabase/Backend
        const { data } = await base44.functions.invoke('getOneSignalAppId');
        if (!data?.appId) return;

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async (OneSignal) => {
          await OneSignal.init({
            appId: data.appId,
            allowLocalhostAsSecureOrigin: true,
            notifyButton: { enable: false }, // On gère notre propre UI
          });

          // Identification : lie le compte OneSignal à ton user.id
          await OneSignal.login(user.id);

          // Tags pour segmenter tes envois (Marchands vs Clients etc.)
          await OneSignal.sendTags({
            role: user.current_profile || 'client',
            zone: user.region || 'haiti',
            is_available: String(user.profiles?.livreur?.is_available || false)
          });

          // Gestion du clic sur notification
          OneSignal.Notifications.addEventListener("click", (event) => {
            const url = event.notification.launchURL;
            if (url) window.location.href = url;
          });
        });

        // Injection du script SDK
        if (!document.getElementById('onesignal-script')) {
          const script = document.createElement('script');
          script.id = 'onesignal-script';
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
          script.async = true;
          document.head.appendChild(script);
        }
      } catch (error) {
        console.error('OneSignal Init Error:', error);
      }
    };

    initOneSignal();
  }, [user]);

  return null;
}