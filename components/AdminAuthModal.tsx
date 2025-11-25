
import React, { useState } from 'react';
import { ShieldCheck, Lock, X, ArrowRight } from 'lucide-react';
import { validateAdminKey, setAdminAuthenticated } from '../services/licenseService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AdminAuthModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateAdminKey(keyInput)) {
      setAdminAuthenticated();
      onSuccess();
      onClose();
      setKeyInput('');
      setError('');
    } else {
      setError('Mã xác thực không đúng.');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-slate-900 p-6 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 via-fuchsia-500 to-violet-500"></div>
          <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
          
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4 border border-slate-700 shadow-glow">
            <ShieldCheck className="w-8 h-8 text-violet-400" />
          </div>
          <h2 className="text-xl font-bold text-white">Kích hoạt quyền Chủ sở hữu</h2>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Nhập mã bảo mật
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-violet-600 transition-colors" />
                <input
                  type="password"
                  value={keyInput}
                  onChange={(e) => {
                    setKeyInput(e.target.value);
                    setError('');
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all font-mono text-sm text-slate-800"
                  placeholder="Admin Secret Code..."
                  autoFocus
                />
              </div>
              {error && <p className="text-red-500 text-xs mt-2 pl-1 font-medium">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-violet-900 transition-all shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2 group"
            >
              <span>Xác nhận</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminAuthModal;
