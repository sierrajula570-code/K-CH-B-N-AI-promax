import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, Save, Eye, EyeOff } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<Props> = ({ isOpen, onClose }) => {
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
            <Key className="w-5 h-5 text-primary-600" /> Cài đặt API
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6 space-y-4">
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
          
          <div className="bg-primary-50 p-4 rounded-lg border border-primary-100">
            <h4 className="text-sm font-semibold text-primary-800 mb-1">Chưa có API Key?</h4>
            <p className="text-xs text-primary-600 mb-2">
              Bạn cần lấy khóa API miễn phí từ Google AI Studio để sử dụng ứng dụng này.
            </p>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs bg-white text-primary-700 font-medium px-3 py-2 rounded border border-primary-200 hover:border-primary-300 hover:shadow-sm transition-all"
            >
              Lấy API Key tại đây <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-xs text-slate-500 text-center">
            Khóa API của bạn được lưu trữ cục bộ trên trình duyệt này và không bao giờ được gửi đi đâu khác ngoài Google Servers.
          </p>
        </div>

        <div className="flex justify-between gap-3 pt-2">
            {apiKey && (
              <button
                onClick={handleClear}
                className="px-4 py-2 text-red-500 text-sm font-medium hover:bg-red-50 rounded-lg transition-colors"
              >
                Xóa Key
              </button>
            )}
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