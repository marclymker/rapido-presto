import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');

async function sendOneSignalNotification(userIds, title, message, url = "https://rapido.ht") {
  if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) return;

  // Nettoyage des IDs pour éviter les valeurs nulles
  const activeIds = userIds.filter(id => id != null);
  if (activeIds.length === 0) return;

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        // Correction ici : Utilisation du nouveau format de ciblage externe
        include_external_user_ids: activeIds, 
        // On met "en" par défaut ET "fr" pour être sûr que ça s'affiche partout
        headings: { en: title, fr: title },
        contents: { en: message, fr: message },
        launch_url: url,
        priority: 10,
        // Paramètres pour forcer le réveil du téléphone
        android_accent_color: "FFFF5722", // Couleur orange Rapido
        small_icon: "ic_stat_onesignal_default",
        content_available: true, // Important pour le réveil en arrière-plan
      })
    });

    const result = await response.json();
    console.log(`Résultat OneSignal pour ${activeIds.length} users:`, result);
  } catch (error) {
    console.error('Erreur fetch OneSignal:', error);
  }
}

Deno.serve(async (req) => {
  // ... (Ton code de récupération de commande reste identique jusqu'au switch)
  
  // Petit ajustement dans le switch pour la cohérence
  switch (status) {
    case 'pending':
      // Client
      await sendOneSignalNotification([order.client_id], '✅ Commande confirmée', `Votre commande #${order.order_number} est en cours.`);
      // Marchand
      if (shop?.user_id) {
        await sendOneSignalNotification([shop.user_id], '💰 Nouvelle Commande !', `Reçue : ${order.total} HTG`, `${baseUrl}/entreprise/orders`);
      }
      break;
    // ... reste des cases
  }
});