
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBL6Qf3AJ2ok677k7fWXST6ERWMoBYfXR4",
  authDomain: "rapido-presto-1c781.firebaseapp.com",
  databaseURL: "https://rapido-presto-1c781-default-rtdb.firebaseio.com",
  projectId: "rapido-presto-1c781",
  storageBucket: "rapido-presto-1c781.firebasestorage.app",
  messagingSenderId: "652897600858",
  appId: "1:652897600858:web:8ed91cfbce1cd77debdf63",
  measurementId: "G-KHJ8RZNBSD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };
