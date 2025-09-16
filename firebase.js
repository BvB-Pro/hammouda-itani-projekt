import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBQNtE_uMdMC1Wb8HnOjyteNIklvd7_eqU",
  authDomain: "hammouda-itani-stiftung.firebaseapp.com",
  projectId: "hammouda-itani-stiftung",
  storageBucket: "hammouda-itani-stiftung.firebasestorage.app",
  messagingSenderId: "618009078772",
  appId: "1:618009078772:web:11ad079958edfb9fb627a1",
  measurementId: "G-5PVQMJR6EK"
};

export const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// anonym einloggen
signInAnonymously(auth).catch(console.error);

// darauf wartet app.js
export const authReady = new Promise((resolve) => {
  onAuthStateChanged(auth, (user) => resolve(user));
});
