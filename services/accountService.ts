import { auth, db } from './firebase';
import { initializeApp, getApp, deleteApp, FirebaseApp, getApps } from "firebase/app";
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
  deleteDoc
} from 'firebase/firestore';

export type AccountRole = 'admin' | 'user';

export interface Account {
  id: string; // Firebase UID
  username: string; // Trong Firebase Auth là email, nhưng ta map field này để hiển thị
  email: string;
  role: AccountRole;
  expiresAt: number | null; 
  createdAt: number;
  isActive: boolean;
}

const USERS_COLLECTION = 'users';

// --- Helpers ---

// Lấy thông tin user profile từ Firestore dựa trên UID
export const getUserProfile = async (uid: string): Promise<Account | null> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as Account;
    }
    return null;
  } catch (e) {
    console.error("Error fetching user profile:", e);
    return null;
  }
};

export const getAccounts = async (): Promise<Account[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const accounts: Account[] = [];
    querySnapshot.forEach((doc) => {
      accounts.push(doc.data() as Account);
    });
    return accounts;
  } catch (e) {
    console.error("Error getting accounts:", e);
    return [];
  }
};

// --- Core Logic ---

// User Self-Registration
export const signup = async (username: string, password: string): Promise<{ ok: boolean; error?: string; account?: Account }> => {
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
      isActive: false // Mặc định chờ duyệt
    };

    // Lưu thông tin bổ sung vào Firestore
    await setDoc(doc(db, USERS_COLLECTION, user.uid), newAccount);

    return { ok: true, account: newAccount };
  } catch (error: any) {
    console.error("Signup error:", error);
    let msg = error.message;
    if (msg.includes('email-already-in-use')) msg = 'Tài khoản/Email này đã tồn tại.';
    if (msg.includes('weak-password')) msg = 'Mật khẩu quá yếu (tối thiểu 6 ký tự).';
    return { ok: false, error: msg };
  }
};

// Admin creating account directly
export const createAccountByAdmin = async (
  username: string, 
  emailInput: string | null,
  password: string, 
  role: AccountRole, 
  daysValid: number | null // Nếu null hoặc 0 thì xem như Vĩnh viễn (hoặc xử lý riêng)
): Promise<{ ok: boolean; error?: string; account?: Account }> => {
  
  // STRATEGY: Secondary App Instance
  // Tạo một instance phụ để auth không bị conflict với admin đang login
  let secondaryApp: FirebaseApp | undefined;

  try {
    // Lấy config từ app chính đang chạy
    const currentApp = auth.app; 
    const config = currentApp.options;
    
    // Dùng tên unique để tránh lỗi "App already exists"
    const appName = `SecondaryApp-${Date.now()}`;
    secondaryApp = initializeApp(config, appName);
    const secondaryAuth = getAuth(secondaryApp);

    // Xác định email
    const email = emailInput && emailInput.trim() !== '' 
      ? emailInput 
      : `${username.toLowerCase().replace(/\s/g, '')}@kichbanai.local`;

    // 1. Tạo user trên Authentication (dùng secondary app)
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const user = userCredential.user;

    // Tính toán ngày hết hạn
    // Nếu daysValid = -1 hoặc null -> Vĩnh viễn (null)
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
      isActive: true // Admin tạo thì active luôn
    };

    // 2. Lưu vào Firestore (dùng DB chính, vì Admin đang có quyền write)
    await setDoc(doc(db, USERS_COLLECTION, user.uid), newAccount);

    // 3. Đăng xuất khỏi secondary app ngay lập tức (good practice)
    await signOut(secondaryAuth);

    return { ok: true, account: newAccount };

  } catch (error: any) {
    console.error("Admin Create Error:", error);
    let msg = error.message;
    if (msg.includes('email-already-in-use')) msg = 'Email/Username này đã tồn tại.';
    if (msg.includes('weak-password')) msg = 'Mật khẩu quá yếu.';
    return { ok: false, error: msg };
  } finally {
    // 4. Cleanup: Luôn luôn xóa app phụ dù thành công hay thất bại
    if (secondaryApp) {
      try { await deleteApp(secondaryApp); } catch(e) { console.error("Cleanup error", e); }
    }
  }
};

