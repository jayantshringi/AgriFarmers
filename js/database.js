// ============================================================
//  js/database.js
//  Firestore CRUD operations with LocalStorage fallback
// ============================================================

import { db } from './firebase-config.js';
import {
    doc,
    setDoc,
    getDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Helper: Normalize mobile key
function getMobileKey(identifier) {
    if (!identifier) return '';
    return identifier.replace(/\D/g, '');
}

// ── Save a brand-new user after signup ──────────────────────
export async function saveUserToFirestore(uidOrMobile, userData) {
    const mobileKey = getMobileKey(userData.mobile || uidOrMobile);
    const userPayload = {
        name: userData.name,
        mobile: userData.mobile || mobileKey,
        state: userData.state,
        district: userData.district,
        updatedAt: new Date().toISOString()
    };

    // Always cache locally so offline / instant reload works 100%
    if (mobileKey) {
        localStorage.setItem('agrifarmers_profile_' + mobileKey, JSON.stringify({ uid: uidOrMobile, ...userPayload }));
    }

    try {
        const docId = uidOrMobile || mobileKey;
        await setDoc(doc(db, 'users', docId), {
            ...userPayload,
            createdAt: serverTimestamp(),
            lastLogin: serverTimestamp()
        }, { merge: true });
        console.log('✅ User saved to Firestore:', docId);
    } catch (error) {
        console.warn('⚠️ Firestore write warning (cached locally):', error);
    }
}

// ── Fetch user profile from Firestore or local storage ──────
export async function getUserFromFirestore(uidOrMobile) {
    const mobileKey = getMobileKey(uidOrMobile);

    // 1. Try Local Storage first for fast load
    if (mobileKey) {
        const cached = localStorage.getItem('agrifarmers_profile_' + mobileKey);
        if (cached) {
            try { return JSON.parse(cached); } catch (_) {}
        }
    }

    // 2. Try Firestore
    try {
        const docId = uidOrMobile || mobileKey;
        const docRef = doc(db, 'users', docId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = { uid: docSnap.id, ...docSnap.data() };
            if (mobileKey) {
                localStorage.setItem('agrifarmers_profile_' + mobileKey, JSON.stringify(data));
            }
            return data;
        }
    } catch (error) {
        console.warn('⚠️ Firestore fetch error, fallback to local storage:', error);
    }

    return null;
}

// ── Update last login timestamp ──────────────────────────────
export async function updateLastLogin(uidOrMobile) {
    const mobileKey = getMobileKey(uidOrMobile);
    try {
        const docId = uidOrMobile || mobileKey;
        await updateDoc(doc(db, 'users', docId), {
            lastLogin: serverTimestamp()
        });
    } catch (error) {
        console.warn('⚠️ Could not update last login in Firestore:', error);
    }
}

