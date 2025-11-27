
import { auth, db } from './firebase';
import { initializeApp, deleteApp, FirebaseApp } from "firebase/app";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  getAuth
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';

export type AccountRole = 'admin' | 'user';

export interface Account {
  id: string; 
  username: string; 
  email: string;
  role: AccountRole;
  expiresAt: number | null; 
  createdAt: number;
  isActive: boolean;
  personalContext?: string; 
  templateContexts?: Record<string, string>; 
  currentSessionId?: string; 
}

const USERS_COLLECTION = 'users';

// QUOTA MANAGEMENT
const QUOTA_KEY = 'firebase_quota_exceeded_ts';
const QUOTA_TIMEOUT = 60 * 60 * 1000; // 1 hour

export const checkGlobalQuota = (): boolean => {
  if (typeof window === 'undefined') return false;
  const ts = localStorage.getItem(QUOTA_KEY);
  if (ts) {
    if (Date.now() - parseInt(ts) < QUOTA_TIMEOUT) {
      return true;
    } else {
      localStorage.removeItem(QUOTA_KEY);
      return false;
    }
  }
  return false;
};

export const setGlobalQuotaExceeded = () => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(QUOTA_KEY, Date.now().toString());
    console.warn("🚫 Global Quota Lock Activated for 1 hour. Switching to Offline Mode.");
};

export let isQuotaExceeded = checkGlobalQuota();

// --- Helpers ---

export const getUserProfile = async (uid: string): Promise<Account | null> => {
  if (checkGlobalQuota()) return null;

  const CACHE_KEY = `user_profile_${uid}`;
  if (typeof sessionStorage !== 'undefined') {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
          return JSON.parse(cached) as Account;
      }
  }

  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Account;
      if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
      }
      return data;
    }
    return null;
  } catch (e: any) {
    console.error("Error fetching user profile:", e);
    if (e.code === 'resource-exhausted') {
        setGlobalQuotaExceeded();
    }
    return null;
  }
};

export const getAccounts = async (): Promise<Account[]> => {
  if (checkGlobalQuota()) return [];
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const accounts: Account[] = [];
    querySnapshot.forEach((doc) => {
      accounts.push(doc.data() as Account);
    });
    return accounts;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    console.error("Error getting accounts:", e);
    return [];
  }
};

// --- SINGLE DEVICE SESSION MANAGEMENT ---

export const claimSession = async (uid: string): Promise<string> => {
  if (checkGlobalQuota()) return "skipped-quota";

  // WRITE OPTIMIZATION: Extended to 24 HOURS to prevent quota drain
  const SESSION_KEY = `session_claimed_${uid}_ts`;
  const lastClaim = localStorage.getItem(SESSION_KEY);
  
  // 24 Hours in MS
  if (lastClaim && Date.now() - parseInt(lastClaim) < 24 * 60 * 60 * 1000) {
      return "skipped-cached";
  }

  try {
    const newSessionId = Date.now().toString() + Math.random().toString().slice(2, 8);
    await updateDoc(doc(db, USERS_COLLECTION, uid), {
      currentSessionId: newSessionId
    });
    
    localStorage.setItem(SESSION_KEY, Date.now().toString());
    return newSessionId;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return "";
  }
};

export const listenToAccountChanges = (uid: string, callback: (account: Account | null) => void) => {
  if (checkGlobalQuota()) return () => {};

  try {
      return onSnapshot(doc(db, USERS_COLLECTION, uid), 
        (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as Account;
                const CACHE_KEY = `user_profile_${uid}`;
                sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
                callback(data);
            } else {
                callback(null); 
            }
        }, 
        (error) => {
            if (error.code === 'resource-exhausted') {
                setGlobalQuotaExceeded();
            }
        }
      );
  } catch (e) {
      return () => {};
  }
};

// ... (Rest of auth functions remain similar but with Quota Checks)

export const signup = async (username: string, password: string): Promise<{ ok: boolean; error?: string; account?: Account }> => {
  if (checkGlobalQuota()) return { ok: false, error: "Hệ thống đang quá tải (Quota). Vui lòng thử lại sau." };
  try {
    const email = `${username.toLowerCase().replace(/\s/g, '')}@kichbanai.local`;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const newAccount: Account = {
      id: user.uid,
      username: username,
      email: email,
      role: 'user',
      expiresAt: null, 
      createdAt: Date.now(),
      isActive: false, 
      personalContext: '',
      templateContexts: {}
    };

    await setDoc(doc(db, USERS_COLLECTION, user.uid), newAccount);
    return { ok: true, account: newAccount };
  } catch (error: any) {
    let msg = error.message;
    if (msg.includes('resource-exhausted')) setGlobalQuotaExceeded();
    return { ok: false, error: msg };
  }
};

