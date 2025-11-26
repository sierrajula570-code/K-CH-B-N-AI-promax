
import React, { useState } from 'react';
import { LogIn, Lock, User, AlertCircle, UserPlus } from 'lucide-react';
import { authenticate, Account } from '../services/accountService';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (account: Account) => void;
  onOpenSignup: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess, onOpenSignup }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authenticate(username, password);
      
      if (result.ok && result.account) {
        onSuccess(result.account);
        onClose();
      } else {
        setError(result.error || 'Đăng nhập thất bại');
      }
    } catch (e: any) {
       setError(e.message || 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-secondary-600 p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="bg-white/20 w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-4 backdrop-blur-sm shadow-inner border border-white/20">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white">Đăng nhập</h2>
          <p className="text-primary-100 text-sm mt-1">Truy cập hệ thống Kichban AI</p>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Tài khoản (Username)
              </label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium text-slate-800"
                  placeholder="Nhập username..."
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Mật khẩu
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium text-slate-800"
                  placeholder="Nhập mật khẩu..."
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-lg text-sm font-medium border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:shadow-primary-500/30 hover:-translate-y-0.5 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <span>Đăng nhập ngay</span>
                  <LogIn className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Create Account Link */}
          <div className="mt-6 text-center pt-4 border-t border-slate-100">
            <button
              onClick={onOpenSignup}
              className="text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors inline-flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Chưa có tài khoản? <span className="underline decoration-slate-300 underline-offset-2 decoration-2 hover:decoration-primary-300">Tạo tài khoản mới</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
