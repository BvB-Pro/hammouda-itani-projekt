// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";


// ⬇️ Hier DEINE echten Werte aus der Console einfügen
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBQNtE_uMdMC1Wb8HnOjyteNIklvd7_eqU",
  authDomain: "hammouda-itani-stiftung.firebaseapp.com",
  projectId: "hammouda-itani-stiftung",
  storageBucket: "hammouda-itani-stiftung.appspot.com",
  messagingSenderId: "618009078772",
  appId: "1:618009078772:web:11ad079958edfb9fb627a1",
  measurementId: "G-5PVQMJR6EK"
};

const app  = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// Login-Helfer
const toEmail = (username) => `${String(username).trim().toLowerCase()}@stiftung.local`;

let _resolveAuthReady;
export const authReady = new Promise(res => _resolveAuthReady = res);

onAuthStateChanged(auth, (user) => {
  document.documentElement.dataset.auth = user ? "in" : "out";
  const badge = document.querySelector("#userBadge");
  if (badge) {
    badge.textContent = user ? (user.displayName || user.email.split("@")[0]) : "Gast";
  }
  _resolveAuthReady?.(user || null);
});

export async function loginWithUsername(username, password) {
  const email = toEmail(username);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}
export function logout(){ return signOut(auth); }
export async function setDisplayName(name){
  if (auth.currentUser && name) await updateProfile(auth.currentUser, { displayName:name });
}

