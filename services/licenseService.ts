import { License } from '../types';

const LICENSE_STORAGE_KEY = 'app_license_data';
const ADMIN_AUTH_KEY = 'app_admin_auth';
const ADMIN_SECRET_CODE = 'admin123'; // Mật khẩu Admin mặc định

// Simple encryption for demo (Base64)
const encode = (str: string) => btoa(str);
const decode = (str: string) => atob(str);

export const generateLicenseKey = (days: number): string => {
  const now = Date.now();
  const expiry = now + (days * 24 * 60 * 60 * 1000);
  // Format: KICHBAN-DAYS-EXPIRY-RANDOM
  const raw = `KICHBAN|${days}|${expiry}|${Math.random().toString(36).substring(7)}`;
  return encode(raw);
};

export const validateLicenseKey = (key: string): { valid: boolean; expiryDate?: number; message?: string } => {
  try {
    const decoded = decode(key);
    const parts = decoded.split('|');
    
    if (parts.length !== 4 || parts[0] !== 'KICHBAN') {
      return { valid: false, message: 'Mã không hợp lệ (Sai định dạng).' };
    }

    const expiryDate = parseInt(parts[2]);
    if (isNaN(expiryDate)) {
        return { valid: false, message: 'Mã lỗi (Dữ liệu hỏng).' };
    }

    if (Date.now() > expiryDate) {
      return { valid: false, message: 'Mã đã hết hạn sử dụng.', expiryDate };
    }

    return { valid: true, expiryDate };
  } catch (e) {
    return { valid: false, message: 'Mã không hợp lệ (Lỗi giải mã).' };
  }
};

export const saveLicense = (key: string, expiryDate: number) => {
  const licenseData: License = {
    key,
    expiryDate,
    daysValid: 0,
    createdDate: Date.now(),
    isActive: true
  };
  localStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(licenseData));
};

export const getStoredLicense = (): License | null => {
  const data = localStorage.getItem(LICENSE_STORAGE_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const removeLicense = () => {
  localStorage.removeItem(LICENSE_STORAGE_KEY);
}

// --- ADMIN AUTH ---

export const verifyAdminCode = (code: string): boolean => {
    return code === ADMIN_SECRET_CODE;
};

export const setAdminAuthenticated = () => {
    localStorage.setItem(ADMIN_AUTH_KEY, 'true');
};

export const isAdminAuthenticated = (): boolean => {
    return localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
};

export const logoutAdmin = () => {
    localStorage.removeItem(ADMIN_AUTH_KEY);
};