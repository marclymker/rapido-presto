
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyCUyAlOkYW-ytQ0YbLI477dIttYnI5Kz3Y",
  authDomain: "rapido-presto-f072a.firebaseapp.com",
  databaseURL: "https://rapido-presto-f072a-default-rtdb.firebaseio.com",
  projectId: "rapido-presto-f072a",
  storageBucket: "rapido-presto-f072a.firebasestorage.app",
  messagingSenderId: "553324736782",
  appId: "1:553324736782:web:16327826263743a77a675f",
  measurementId: "G-NK2TS9SYQ8"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
