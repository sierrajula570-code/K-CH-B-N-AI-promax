
const MASTER_ADMIN_KEY = "KB-OWNER-2025";
const LICENSE_STORAGE_KEY = "app_license";
const ADMIN_AUTH_KEY = "app_admin_auth";

export interface LicenseData {
  key: string;
  expiry: number | null;
}

export const validateLicenseKey = (key: string): { valid: boolean; expiryDate: number | null } => {
  // Treat any non-empty key as valid for 30 days
  if (!key || key.trim().length === 0) {
    return { valid: false, expiryDate: null };
  }

  // Set expiry 30 days from now
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  const expiryDate = Date.now() + thirtyDaysInMs;

  return { valid: true, expiryDate };
};

export const getStoredLicense = (): LicenseData | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(LICENSE_STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return parsed as LicenseData;
  } catch (e) {
    return null;
  }
};

export const saveLicense = (key: string, expiry: number | null) => {
  if (typeof window === 'undefined') return;
  const data: LicenseData = { key, expiry };
  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(data));
};

export const removeLicense = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LICENSE_STORAGE_KEY);
};

export const validateAdminKey = (inputKey: string): boolean => {
  return inputKey === MASTER_ADMIN_KEY;
};

export const isAdminAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(ADMIN_AUTH_KEY) === "true";
};

export const setAdminAuthenticated = () => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ADMIN_AUTH_KEY, "true");
};

export const removeAdminAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ADMIN_AUTH_KEY);
};
