
export type AccountRole = 'admin' | 'user';

export interface Account {
  id: string;
  username: string;
  password: string; // Plain text for demo
  role: AccountRole;
  expiresAt: number | null; // timestamp ms, null = never expires / not set
  createdAt: number;
  isActive: boolean;
}

const ACCOUNTS_STORAGE_KEY = 'kb_accounts';
const ADMIN_AUTH_KEY = 'app_admin_auth';

// --- Helpers ---

export const getAccounts = (): Account[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

export const saveAccounts = (accounts: Account[]) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
};

export const initializeDefaultAdmin = () => {
  const accounts = getAccounts();
  const adminExists = accounts.some(a => a.role === 'admin');
  
  if (!adminExists) {
    const defaultAdmin: Account = {
      id: 'admin-default',
      username: 'admin',
      password: 'admin123',
      role: 'admin',
      expiresAt: null,
      createdAt: Date.now(),
      isActive: true
    };
    saveAccounts([...accounts, defaultAdmin]);
    console.log('Default admin account created: admin / admin123');
  }
};

// --- Core Logic ---

// User Self-Registration
export const signup = (username: string, password: string): { ok: boolean; error?: string; account?: Account } => {
  const accounts = getAccounts();
  
  // Validate input
  if (!username || username.trim().length < 3) {
    return { ok: false, error: 'Tên tài khoản phải có ít nhất 3 ký tự.' };
  }
  if (!password || password.length < 3) {
    return { ok: false, error: 'Mật khẩu phải có ít nhất 3 ký tự.' };
  }

  // Check duplicates
  if (accounts.some(a => a.username.toLowerCase() === username.trim().toLowerCase())) {
    return { ok: false, error: 'Tên tài khoản đã tồn tại.' };
  }

  const newAccount: Account = {
    id: Date.now().toString(),
    username: username.trim(),
    password: password,
    role: 'user',
    expiresAt: null, // Pending approval/extension
    createdAt: Date.now(),
    isActive: false // Pending approval
  };

  saveAccounts([...accounts, newAccount]);
  return { ok: true, account: newAccount };
};

// Admin creating account directly
export const createAccountByAdmin = (
  username: string, 
  password: string, 
  role: AccountRole, 
  daysValid: number | null
): { ok: boolean; error?: string; account?: Account } => {
  
  const accounts = getAccounts();
  
  if (accounts.some(a => a.username.toLowerCase() === username.toLowerCase())) {
    return { ok: false, error: 'Tên tài khoản đã tồn tại' };
  }

  const expiresAt = daysValid ? Date.now() + (daysValid * 24 * 60 * 60 * 1000) : null;

  const newAccount: Account = {
    id: Date.now().toString(),
    username,
    password,
    role,
    expiresAt,
    createdAt: Date.now(),
    isActive: true // Admin created accounts are active by default
  };

  saveAccounts([...accounts, newAccount]);
  return { ok: true, account: newAccount };
};

export const authenticate = (username: string, password: string): { ok: boolean; account?: Account; error?: string } => {
  // Ensure we have accounts loaded (and default admin if needed)
  initializeDefaultAdmin();
  const accounts = getAccounts();
  
  const account = accounts.find(a => a.username.toLowerCase() === username.toLowerCase());

  if (!account) {
    return { ok: false, error: 'Tài khoản không tồn tại.' };
  }

  if (account.password !== password) {
    return { ok: false, error: 'Mật khẩu không đúng.' };
  }

  if (!account.isActive) {
    return { ok: false, error: 'Tài khoản chưa được kích hoạt hoặc bị khóa.' };
  }

  if (account.expiresAt !== null && Date.now() > account.expiresAt) {
    return { ok: false, error: 'Tài khoản đã hết hạn sử dụng.' };
  }

  return { ok: true, account };
};

export const extendAccount = (id: string, days: number): Account | null => {
  const accounts = getAccounts();
  const accountIndex = accounts.findIndex(a => a.id === id);
  
  if (accountIndex === -1) return null;

  const account = accounts[accountIndex];
  
  // Calculate new expiry
  // If currently expired or null, start from now. If valid, add to current expiry.
  const baseTime = (account.expiresAt && account.expiresAt > Date.now()) ? account.expiresAt : Date.now();
  const newExpiry = baseTime + (days * 24 * 60 * 60 * 1000);

  // When extending, we typically also want to ensure the account is active (if it was pending)
  const updatedAccount = { 
    ...account, 
    expiresAt: newExpiry,
    isActive: true 
  };
  
  accounts[accountIndex] = updatedAccount;
  
  saveAccounts(accounts);
  return updatedAccount;
};

export const toggleAccountActive = (id: string): Account | null => {
  const accounts = getAccounts();
  const accountIndex = accounts.findIndex(a => a.id === id);
  
  if (accountIndex === -1) return null;

  // Don't lock the main admin
  if (accounts[accountIndex].username === 'admin') return accounts[accountIndex];

  const updatedAccount = { ...accounts[accountIndex], isActive: !accounts[accountIndex].isActive };
  accounts[accountIndex] = updatedAccount;
  
  saveAccounts(accounts);
  return updatedAccount;
};

export const deleteAccount = (id: string): boolean => {
  const accounts = getAccounts();
  const accountIndex = accounts.findIndex(a => a.id === id);
  
  if (accountIndex === -1) return false;

  // Don't delete the main admin
  if (accounts[accountIndex].username === 'admin') return false;

  const newAccounts = accounts.filter(a => a.id !== id);
  saveAccounts(newAccounts);
  return true;
};

// --- Utils ---

export const getAdminAuthStatus = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
};

export const setAdminAuthStatus = (isAuth: boolean) => {
  if (typeof window === 'undefined') return;
  if (isAuth) {
    localStorage.setItem(ADMIN_AUTH_KEY, 'true');
  } else {
    localStorage.removeItem(ADMIN_AUTH_KEY);
  }
};
