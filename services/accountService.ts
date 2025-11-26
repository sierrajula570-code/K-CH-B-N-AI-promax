
import { auth, db } from './firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query,
  where
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
// Lưu ý: Firebase Auth yêu cầu Email, nên ta sẽ dùng username làm email giả lập hoặc yêu cầu nhập email
export const signup = async (username: string, password: string): Promise<{ ok: boolean; error?: string; account?: Account }> => {
  try {
    // Để đơn giản, ta tự tạo email giả từ username nếu người dùng chỉ nhập username
    // Hoặc tốt nhất là sửa UI để nhập email. Ở đây ta giả lập email:
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
  password: string, 
  role: AccountRole, 
  daysValid: number | null
): Promise<{ ok: boolean; error?: string; account?: Account }> => {
  // Lưu ý: Firebase Client SDK sẽ tự động đăng nhập user mới tạo. 
  // Để tránh điều này, admin nên dùng Cloud Functions. 
  // Tuy nhiên, ở mức frontend-only, ta chấp nhận việc tạo xong sẽ bị logout admin hiện tại,
  // hoặc dùng 1 app instance thứ 2. 
  // ĐỂ ĐƠN GIẢN: Ta sẽ báo lỗi là tính năng này cần Backend thực thụ, 
  // hoặc ta dùng "thủ thuật" tạo xong sign-in lại admin cũ (phức tạp).
  
  // -> Giải pháp tạm thời cho Client-only: Dùng Secondary App (nâng cao) hoặc
  // Khuyên dùng Signup bình thường rồi Admin duyệt.
  
  return { ok: false, error: "Trên Firebase Client, vui lòng để user tự đăng ký rồi Admin duyệt." };
};

export const authenticate = async (username: string, password: string): Promise<{ ok: boolean; account?: Account; error?: string }> => {
  try {
    const email = `${username.toLowerCase().replace(/\s/g, '')}@kichbanai.local`;
    
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
    
    // Không khoá admin gốc (nếu có logic check id)
    if (account.username === 'admin') return false;

    await updateDoc(doc(db, USERS_COLLECTION, id), {
      isActive: !account.isActive
    });
    return true;
  } catch (e) {
    return false;
  }
};

export const deleteAccount = async (id: string): Promise<boolean> => {
  try {
    // Chỉ xoá document trong Firestore. 
    // User trong Auth vẫn còn (cần Cloud Functions để xoá sạch hoàn toàn).
    // Nhưng xoá trong Firestore thì user đó cũng không login được nữa (do bước check profile).
    await deleteDoc(doc(db, USERS_COLLECTION, id));
    return true;
  } catch (e) {
    return false;
  }
};

// Hàm khởi tạo Admin đầu tiên (chạy 1 lần thủ công hoặc check logic)
// Với Firebase, bạn nên tạo user thủ công, sau đó vào Firestore Console sửa role thành 'admin' và isActive: true
export const initializeDefaultAdmin = async () => {
    // Không dùng logic tự tạo admin local nữa.
    // Hướng dẫn: Đăng ký 1 user tên "admin", sau đó vào Firebase Console -> Firestore
    // Tìm document của user đó, sửa field "role": "admin", "isActive": true
};
