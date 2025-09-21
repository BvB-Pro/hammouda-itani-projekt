const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

const db = admin.firestore();

const usernameToEmail = (u) => `${String(u).trim().toLowerCase()}@stiftung.local`;

/** Admin markieren (einmalig, von einem bestehenden Admin aus aufrufbar) */
exports.setAdminRole = functions.https.onCall(async (data, context) => {
  // nur Admin darf Admin ernennen
  if (context.auth?.token?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Nur Admin.');
  }
  const { uid, isAdmin } = data || {};
  if (!uid || typeof isAdmin !== 'boolean') {
    throw new functions.https.HttpsError('invalid-argument', 'uid & isAdmin benötigt.');
  }
  await admin.auth().setCustomUserClaims(uid, { role: isAdmin ? 'admin' : 'user' });
  return { ok: true };
});

/** Admin erstellt Benutzer (username + password + optional displayName) */
exports.createUserByAdmin = functions.https.onCall(async (data, context) => {
  if (context.auth?.token?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Nur Admin.');
  }
  const { username, password, displayName } = data || {};
  if (!username || !password) {
    throw new functions.https.HttpsError('invalid-argument', 'username & password nötig');
  }
  const email = usernameToEmail(username);
  const user = await admin.auth().createUser({ email, password, displayName: displayName || username });
  await db.doc(`users/${user.uid}`).set({
    username: username.toLowerCase(),
    displayName: displayName || username,
    mustChangePw: false,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { uid: user.uid };
});

/** Admin setzt Passwort zurück (+ optional mustChangePw Flag) */
exports.resetPasswordByAdmin = functions.https.onCall(async (data, context) => {
  if (context.auth?.token?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Nur Admin.');
  }
  const { uid, newPassword, mustChangePw = true } = data || {};
  if (!uid || !newPassword) {
    throw new functions.https.HttpsError('invalid-argument', 'uid & newPassword nötig');
  }
  await admin.auth().updateUser(uid, { password: newPassword });
  await db.doc(`users/${uid}`).set({ mustChangePw }, { merge: true });
  return { ok: true };
});

/** Admin: Benutzer auflisten (paginiert) – nur für UI-Übersicht */
exports.listUsersByAdmin = functions.https.onCall(async (data, context) => {
  if (context.auth?.token?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Nur Admin.');
  }
  const { nextPageToken } = data || {};
  const res = await admin.auth().listUsers(1000, nextPageToken);
  // Gib nur das Nötigste zurück
  const users = res.users.map(u => ({
    uid: u.uid,
    email: u.email,
    displayName: u.displayName || '',
  }));
  return { users, nextPageToken: res.pageToken || null };
});
