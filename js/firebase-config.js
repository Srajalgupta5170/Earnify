// Firebase Configuration
// Replace this with your own Firebase Project Configuration

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBLuAodyq5w2yESWFo04GbCrxRMQj5eZ8Y",
    authDomain: "earnify-62e39.firebaseapp.com",
    projectId: "earnify-62e39",
    storageBucket: "earnify-62e39.firebasestorage.app",
    messagingSenderId:  "868888074417",
    appId:  "1:868888074417:web:766c5bec702d830bc2aa90",
    measurementId: "G-JT2CZ8CJVG"

};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