export const authenticate = async (username: string, password: string): Promise<{ ok: boolean; account?: Account; error?: string }> => {
  try {
    // Kiểm tra xem input là email hay username
    let email = username;
    if (!username.includes('@')) {
        email = `${username.toLowerCase().replace(/\s/g, '')}@kichbanai.local`;
    }
    
    // 1. Sign in Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // 2. Get Firestore Profile
    const account = await getUserProfile(user.uid);

    if (!account) {
      await signOut(auth);
      return { ok: false, error: 'Không tìm thấy thông tin hồ sơ người dùng.' };
    }

    // 3. Check Active & Expiry
    if (!account.isActive) {
      await signOut(auth);
      return { ok: false, error: 'Tài khoản chưa được kích hoạt hoặc bị khóa.' };
    }

    // Logic Expiry: Nếu expiresAt là null => Vĩnh viễn. Nếu có số => Check ngày.
    if (account.expiresAt !== null && Date.now() > account.expiresAt) {
      await signOut(auth);
      return { ok: false, error: 'Tài khoản đã hết hạn sử dụng.' };
    }

    return { ok: true, account };
  } catch (error: any) {
    console.error("Login error:", error);
    let msg = error.message;
    if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
      msg = 'Tài khoản hoặc mật khẩu không đúng.';
    }
    return { ok: false, error: msg };
  }
};

export const logout = async () => {
  await signOut(auth);
  localStorage.removeItem('app_admin_auth');
};

export const extendAccount = async (id: string, days: number): Promise<boolean> => {
  try {
    const account = await getUserProfile(id);
    if (!account) return false;

    // Nếu days = -1 => Set thành Vĩnh viễn (null)
    if (days === -1) {
        await updateDoc(doc(db, USERS_COLLECTION, id), {
            expiresAt: null,
            isActive: true
        });
        return true;
    }

    // Nếu tài khoản đã hết hạn, tính từ hiện tại. Nếu chưa, cộng dồn.
    const baseTime = (account.expiresAt && account.expiresAt > Date.now()) ? account.expiresAt : Date.now();
    const newExpiry = baseTime + (days * 24 * 60 * 60 * 1000);

    await updateDoc(doc(db, USERS_COLLECTION, id), {
      expiresAt: newExpiry,
      isActive: true
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const toggleAccountActive = async (id: string): Promise<boolean> => {
  try {
    const account = await getUserProfile(id);
    if (!account) return false;
    
    // Không khoá admin gốc
    if (account.role === 'admin' && account.username === 'admin') return false;

    await updateDoc(doc(db, USERS_COLLECTION, id), {
      isActive: !account.isActive
    });
    return true;
  } catch (e) {
    return false;
  }
};

export const updateUserRole = async (id: string, role: AccountRole): Promise<boolean> => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, id), {
      role: role
    });
    return true;
  } catch (e) {
    console.error("Error updating role:", e);
    return false;
  }
};

export const deleteAccount = async (id: string): Promise<boolean> => {
  try {
    // Chỉ xoá document trong Firestore.
    // Lưu ý: User Auth vẫn tồn tại (cần Firebase Cloud Functions để xóa triệt để).
    // Nhưng xóa Firestore doc là đủ để chặn đăng nhập.
    await deleteDoc(doc(db, USERS_COLLECTION, id));
    return true;
  } catch (e) {
    return false;
  }
};

// Upgrade current user to Admin (Used for self-claim)
export const upgradeToAdmin = async (uid: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, uid), {
      role: 'admin',
      isActive: true,
      expiresAt: null // Admin thường là vĩnh viễn
    });
    return true;
  } catch (e) {
    console.error("Upgrade admin error:", e);
    return false;
  }
};

export const initializeDefaultAdmin = async () => {
    // No-op
};