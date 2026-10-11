// Authentication service.
//
// By default this uses a simple local (browser-only) auth implementation so
// the app runs immediately with zero setup. Set VITE_AUTH_PROVIDER=firebase
// and fill in the VITE_FIREBASE_* variables in .env to switch to real
// Firebase Authentication with no other code changes required by the app.

export interface AppUser {
  uid: string;
  name: string;
  email: string;
}

const PROVIDER = import.meta.env.VITE_AUTH_PROVIDER || 'local';

// ---------------------------------------------------------------------------
// Local (browser-only) auth — passwords hashed with SubtleCrypto, never sent
// anywhere. Good enough for a student prototype; swap to Firebase for
// production use.
// ---------------------------------------------------------------------------

interface LocalUserRecord {
  uid: string;
  name: string;
  email: string;
  passwordHash: string;
}

const USERS_KEY = 'dms_local_users';
const SESSION_KEY = 'dms_local_session';

async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder().encode(password);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function getLocalUsers(): LocalUserRecord[] {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveLocalUsers(users: LocalUserRecord[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function localRegister(name: string, email: string, password: string): Promise<AppUser> {
  const users = getLocalUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error('An account with this email already exists.');
  }
  const uid = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  users.push({ uid, name, email, passwordHash });
  saveLocalUsers(users);
  const user: AppUser = { uid, name, email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

async function localLogin(email: string, password: string): Promise<AppUser> {
  const users = getLocalUsers();
  const record = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!record) throw new Error('No account found with this email.');
  const passwordHash = await hashPassword(password);
  if (passwordHash !== record.passwordHash) {
    throw new Error('Incorrect password.');
  }
  const user: AppUser = { uid: record.uid, name: record.name, email: record.email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

function localLogout(): void {
  localStorage.removeItem(SESSION_KEY);
}

function localGetCurrentUser(): AppUser | null {
  const raw = localStorage.getItem(SESSION_KEY);
  return raw ? JSON.parse(raw) : null;
}

// ---------------------------------------------------------------------------
// Firebase auth (optional) — only imported/initialized if selected, so the
// firebase package is not a hard requirement for running the local demo.
// ---------------------------------------------------------------------------

async function firebaseRegister(name: string, email: string, password: string): Promise<AppUser> {
  const { initializeApp } = await import('firebase/app');
  const { getAuth, createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');

  const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  });
  const auth = getAuth(app);
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  return { uid: cred.user.uid, name, email };
}

async function firebaseLogin(email: string, password: string): Promise<AppUser> {
  const { initializeApp } = await import('firebase/app');
  const { getAuth, signInWithEmailAndPassword } = await import('firebase/auth');

  const app = initializeApp({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  });
  const auth = getAuth(app);
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return {
    uid: cred.user.uid,
    name: cred.user.displayName || 'Driver',
    email: cred.user.email || email
  };
}

// ---------------------------------------------------------------------------
// Public API — the rest of the app only talks to these functions.
// ---------------------------------------------------------------------------

export async function registerUser(name: string, email: string, password: string): Promise<AppUser> {
  if (PROVIDER === 'firebase') return firebaseRegister(name, email, password);
  return localRegister(name, email, password);
}

export async function loginUser(email: string, password: string): Promise<AppUser> {
  if (PROVIDER === 'firebase') return firebaseLogin(email, password);
  return localLogin(email, password);
}

export function logoutUser(): void {
  // Firebase sign-out would be handled here too if that provider is active;
  // for the prototype, clearing the local session is sufficient either way.
  localLogout();
}

export function getCurrentUser(): AppUser | null {
  return localGetCurrentUser();
}
