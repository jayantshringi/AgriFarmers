// ============================================================
//  js/firebase-config.js
//  Replace the placeholder values below with YOUR Firebase
//  project config from:
//  Firebase Console → Project Settings → Your Apps → Web App
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔴 REPLACE THESE WITH YOUR OWN FIREBASE CONFIG VALUES
const firebaseConfig = {
    apiKey: "AIzaSyBg1fdCaFi4Pwi55T7OyE0gk4h_XvtGPjg",
    authDomain: "agrifarmers-sih-2025.firebaseapp.com",
    projectId: "agrifarmers-sih-2025",
    storageBucket: "agrifarmers-sih-2025.firebasestorage.app",
    messagingSenderId: "934965378106",
    appId: "1:934965378106:web:737aaf131fc619640f4903"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