export const createAccountByAdmin = async (
  username: string, 
  emailInput: string | null,
  password: string, 
  role: AccountRole, 
  daysValid: number | null 
): Promise<{ ok: boolean; error?: string; account?: Account }> => {
  if (checkGlobalQuota()) return { ok: false, error: "Quota Exceeded." };
  
  let secondaryApp: FirebaseApp | undefined;
  try {
    const currentApp = auth.app; 
    const config = currentApp.options;
    const appName = `SecondaryApp-${Date.now()}`;
    secondaryApp = initializeApp(config, appName);
    const secondaryAuth = getAuth(secondaryApp);

    const email = emailInput && emailInput.trim() !== '' 
      ? emailInput 
      : `${username.toLowerCase().replace(/\s/g, '')}@kichbanai.local`;

    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const user = userCredential.user;

    let expiresAt = null;
    if (daysValid && daysValid > 0) {
      expiresAt = Date.now() + (daysValid * 24 * 60 * 60 * 1000);
    }

    const newAccount: Account = {
      id: user.uid,
      username: username,
      email: email,
      role: role,
      expiresAt: expiresAt,
      createdAt: Date.now(),
      isActive: true, 
      personalContext: '',
      templateContexts: {}
    };

    await setDoc(doc(db, USERS_COLLECTION, user.uid), newAccount);
    await signOut(secondaryAuth);

    return { ok: true, account: newAccount };
  } catch (error: any) {
    if (error.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return { ok: false, error: error.message };
  } finally {
    if (secondaryApp) try { await deleteApp(secondaryApp); } catch(e) {}
  }
};

export const authenticate = async (username: string, password: string): Promise<{ ok: boolean; account?: Account; error?: string }> => {
  if (checkGlobalQuota()) return { ok: false, error: "Hệ thống đang bảo trì Database (Quota)." };
  try {
    let email = username;
    if (!username.includes('@')) {
        email = `${username.toLowerCase().replace(/\s/g, '')}@kichbanai.local`;
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const account = await getUserProfile(user.uid);

    if (!account) {
        await signOut(auth);
        return { ok: false, error: 'Không thể tải hồ sơ (Offline Mode).' };
    }

    if (!account.isActive) {
      await signOut(auth);
      return { ok: false, error: 'Tài khoản bị khóa.' };
    }

    if (account.expiresAt !== null && Date.now() > account.expiresAt) {
      await signOut(auth);
      return { ok: false, error: 'Tài khoản hết hạn.' };
    }

    return { ok: true, account };
  } catch (error: any) {
    if (error.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return { ok: false, error: error.message };
  }
};

export const logout = async () => {
  await signOut(auth);
  localStorage.removeItem('app_admin_auth');
  sessionStorage.clear();
};

export const extendAccount = async (id: string, days: number): Promise<boolean> => {
  if (checkGlobalQuota()) return false;
  try {
    const account = await getUserProfile(id);
    if (!account) return false;

    const newExpiry = days === -1 ? null : (Date.now() + (days * 24 * 60 * 60 * 1000));
    await updateDoc(doc(db, USERS_COLLECTION, id), { expiresAt: newExpiry, isActive: true });
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return false;
  }
};

export const toggleAccountActive = async (id: string): Promise<boolean> => {
  if (checkGlobalQuota()) return false;
  try {
    const account = await getUserProfile(id);
    if (!account) return false;
    await updateDoc(doc(db, USERS_COLLECTION, id), { isActive: !account.isActive });
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return false;
  }
};

export const updateUserRole = async (id: string, role: AccountRole): Promise<boolean> => {
  if (checkGlobalQuota()) return false;
  try {
    await updateDoc(doc(db, USERS_COLLECTION, id), { role: role });
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return false;
  }
};

export const deleteAccount = async (id: string): Promise<boolean> => {
  if (checkGlobalQuota()) return false;
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, id));
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return false;
  }
};

export const upgradeToAdmin = async (uid: string): Promise<boolean> => {
  if (checkGlobalQuota()) return false;
  try {
    await updateDoc(doc(db, USERS_COLLECTION, uid), { role: 'admin', isActive: true, expiresAt: null });
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return false;
  }
};

export const updatePersonalContext = async (uid: string, context: string): Promise<boolean> => {
  if (checkGlobalQuota()) return false;
  try {
    await updateDoc(doc(db, USERS_COLLECTION, uid), { personalContext: context });
    const CACHE_KEY = `user_profile_${uid}`;
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
        const data = JSON.parse(cached) as Account;
        data.personalContext = context;
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    }
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return false;
  }
};

export const updateTemplateContext = async (uid: string, templateId: string, context: string): Promise<boolean> => {
  if (checkGlobalQuota()) return false;
  try {
    const fieldPath = `templateContexts.${templateId}`;
    await updateDoc(doc(db, USERS_COLLECTION, uid), { [fieldPath]: context });
    const CACHE_KEY = `user_profile_${uid}`;
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
        const data = JSON.parse(cached) as Account;
        if (!data.templateContexts) data.templateContexts = {};
        data.templateContexts[templateId] = context;
        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    }
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return false;
  }
};
