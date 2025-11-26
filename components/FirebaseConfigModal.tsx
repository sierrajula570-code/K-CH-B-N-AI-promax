
import React, { useState } from 'react';
import { Flame, Save, ExternalLink } from 'lucide-react';
import { saveFirebaseConfig } from '../services/firebase';

interface Props {
  isOpen: boolean;
  onClose?: () => void; // Optional because if forced, we might not want to close without saving
}

const FirebaseConfigModal: React.FC<Props> = ({ isOpen }) => {
  const [configInput, setConfigInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      // Allow user to paste the full JS object text (e.g. "apiKey: '...'") by trying to fix quotes
      // or just expect standard JSON.
      // For safety, let's try to parse strict JSON first, if fails, warn user.
      
      // We'll be lenient: try to parse the input.
      // If the user pastes: const firebaseConfig = { ... }; we need to extract the object.
      let jsonStr = configInput;
      
      // Simple heuristic to extract object if wrapped in code
      const firstBrace = configInput.indexOf('{');
      const lastBrace = configInput.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
          jsonStr = configInput.substring(firstBrace, lastBrace + 1);
      }

      // Replace single quotes with double quotes for JSON.parse compatibility (basic attempt)
      // This is a rough fix for copied JS objects. 
      // Ideally, user should paste valid JSON.
      // Let's rely on valid JSON or careful editing for now to avoid breaking things.
      
      const config = JSON.parse(jsonStr);
      
      if (!config.apiKey || !config.authDomain || !config.projectId) {
          throw new Error("Thiếu thông tin quan trọng (apiKey, authDomain, hoặc projectId).");
      }

      saveFirebaseConfig(config);
    } catch (e: any) {
      setError('Định dạng không hợp lệ. Vui lòng đảm bảo bạn dán đúng chuỗi JSON (hoặc object {}). ' + e.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-md">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in fade-in zoom-in duration-300">
        
        <div className="text-center mb-6">
          <div className="bg-orange-100 w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 border-4 border-white shadow-lg">
            <Flame className="w-8 h-8 text-orange-600 fill-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Kết nối Database</h2>
          <p className="text-slate-500 text-sm mt-2">
            Ứng dụng cần cấu hình Firebase để lưu trữ tài khoản và dữ liệu.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
            <p className="font-bold text-slate-700 mb-2">Hướng dẫn lấy cấu hình:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Truy cập <a href="https://console.firebase.google.com" target="_blank" className="text-primary-600 hover:underline">Firebase Console</a></li>
              <li>Chọn Project của bạn &rarr; Project Settings (Bánh răng).</li>
              <li>Cuộn xuống mục <strong>Your apps</strong>.</li>
              <li>Chọn Web app (&lt;/&gt;) và copy đoạn <code>firebaseConfig</code>.</li>
              <li>Chuyển đoạn config đó thành <strong>JSON</strong> (dùng dấu nháy kép <code>"key": "value"</code>) và dán vào dưới đây.</li>
            </ol>
          </div>

          <div>
             <textarea
               value={configInput}
               onChange={(e) => {
                   setConfigInput(e.target.value);
                   setError('');
               }}
               placeholder='{
  "apiKey": "AIzaSy...",
  "authDomain": "...",
  "projectId": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "..."
}'
               className="w-full h-40 p-4 font-mono text-xs bg-slate-900 text-green-400 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
             />
             {error && <p className="text-red-500 text-xs mt-2 font-bold">{error}</p>}
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold py-3.5 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" />
            Lưu & Khởi động lại
          </button>
        </div>
      </div>
    </div>
  );
};

export default FirebaseConfigModal;
