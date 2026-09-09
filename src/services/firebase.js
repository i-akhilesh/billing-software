import { initializeApp } from 'firebase/app';
import { getFirestore, enableMultiTabIndexedDbPersistence, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAmhzuxaRsAhpj8XarbUCSwYWK32RNGTNg",
    authDomain: "billing-app-73850.firebaseapp.com",
    projectId: "billing-app-73850",
    storageBucket: "billing-app-73850.firebasestorage.app",
    messagingSenderId: "426804236057",
    appId: "1:426804236057:web:333ab4f69c765a9e1f7f88",
    measurementId: "G-VLD1STT2PF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Enable offline persistence for Firestore
if (typeof window !== 'undefined') {
    enableMultiTabIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            enableIndexedDbPersistence(db).catch((e) => console.warn('Firestore persistence failed:', e));
        } else if (err.code === 'unimplemented') {
            console.warn('The current browser does not support Firestore persistence');
        }
    });
}

export default app;
