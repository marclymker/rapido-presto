import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { initializeApp } from 'npm:firebase/app';
import { getDatabase, ref, set } from 'npm:firebase/database';

// Configuration Firebase (utilise les mêmes variables d'environnement)
const firebaseConfig = {
  apiKey: Deno.env.get('VITE_FIREBASE_API_KEY'),
  authDomain: Deno.env.get('VITE_FIREBASE_AUTH_DOMAIN'),
  databaseURL: Deno.env.get('VITE_FIREBASE_DATABASE_URL'),
  projectId: Deno.env.get('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: Deno.env.get('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: Deno.env.get('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: Deno.env.get('VITE_FIREBASE_APP_ID')
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { orderId, lat, lng } = await req.json();

    if (!orderId || !lat || !lng) {
      return Response.json({ 
        error: 'Paramètres manquants: orderId, lat, lng requis' 
      }, { status: 400 });
    }

    // Vérifier que l'utilisateur est bien le livreur de cette commande
    const order = await base44.entities.Order.list({ id: orderId });
    if (!order || order.length === 0) {
      return Response.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    if (order[0].driver_id !== user.id) {
      return Response.json({ 
        error: 'Vous n\'êtes pas le livreur de cette commande' 
      }, { status: 403 });
    }

    // Mettre à jour Firebase Realtime Database
    const deliveryRef = ref(database, `deliveries/${orderId}`);
    await set(deliveryRef, {
      driver_id: user.id,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      status: order[0].status,
      last_update: Date.now()
    });

    // Mettre à jour aussi dans Base44 pour avoir un backup
    await base44.entities.Order.update(orderId, {
      driver_location: {
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        timestamp: new Date().toISOString()
      }
    });

    return Response.json({ 
      success: true,
      message: 'Position mise à jour'
    });

  } catch (error) {
    console.error('Erreur:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});