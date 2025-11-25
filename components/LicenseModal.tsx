
import React, { useState } from 'react';
import { Key, Unlock, CheckCircle2 } from 'lucide-react';

interface Props {
  onSuccess: (key: string) => void;
}

const LicenseModal: React.FC<Props> = ({ onSuccess }) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      setError('Vui lòng nhập License Key.');
      return;
    }

    setIsValidating(true);
    
    // Simulate slight delay for effect
    setTimeout(() => {
        setIsValidating(false);
        onSuccess(inputKey.trim());
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-[50] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl p-8 animate-in fade-in zoom-in duration-500 relative overflow-hidden">
        
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50"></div>
        
        <div className="text-center mb-8 relative z-10">
          <div className="bg-gradient-to-br from-primary-100 to-secondary-100 w-20 h-20 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-glow border border-white">
            <Key className="w-10 h-10 text-primary-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Kich hoạt Bản quyền</h1>
          <p className="text-slate-500">Vui lòng nhập License Key để tiếp tục sử dụng Kichban AI Pro Max.</p>
        </div>

        <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
          <div>
            <input
              type="text"
              value={inputKey}
              onChange={(e) => {
                  setInputKey(e.target.value);
                  setError('');
              }}
              placeholder="Nhập License Key của bạn..."
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center font-mono text-lg font-bold text-slate-800 placeholder-slate-400 transition-all shadow-inner"
            />
            {error && <p className="text-red-500 text-sm mt-2 text-center font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={isValidating}
            className="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-primary-500/30 hover:-translate-y-1 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isValidating ? (
                <span>Đang kiểm tra...</span>
            ) : (
                <>
                    <Unlock className="w-5 h-5" />
                    <span>Kích hoạt ngay</span>
                </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
             <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Bảo mật an toàn</span>
                <span className="mx-2">•</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Hỗ trợ 24/7</span>
             </div>
        </div>
      </div>
    </div>
  );
};

export default LicenseModal;
