import { initializeApp, getApps, getApp, FirebaseOptions, FirebaseApp, deleteApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const STORAGE_KEY = 'firebase_config_json';
const APP_NAME = 'KichbanAI-ProMax'; // Unique name to ensure fresh config application

// Cấu hình Firebase trực tiếp từ Project của bạn
const hardcodedConfig: FirebaseOptions = {
  apiKey: "AIzaSyBf4E7TTclxm7on_VxpfeNQ6Rrf5n8JpSQ",
  authDomain: "kichban-ai-promax.firebaseapp.com",
  projectId: "kichban-ai-promax",
  storageBucket: "kichban-ai-promax.firebasestorage.app",
  messagingSenderId: "404942992556",
  appId: "1:404942992556:web:00f80eb662a0def45b9b09",
  measurementId: "G-V2E8CXB5D6"
};

// Helper to check if a config object seems valid
const isValidConfig = (cfg: any): boolean => {
  return !!(cfg && cfg.apiKey && cfg.apiKey.includes("AIza") && cfg.projectId && cfg.authDomain);
};

const getStoredConfig = (): FirebaseOptions | null => {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return isValidConfig(parsed) ? parsed : null;
  } catch (e) {
    return null;
  }
};

const getEnvConfig = (): FirebaseOptions | null => {
  const envConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_FIREBASE_APP_ID
  };
  return isValidConfig(envConfig) ? (envConfig as FirebaseOptions) : null;
};

// Prioritize hardcodedConfig if it's valid
const isHardcodedValid = isValidConfig(hardcodedConfig);
const activeConfig = isHardcodedValid ? hardcodedConfig : (getStoredConfig() || getEnvConfig() || hardcodedConfig);

export const isConfigured = isValidConfig(activeConfig);

let app: FirebaseApp;

try {
  // Use a named app to isolate this instance from potential default app collisions in HMR/Dev environments
  const existingApp = getApps().find(a => a.name === APP_NAME);
  
  if (existingApp) {
    app = existingApp;
  } else {
    app = initializeApp(activeConfig, APP_NAME);
  }
} catch (e) {
  console.error("Firebase Initialization Error:", e);
  // Fallback: try to get default app if named app fails, or create default
  if (getApps().length > 0) {
     app = getApps()[0];
  } else {
     app = initializeApp(activeConfig);
  }
}

export const auth = getAuth(app);
export const db = getFirestore(app);

export const saveFirebaseConfig = (cfg: FirebaseOptions) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  window.location.reload(); 
};

export const clearFirebaseConfig = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
};
