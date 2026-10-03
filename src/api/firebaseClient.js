import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, where, orderBy, limit as firestoreLimit, serverTimestamp,
} from 'firebase/firestore';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, OAuthProvider,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDzUCvw-ZsA7Q8WsYcOE0mInNmfAcuFCg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'rapido-presto-f072a.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'rapido-presto-f072a',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'rapido-presto-f072a.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '553324736782',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:553324736782:web:920540c4a9cc4aee7a675f',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-MSRQPDQJ5S',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://rapido-presto-f072a-default-rtdb.firebaseio.com',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const database = getDatabase(app);
export const auth = getAuth(app);

const safeLimit = (value) => Math.min(Math.max(Number(value) || 100, 1), 500);
const createEntityHandler = (entityName) => ({
  async list(sortField, maxLimit = 100) {
    try {
      const colRef = collection(db, entityName);
      const constraints = [];
      if (sortField) {
        const isDesc = sortField.startsWith('-');
        constraints.push(orderBy(isDesc ? sortField.slice(1) : sortField, isDesc ? 'desc' : 'asc'));
      }
      constraints.push(firestoreLimit(safeLimit(maxLimit)));
      const snapshot = await getDocs(query(colRef, ...constraints));
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (err) {
      console.error(`Erreur list ${entityName}:`, err);
      return [];
    }
  },
  async filter(filterObj = {}, sortField, maxLimit = 100) {
    try {
      const constraints = Object.entries(filterObj).filter(([, val]) => val !== undefined && val !== null).map(([key, val]) => where(key, '==', val));
      if (sortField) {
        const isDesc = sortField.startsWith('-');
        constraints.push(orderBy(isDesc ? sortField.slice(1) : sortField, isDesc ? 'desc' : 'asc'));
      }
      constraints.push(firestoreLimit(safeLimit(maxLimit)));
      const snapshot = await getDocs(query(collection(db, entityName), ...constraints));
      return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    } catch (err) {
      console.error(`Erreur filter ${entityName}:`, err);
      return [];
    }
  },
  async get(id) {
    if (!id) return null;
    try {
      const snapshot = await getDoc(doc(db, entityName, String(id)));
      return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
    } catch (err) {
      console.error(`Erreur get ${entityName}:`, err);
      return null;
    }
  },
  async create(data) {
    const payload = { ...data, created_date: serverTimestamp() };
    const ref = await addDoc(collection(db, entityName), payload);
    return { id: ref.id, ...payload };
  },
  async update(id, data) {
    if (!id) throw new Error('Identifiant de document requis');
    const payload = { ...data, updated_date: serverTimestamp() };
    await updateDoc(doc(db, entityName, String(id)), payload);
    return { id, ...payload };
  },
  async delete(id) {
    if (!id) throw new Error('Identifiant de document requis');
    await deleteDoc(doc(db, entityName, String(id)));
    return { success: true, id };
  },
});

const currentUser = () => {
  const user = auth.currentUser;
  return user ? { id: user.uid, email: user.email, full_name: user.displayName || user.email?.split('@')[0], avatar_url: user.photoURL, current_profile: 'client' } : null;
};

export const firebase = {
  entities: new Proxy({}, { get: (target, prop) => createEntityHandler(prop) }),
  auth: {
    async me() {
      if (auth.authStateReady) await auth.authStateReady();
      return currentUser();
    },
    redirectToLogin(nextUrl = '/Account') { window.location.href = `/Login?from_url=${encodeURIComponent(nextUrl)}`; },
    async updateMe(data) {
      const user = auth.currentUser;
      if (!user) return null;
      await setDoc(doc(db, 'User', user.uid), { ...data, updated_date: serverTimestamp() }, { merge: true });
      return { id: user.uid, ...data };
    },
    async loginViaEmailPassword(email, password) {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      return { access_token: await cred.user.getIdToken(), user: { id: cred.user.uid, email: cred.user.email } };
    },
    async signupViaEmailPassword(email, password, extraData = {}) {
      if (typeof password !== 'string' || password.length < 8) throw new Error('Le mot de passe doit contenir au moins 8 caractères.');
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await setDoc(doc(db, 'User', cred.user.uid), { email: email.trim(), ...extraData, created_date: serverTimestamp() });
      return { access_token: await cred.user.getIdToken(), user: { id: cred.user.uid, email: cred.user.email } };
    },
    async loginWithProvider(providerName = 'google') {
      const provider = providerName === 'apple' ? new OAuthProvider('apple.com') : new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      return { access_token: await cred.user.getIdToken(), user: { id: cred.user.uid, email: cred.user.email, full_name: cred.user.displayName } };
    },
    async logout() { await signOut(auth); window.location.href = '/'; },
    onAuthStateChanged(callback) { return onAuthStateChanged(auth, () => callback(currentUser())); },
  },
  functions: {
    async invoke(name, params = {}) {
      const baseUrl = import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || 'https://us-central1-rapido-presto-f072a.cloudfunctions.net/api';
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(name)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(params), credentials: 'omit',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'La fonction Firebase a échoué.');
      return { data };
    },
  },
};
