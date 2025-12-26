import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from './firebaseConfig';

export function useRealtimeDriverLocation(orderId) {
  const [driverLocation, setDriverLocation] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const deliveryRef = ref(database, `deliveries/${orderId}`);

    const unsubscribe = onValue(deliveryRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.lat && data.lng) {
        setDriverLocation({
          lat: data.lat,
          lng: data.lng,
          timestamp: data.last_update
        });
        setIsConnected(true);
      }
    }, (error) => {
      console.error('Firebase error:', error);
      setIsConnected(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  return { driverLocation, isConnected };
}