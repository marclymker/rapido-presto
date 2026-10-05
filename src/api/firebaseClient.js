import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
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

const hydrateAuthUser = async (firebaseUser) => {
  if (!firebaseUser) return null;
  const snapshot = await getDoc(doc(db, 'User', firebaseUser.uid));
  const profileData = snapshot.exists() ? snapshot.data() : {};
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email,
    full_name: firebaseUser.displayName || firebaseUser.email?.split('@')[0],
    avatar_url: firebaseUser.photoURL,
    ...profileData,
    current_profile: profileData.current_profile || 'client',
    profiles: profileData.profiles || {
      client: { is_active: true },
    },
  };
};

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
      // setDoc + merge gère aussi le premier profil Google/Apple
      // lorsque le document Firestore n'a pas encore été créé.
      await setDoc(docRef, payload, { merge: true });
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

export const firebaseApi = {
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
      return hydrateAuthUser(user);
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
        console.error("Mise à jour profil:", e);
        throw e;
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
      return onAuthStateChanged(auth, async (user) => {
        if (!user) {
          callback(null);
          return;
        }
        try {
          callback(await hydrateAuthUser(user));
        } catch (error) {
          console.warn('Hydratation du profil utilisateur:', error);
          callback({ id: user.uid, email: user.email, full_name: user.displayName || user.email?.split('@')[0], current_profile: 'client', profiles: { client: { is_active: true } } });
        }
      });
    }
  },

  functions: {
    async invoke(funcName, params = {}) {
      const supportedFunctions = new Set(['validateOrderPrice']);
      if (!supportedFunctions.has(funcName)) {
        throw new Error(`Fonction Firebase non disponible: ${funcName}`);
      }
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!token) throw new Error('Connexion requise pour cette opération');
      const response = await fetch(`/functions/${encodeURIComponent(funcName)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(params)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || data.success === false) {
        throw new Error(data.error || `Erreur Firebase (${response.status})`);
      }
      return { data };
    }
  },

  integrations: {
    Core: {
      async UploadFile({ file }) {
        if (!(file instanceof File)) throw new Error('Fichier invalide');
        if (file.size > 10 * 1024 * 1024) throw new Error('La photo ne doit pas dépasser 10 Mo');
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        if (!auth.currentUser?.uid) throw new Error('Connexion requise pour envoyer une photo');
        const path = `users/${auth.currentUser.uid}/${Date.now()}-${safeName}`;
        const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
        const storage = getStorage(app);
        const snapshot = await uploadBytes(ref(storage, path), file, { contentType: file.type || 'image/jpeg' });
        return { file_url: await getDownloadURL(snapshot.ref), path };
      },

      // L’analyse IA ne doit jamais empêcher la publication si le service
      // externe est indisponible. Les écrans utilisent ces champs de façon
      // optionnelle et continuent avec les données saisies par l’utilisateur.
      async InvokeLLM() {
        return { has_phone: false, description: '', category: '', tags: [] };
      }
    }
  }
};
