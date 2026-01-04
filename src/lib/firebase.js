// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from "firebase/firestore";

// Your web app's Firebase configuration
// TODO: Replace with user's config
const firebaseConfig = {
    apiKey: "AIzaSyA2H2APerJH9BQnDIhv0JGaYTNoNWRn-1E",
    authDomain: "habittracker-b6ec8.firebaseapp.com",
    projectId: "habittracker-b6ec8",
    storageBucket: "habittracker-b6ec8.firebasestorage.app",
    messagingSenderId: "280063930300",
    appId: "1:280063930300:web:b478861b638a586f16c5b9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with persistent cache
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});
