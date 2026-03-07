import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
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
const analytics = getAnalytics(app);

// Initialize Services
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
