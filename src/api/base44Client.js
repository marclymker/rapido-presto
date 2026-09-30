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

// Clés officielles de votre projet Google Firebase
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

// Fenêtre de connexion interactive Kairos
function showAuthModal() {
  const existing = document.getElementById("kairos-auth-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "kairos-auth-modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.65);display:flex;align-items:center;justify-content:center;z-index:99999;backdrop-filter:blur(4px);font-family:system-ui,-apple-system,sans-serif;";

  modal.innerHTML = `
    <div style="background:white;border-radius:18px;padding:28px;width:90%;max-width:390px;position:relative;color:#1f2937;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
      <button id="kairos-close-btn" style="position:absolute;top:14px;right:16px;border:none;background:transparent;font-size:24px;cursor:pointer;color:#9ca3af;line-height:1;">&times;</button>
      <h3 style="font-size:20px;font-weight:700;margin:0 0 6px;text-align:center;">Connexion Kairos</h3>
      <p style="font-size:13px;color:#6b7280;text-align:center;margin:0 0 20px;">Connectez-vous pour accéder à votre boutique et vos commandes.</p>
      
      <button id="kairos-google-btn" style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:white;border:1px solid #d1d5db;border-radius:10px;padding:11px;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:14px;transition:background 0.2s;">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3h3.86c2.26-2.09 3.68-5.17 3.68-9.09z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.34 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
        Continuer avec Google
      </button>

      <div style="display:flex;align-items:center;margin-bottom:14px;color:#9ca3af;font-size:12px;">
        <div style="flex:1;height:1px;background:#e5e7eb;"></div>
        <span style="padding:0 8px;">OU PAR EMAIL</span>
        <div style="flex:1;height:1px;background:#e5e7eb;"></div>
      </div>

      <input id="kairos-email" type="email" placeholder="Adresse e-mail" style="width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;font-size:14px;margin-bottom:10px;outline:none;" />
      <input id="kairos-password" type="password" placeholder="Mot de passe" style="width:100%;box-sizing:border-box;border:1px solid #d1d5db;border-radius:8px;padding:10px 12px;font-size:14px;margin-bottom:14px;outline:none;" />
      
      <button id="kairos-submit-btn" style="width:100%;background:#ea580c;color:white;border:none;border-radius:8px;padding:11px;font-size:14px;font-weight:600;cursor:pointer;">Se connecter / S'inscrire</button>
      <div id="kairos-error" style="color:#dc2626;font-size:12px;margin-top:10px;text-align:center;display:none;"></div>
    </div>
  `;

  document.body.appendChild(modal);

  document.getElementById("kairos-close-btn").onclick = () => modal.remove();

  document.getElementById("kairos-google-btn").onclick = async () => {
    try {
      await base44.auth.loginWithProvider("google");
      modal.remove();
      window.location.reload();
    } catch (e) {
      const err = document.getElementById("kairos-error");
      err.innerText = e.message;
      err.style.display = "block";
    }
  };

  document.getElementById("kairos-submit-btn").onclick = async () => {
    const email = document.getElementById("kairos-email").value.trim();
    const pass = document.getElementById("kairos-password").value;
    const err = document.getElementById("kairos-error");
    if (!email || !pass) {
      err.innerText = "Veuillez renseigner votre email et mot de passe.";
      err.style.display = "block";
      return;
    }
    try {
      try {
        await base44.auth.loginViaEmailPassword(email, pass);
      } catch (loginErr) {
        if (loginErr.code === "auth/user-not-found" || loginErr.code === "auth/invalid-credential") {
          await base44.auth.signupViaEmailPassword(email, pass);
        } else {
          throw loginErr;
        }
      }
      modal.remove();
      window.location.reload();
    } catch (e) {
      err.innerText = e.message || "Erreur lors de la connexion.";
      err.style.display = "block";
    }
  };
}

// Gestionnaire dynamique universel pour vos 16 tables (Product, Shop, Order, CartItem, etc.)
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
  // Gère automatiquement toutes vos entités
  entities: new Proxy({}, {
    get(target, prop) {
      return createEntityHandler(prop);
    }
  }),

  // Module d'envoi de photos et fichiers
  integrations: {
    Core: {
      async UploadFile({ file }) {
        return new Promise((resolve, reject) => {
          if (!file) return reject(new Error("Aucun fichier fourni"));
          const reader = new FileReader();
          reader.onload = () => resolve({ file_url: reader.result });
          reader.onerror = (e) => reject(e);
          reader.readAsDataURL(file);
        });
      }
    }
  },

  // Module d'authentification complet
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

    // Déclencheurs de la fenêtre de connexion
    redirectToLogin() {
      showAuthModal();
    },

    login() {
      showAuthModal();
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
      let provider = providerName === 'apple' ? new OAuthProvider('apple.com') : new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      return {
        access_token: await cred.user.getIdToken(),
        user: { id: cred.user.uid, email: cred.user.email, full_name: cred.user.displayName }
      };
    },

    async logout() {
      await signOut(auth);
      window.location.reload();
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
