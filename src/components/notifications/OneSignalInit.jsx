import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function OneSignalInit({ user }) {
  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const initOneSignal = async () => {
      try {
        // 1. Récupération de l'App ID depuis votre backend
        const { data } = await base44.functions.invoke('getOneSignalAppId');
        if (!data?.appId) return;

        window.OneSignalDeferred = window.OneSignalDeferred || [];
        
        window.OneSignalDeferred.push(async function(OneSignal) {
          // Initialisation
          await OneSignal.init({
            appId: data.appId,
            allowLocalhostAsSecureOrigin: true,
          });

          // 2. Lier l'ID utilisateur pour pouvoir le cibler depuis le backend
          await OneSignal.login(user.id);

          // 3. Tags universels pour segmentation (Marchand, Client, Livreur)
          const tags = {
            user_id: user.id,
            role: user.current_profile || 'client',
            zone: user.region || 'haiti',
            is_available: String(user.profiles?.livreur?.is_available || false)
          };
          await OneSignal.sendTags(tags);

          // 4. GESTION DU CLIC : Rediriger l'utilisateur vers la bonne page
          OneSignal.Notifications.addEventListener("click", (event) => {
            const launchUrl = event.notification.launchURL;
            if (launchUrl) {
              window.location.href = launchUrl;
            }
          });
        });

        // Chargement du SDK si absent
        if (!document.getElementById('onesignal-script')) {
          const script = document.createElement('script');
          script.id = 'onesignal-script';
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
          script.defer = true;
          document.head.appendChild(script);
        }
      } catch (error) {
        console.error('❌ Erreur OneSignal:', error);
      }
    };

    initOneSignal();
  }, [user]);

  return null;
}