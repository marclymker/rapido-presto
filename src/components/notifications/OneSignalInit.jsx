import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

export default function OneSignalInit({ user }) {
  const initialized = useRef(false);

  useEffect(() => {
    if (!user || typeof window === 'undefined' || initialized.current) return;

    const initOneSignal = async () => {
      try {
        // Récupération de l'App ID depuis Supabase/Backend
        const { data } = await base44.functions.invoke('getOneSignalAppId');
        if (!data?.appId) return;

        // Vérifier si déjà initialisé
        if (window.OneSignal?.initialized) {
          console.log('[OneSignal] Already initialized, updating user only');
          await window.OneSignal.login(user.id);
          await window.OneSignal.sendTags({
            role: user.current_profile || 'client',
            zone: user.region || 'haiti',
            is_available: String(user.profiles?.livreur?.is_available || false)
          });
          return;
        }

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async (OneSignal) => {
          try {
            await OneSignal.init({
              appId: data.appId,
              allowLocalhostAsSecureOrigin: true,
              notifyButton: { enable: false },
              notificationClickHandlerMatch: 'origin',
              notificationClickHandlerAction: 'navigate',
              serviceWorkerParam: { scope: '/' },
              serviceWorkerPath: '/OneSignalSDKWorker.js'
            });

            // Demander permission immédiatement si pas encore accordée
            const permission = await OneSignal.Notifications.permission;
            if (!permission) {
              await OneSignal.Notifications.requestPermission();
            }
            
            await OneSignal.Notifications.setDefaultNotificationUrl(window.location.origin);

            // Identification
            await OneSignal.login(user.id);

            // Tags
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
          } catch (err) {
            // Ignorer les erreurs "SDK already initialized"
            if (!err.message?.includes('already initialized')) {
              throw err;
            }
          }
        });

        // Injection du script SDK (une seule fois)
        if (!document.getElementById('onesignal-script')) {
          const script = document.createElement('script');
          script.id = 'onesignal-script';
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
          script.async = true;
          document.head.appendChild(script);
        }

        initialized.current = true;
      } catch (error) {
        // Ignorer les erreurs OneSignal pour ne pas bloquer l'app
        if (!error.message?.includes('already initialized')) {
          console.error('[OneSignal] Init Error:', error);
        }
      }
    };

    initOneSignal();
  }, [user?.id, user?.current_profile]);

  return null;
}