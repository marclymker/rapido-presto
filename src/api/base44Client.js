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

const firebaseConfig = {
  apiKey: "AIzaSyDzUCvw-ZsA7Q8WsYcOE0ImInNmfAcuFCg",
  authDomain: "rapido-presto-f072a.firebaseapp.com",
  projectId: "rapido-presto-f072a",
  storageBucket: "rapido-presto-f072a.firebasestorage.app",
  messagingSenderId: "553324736782",
  appId: "1:553324736782:web:920540c4a9cc4aee7a675f",
  measurementId: "G-MSRQPDQJ5S"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

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

export const base44 = {
  entities: new Proxy({}, {
    get(target, prop) {
      return createEntityHandler(prop);
    }
  }),

  auth: {
    async me() {
      if (auth.authStateReady) {
        await auth.authStateReady();
      }
      const user = auth.currentUser;
      if (!user) return null;
      return {
        id: user.uid,
        email: user.email,
        full_name: user.displayName || user.email?.split('@')[0],
        avatar_url: user.photoURL,
        current_profile: 'client'
      };
    },

    // Ouvre la fenêtre Google en 1 clic et redirige vers la bonne page
    async redirectToLogin(nextUrl = '/Dashboard') {
      try {
        const provider = new GoogleAuthProvider();
        const cred = await signInWithPopup(auth, provider);
        if (cred?.user) {
          if (nextUrl && nextUrl.startsWith('/')) {
            window.location.href = nextUrl;
          } else {
            window.location.reload();
          }
        }
      } catch (err) {
        console.error("Erreur connexion Google:", err);
      }
    },

    async updateMe(data) {
      const user = auth.currentUser;
      if (!user) return null;
      try {
        const userRef = doc(db, "User", user.uid);
        await setDoc(userRef, { ...data, updated_date: serverTimestamp() }, { merge: true });
        return { id: user.uid, ...data };
      } catch (e) {
        console.warn("Mise à jour profil:", e);
        return { id: user.uid, ...data };
      }
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

    async loginWithProvider(providerName = 'google') {
      const provider = providerName === 'apple' ? new OAuthProvider('apple.com') : new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      return {
        access_token: await cred.user.getIdToken(),
        user: { id: cred.user.uid, email: cred.user.email, full_name: cred.user.displayName }
      };
    },

    async logout() {
      await signOut(auth);
      window.location.href = '/';
    },

    onAuthStateChanged(callback) {
      return onAuthStateChanged(auth, (user) => {
        if (!user) {
          callback(null);
        } else {
          callback({
            id: user.uid,
            email: user.email,
            full_name: user.displayName || user.email?.split('@')[0],
            avatar_url: user.photoURL,
            current_profile: 'client'
          });
        }
      });
    }
  },

  functions: {
    async invoke(funcName, params = {}) {
      console.log(`Fonction ${funcName} appelée:`, params);
      return { data: { success: true, converted: 0 } };
    }
  }
};
