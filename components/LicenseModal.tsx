import React, { useState } from 'react';
import { Lock, Key, ShieldCheck, AlertTriangle } from 'lucide-react';
import { validateLicenseKey, saveLicense } from '../services/licenseService';

interface Props {
  onSuccess: () => void;
}

const LicenseModal: React.FC<Props> = ({ onSuccess }) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = validateLicenseKey(inputKey.trim());
    if (result.valid && result.expiryDate) {
      saveLicense(inputKey.trim(), result.expiryDate);
      onSuccess();
    } else {
      setError(result.message || 'Mã không hợp lệ.');
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-8 border border-slate-200 text-center">
        <div className="w-16 h-16 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow animate-pulse-slow">
          <Lock className="w-8 h-8" />
        </div>
        
        <h2 className="text-2xl font-extrabold text-slate-800 mb-2">Kích Hoạt Bản Quyền</h2>
        <p className="text-slate-500 mb-8 text-sm">
          Vui lòng nhập mã kích hoạt (License Key) để tiếp tục sử dụng phần mềm <strong>Kichban AI Pro Max</strong>.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Key className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              placeholder="Dán mã kích hoạt vào đây..."
              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-mono text-sm shadow-inner outline-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 p-3 rounded-lg border border-red-100 animate-in slide-in-from-top-1">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-5 h-5" />
            Kích Hoạt Ngay
          </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-slate-100 text-xs text-slate-400">
          Liên hệ Admin để nhận mã truy cập.
        </div>
      </div>
    </div>
  );
};

export default LicenseModal;