import React, { useState } from 'react';
import { ShieldAlert, Lock, X } from 'lucide-react';
import { verifyAdminCode, setAdminAuthenticated } from '../services/licenseService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AdminAuthModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyAdminCode(code)) {
      setAdminAuthenticated();
      onSuccess();
      onClose();
      setCode('');
      setError('');
    } else {
      setError('Mã bí mật không chính xác.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
        </button>
        
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-600">
             <ShieldAlert className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Admin Access</h3>
          <p className="text-xs text-slate-500">Nhập mã bí mật để mở khóa quyền quản trị</p>
        </div>

        <form onSubmit={handleSubmit}>
          <input 
            type="password" 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Secret Code..."
            className="w-full border border-slate-300 rounded-xl px-4 py-3 text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-slate-400 mb-2"
            autoFocus
          />
          
          {error && <p className="text-red-500 text-xs text-center mb-4 font-medium">{error}</p>}

          <button 
            type="submit" 
            className="w-full py-2.5 text-sm font-bold bg-slate-800 text-white hover:bg-slate-900 rounded-xl transition-colors flex items-center justify-center gap-2 mt-4"
          >
            <Lock className="w-4 h-4" /> Xác thực
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminAuthModal;