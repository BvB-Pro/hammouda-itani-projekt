// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// TODO: Deine Config eintragen
const firebaseConfig = {
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  appId: "...",
};

const app  = initializeApp(firebaseConfig);
export const db   = getFirestore(app);
export const auth = getAuth(app);

// ---- Login mit "Benutzername" statt echter E-Mail ----
const toEmail = (username) => `${String(username).trim().toLowerCase()}@stiftung.local`;

// Promise, das erfüllt wird, wenn der Auth-Status feststeht
let _resolveAuthReady;
export const authReady = new Promise(res => _resolveAuthReady = res);

onAuthStateChanged(auth, (user) => {
  // Im DOM Bescheid sagen
  document.documentElement.dataset.auth = user ? "in" : "out";
  const badge = document.querySelector("#userBadge");
  if (badge) {
    badge.textContent = user ? (user.displayName || user.email.split("@")[0]) : "Gast";
  }
  _resolveAuthReady?.(user || null);
});

// API für app.js
export async function loginWithUsername(username, password) {
  const email = toEmail(username);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}
export function logout(){ return signOut(auth); }
export async function setDisplayName(name){
  if (auth.currentUser && name) await updateProfile(auth.currentUser, { displayName:name });
}
