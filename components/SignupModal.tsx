
import React, { useState } from 'react';
import { UserPlus, User, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { signup } from '../services/accountService';

interface SignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SignupModal: React.FC<SignupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulate network delay
    setTimeout(() => {
      const result = signup(username, password);
      
      if (result.ok) {
        onSuccess();
        // Clear form
        setUsername('');
        setPassword('');
        onClose();
      } else {
        setError(result.error || 'Đăng ký thất bại.');
      }
      setLoading(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100">
        
        {/* Header */}
        <div className="bg-slate-50 p-6 text-center border-b border-slate-100">
          <div className="bg-white w-14 h-14 rounded-full mx-auto flex items-center justify-center mb-3 shadow-sm border border-slate-100">
            <UserPlus className="w-6 h-6 text-primary-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Tạo tài khoản mới</h2>
          <p className="text-slate-500 text-sm mt-1">Đăng ký để sử dụng Kichban AI</p>
        </div>

        {/* Form */}
        <div className="p-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Tên đăng nhập
              </label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-medium text-slate-800"
                  placeholder="Chọn tên đăng nhập..."
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
                  placeholder="Đặt mật khẩu..."
                />
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2 text-xs text-blue-700 border border-blue-100">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Tài khoản sau khi tạo sẽ cần chờ <strong>Quản trị viên</strong> duyệt và kích hoạt thời hạn sử dụng.</p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-500 bg-red-50 p-3 rounded-lg text-sm font-medium border border-red-100">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                >
                    Hủy
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] bg-primary-600 text-white font-bold py-3 rounded-xl hover:bg-primary-700 hover:shadow-lg transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                    {loading ? 'Đang tạo...' : 'Đăng ký ngay'}
                </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupModal;
