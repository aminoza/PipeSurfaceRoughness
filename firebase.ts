import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDS5aOR6j1gna5zLR9ifN4R4k9q8ElwCp8",
  authDomain: "pipesurfaceroughness.firebaseapp.com",
  projectId: "pipesurfaceroughness",
  storageBucket: "pipesurfaceroughness.firebasestorage.app",
  messagingSenderId: "268278480993",
  appId: "1:268278480993:web:e47eed53b135a134deea20",
  measurementId: "G-VMYD77SGNK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

export { db, analytics, collection, addDoc, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc };