// Firebase config (user-provided)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDUxQyytZhCwvlfEJ63cMQ8S2ZawjTVLZI",
  authDomain: "trickortreat-f543b.firebaseapp.com",
  projectId: "trickortreat-f543b",
  storageBucket: "trickortreat-f543b.firebasestorage.app",
  messagingSenderId: "411002442315",
  appId: "1:411002442315:web:377af139854f8f5932b3ce"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
