import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { arrayUnion, serverTimestamp } from 'firebase/firestore';
import { app, auth, db } from '@/api/firebaseClient';

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || undefined;

export async function isWebPushSupported() {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

export async function registerWebPushToken() {
  if (!(await isWebPushSupported())) return { supported: false, token: null };
  if (Notification.permission !== 'granted') return { supported: true, token: null };
  const user = auth.currentUser;
  if (!user) return { supported: true, token: null };

  const registration = await navigator.serviceWorker.ready;
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    serviceWorkerRegistration: registration,
    ...(VAPID_KEY ? { vapidKey: VAPID_KEY } : {}),
  });
  if (!token) return { supported: true, token: null };

  await import('firebase/firestore').then(({ doc, setDoc }) => setDoc(
    doc(db, 'User', user.uid),
    {
      web_push_tokens: arrayUnion(token),
      web_push_enabled: true,
      web_push_updated_at: serverTimestamp(),
    },
    { merge: true },
  ));

  return { supported: true, token };
}

export async function listenForForegroundMessages(callback) {
  if (!(await isWebPushSupported())) return () => {};
  const messaging = getMessaging(app);
  return onMessage(messaging, (payload) => callback?.(payload));
}
