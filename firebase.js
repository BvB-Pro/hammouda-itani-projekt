// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ⬇️ Hier DEINE echten Werte aus der Console einfügen
const firebaseConfig = {
  apiKey: "AI...deinKey...",
  authDomain: "dein-projekt.firebaseapp.com",
  projectId: "dein-projekt",
  appId: "1:1234567890:web:abc123def456",
  // optional je nach Projekt:
  storageBucket: "dein-projekt.appspot.com",
  messagingSenderId: "1234567890",
  measurementId: "G-XXXXXXX"
};

const app  = initializeApp(firebaseConfig);
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

