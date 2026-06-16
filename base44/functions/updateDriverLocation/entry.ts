import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { initializeApp } from 'npm:firebase/app';
import { getDatabase, ref, set } from 'npm:firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBL6Qf3AJ2ok677k7fWXST6ERWMoBYfXR4",
  authDomain: "rapido-presto-1c781.firebaseapp.com",
  databaseURL: "https://rapido-presto-1c781-default-rtdb.firebaseio.com",
  projectId: "rapido-presto-1c781",
  storageBucket: "rapido-presto-1c781.firebasestorage.app",
  messagingSenderId: "652897600858",
  appId: "1:652897600858:web:8ed91cfbce1cd77debdf63"
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { orderId, lat, lng } = await req.json();

    if (!orderId || !lat || !lng) {
      return Response.json({ error: 'Paramètres manquants: orderId, lat, lng requis' }, { status: 400 });
    }

    // Initialiser Firebase dans le handler
    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    // Vérifier que l'utilisateur est bien le livreur
    const orders = await base44.entities.Order.filter({ id: orderId });
    if (!orders || orders.length === 0) {
      return Response.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    if (orders[0].driver_id !== user.id) {
      return Response.json({ error: 'Vous n\'êtes pas le livreur de cette commande' }, { status: 403 });
    }

    // Mettre à jour Firebase
    const deliveryRef = ref(database, `deliveries/${orderId}`);
    await set(deliveryRef, {
      driver_id: user.id,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      status: orders[0].status,
      last_update: Date.now()
    });

    // Backup dans Base44
    await base44.entities.Order.update(orderId, {
      driver_location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        timestamp: new Date().toISOString()
      }
    });

    return Response.json({ success: true, message: 'Position mise à jour' });

  } catch (error) {
    console.error('Erreur:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});