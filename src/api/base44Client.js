import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  serverTimestamp 
} from "firebase/firestore";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider
} from "firebase/auth";

// Vos clés officielles Google Firebase
const firebaseConfig = {
  apiKey: "AIzaSyC33gtUjuwvkgoEynx4HxoYpkEgPw2EK5k",
  authDomain: "rapido-presto-f072a.firebaseapp.com",
  projectId: "rapido-presto-f072a",
  storageBucket: "rapido-presto-f072a.firebasestorage.app",
  messagingSenderId: "553324736782",
  appId: "1:553324736782:web:920540c4a9cc4aee7a675f",
  measurementId: "G-MSRQPDQJ5S"
};

// Initialisation de Google Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// Gestionnaire dynamique universel pour vos 16 tables (Product, Shop, Order, etc.)
const createEntityHandler = (entityName) => ({
  async list(sortField, maxLimit = 100) {
    try {
      const colRef = collection(db, entityName);
      let q = colRef;
      if (sortField) {
        const isDesc = sortField.startsWith('-');
        const fieldName = isDesc ? sortField.substring(1) : sortField;
        q = query(colRef, orderBy(fieldName, isDesc ? 'desc' : 'asc'), firestoreLimit(maxLimit));
      } else {
        q = query(colRef, firestoreLimit(maxLimit));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error(`Erreur list ${entityName}:`, err);
      return [];
    }
  },

  async filter(filterObj = {}, sortField, maxLimit = 100) {
    try {
      const colRef = collection(db, entityName);
      let constraints = [];
      Object.entries(filterObj).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          constraints.push(where(key, "==", val));
        }
      });
      if (sortField) {
        const isDesc = sortField.startsWith('-');
        const fieldName = isDesc ? sortField.substring(1) : sortField;
        constraints.push(orderBy(fieldName, isDesc ? 'desc' : 'asc'));
      }
      constraints.push(firestoreLimit(maxLimit));
      const q = query(colRef, ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.error(`Erreur filter ${entityName}:`, err);
      return [];
    }
  },

  async get(id) {
    try {
      const docRef = doc(db, entityName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (err) {
      console.error(`Erreur get ${entityName}:`, err);
      return null;
    }
  },

  async create(data) {
    try {
      const colRef = collection(db, entityName);
      const payload = { ...data, created_date: serverTimestamp() };
      const docRef = await addDoc(colRef, payload);
      return { id: docRef.id, ...payload };
    } catch (err) {
      console.error(`Erreur create ${entityName}:`, err);
      throw err;
    }
  },

  async update(id, data) {
    try {
      const docRef = doc(db, entityName, id);
      const payload = { ...data, updated_date: serverTimestamp() };
      await updateDoc(docRef, payload);
      return { id, ...payload };
    } catch (err) {
      console.error(`Erreur update ${entityName}:`, err);
      throw err;
    }
  },

  async delete(id) {
    try {
      const docRef = doc(db, entityName, id);
      await deleteDoc(docRef);
      return { success: true, id };
    } catch (err) {
      console.error(`Erreur delete ${entityName}:`, err);
      throw err;
    }
  }
});

// Objet de remplacement universel pour Base44
export const base44 = {
  // Gère automatiquement toutes vos entités (Product, Shop, Order, CartItem, etc.)
  entities: new Proxy({}, {
    get(target, prop) {
      return createEntityHandler(prop);
    }
  }),

  // Module d'authentification Google
  auth: {
    async me() {
      const user = auth.currentUser;
      if (!user) return null;
      return {
        id: user.uid,
        email: user.email,
        full_name: user.displayName || user.email?.split('@')[0],
        avatar_url: user.photoURL
      };
    },

    async loginViaEmailPassword(email, password) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return {
        access_token: await cred.user.getIdToken(),
        user: { id: cred.user.uid, email: cred.user.email }
      };
    },

    async signupViaEmailPassword(email, password, extraData = {}) {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "User", cred.user.uid), {
        email,
        ...extraData,
        created_date: serverTimestamp()
      });
      return {
        access_token: await cred.user.getIdToken(),
        user: { id: cred.user.uid, email }
      };
    },

    async loginWithProvider(providerName) {
      let provider;
      if (providerName === 'google') {
        provider = new GoogleAuthProvider();
      } else if (providerName === 'apple') {
        provider = new OAuthProvider('apple.com');
      } else {
        provider = new GoogleAuthProvider();
      }
      const cred = await signInWithPopup(auth, provider);
      return {
        access_token: await cred.user.getIdToken(),
        user: { id: cred.user.uid, email: cred.user.email, full_name: cred.user.displayName }
      };
    },

    async logout() {
      await signOut(auth);
    },

    onAuthStateChanged(callback) {
      return onAuthStateChanged(auth, (user) => {
        if (!user) {
          callback(null);
        } else {
          callback({
            id: user.uid,
            email: user.email,
            full_name: user.displayName || user.email?.split('@')[0]
          });
        }
      });
    }
  }
};
