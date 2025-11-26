
import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, Save, Eye, EyeOff, Database, Shield } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenFirebaseConfig: () => void;
  onOpenAdminAuth: () => void; // New prop for admin claim
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onOpenFirebaseConfig, onOpenAdminAuth }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const storedKey = localStorage.getItem('gemini_api_key') || '';
      setApiKey(storedKey);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert('Vui lòng nhập API Key hợp lệ');
      return;
    }
    localStorage.setItem('gemini_api_key', apiKey.trim());
    onClose();
    alert('Đã lưu API Key thành công! Bây giờ bạn có thể tạo kịch bản.');
  };

  const handleClear = () => {
    localStorage.removeItem('gemini_api_key');
    setApiKey('');
    alert('Đã xóa API Key.');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-primary-600" /> Cài đặt Hệ thống
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6 space-y-6">
          
          {/* AI Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4" /> AI Configuration
            </h3>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Google AI Studio API Key
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Dán mã API bắt đầu bằng AIza..."
                  className="w-full pl-4 pr-12 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all font-mono text-sm"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className="bg-primary-50 p-3 rounded-lg border border-primary-100 flex justify-between items-center">
                <span className="text-xs text-primary-700 font-medium">Chưa có key?</span>
                <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs bg-white text-primary-700 font-bold px-3 py-1.5 rounded border border-primary-200 hover:shadow-sm transition-all"
                >
                Lấy Key <ExternalLink className="w-3 h-3" />
                </a>
            </div>
          </div>

          <div className="w-full h-px bg-slate-100"></div>

          {/* Database Settings */}
          <div className="space-y-3">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4" /> Database Configuration
             </h3>
             <p className="text-xs text-slate-500 mb-2">
                Cấu hình kết nối Firebase Firestore & Authentication.
             </p>
             <button
                onClick={() => {
                    onClose();
                    onOpenFirebaseConfig();
                }}
                className="w-full py-2 bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all flex items-center justify-center gap-2 text-sm"
             >
                <Database className="w-4 h-4" />
                Cấu hình Firebase
             </button>
          </div>
        </div>

        <div className="flex justify-between gap-3 pt-2">
            <button
                onClick={() => {
                  onClose();
                  onOpenAdminAuth();
                }}
                className="text-xs text-slate-400 font-medium hover:text-violet-600 hover:underline transition-colors flex items-center gap-1"
            >
              <Shield className="w-3 h-3" /> Kích hoạt quyền Chủ sở hữu
            </button>

            <div className="flex gap-3 ml-auto">
              <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
              >
                  Đóng
              </button>
              <button
                  onClick={handleSave}
                  className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-lg shadow-primary-200 transform active:scale-95"
              >
                  <Save className="w-4 h-4" /> Lưu
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;