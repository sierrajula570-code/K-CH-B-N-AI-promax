import React, { useState } from 'react';
import { X, Plus, Copy, Check, Shield } from 'lucide-react';
import { generateLicenseKey } from '../services/licenseService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const AdminPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [days, setDays] = useState(30);
  const [generatedKey, setGeneratedKey] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    const key = generateLicenseKey(days);
    setGeneratedKey(key);
    setCopied(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden">
        <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <h2 className="text-lg font-bold flex items-center gap-2 text-emerald-400">
            <Shield className="w-5 h-5" /> Quản lý License Key
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
           <div>
             <label className="block text-sm font-medium text-slate-300 mb-2">Thời hạn sử dụng (Ngày)</label>
             <div className="flex gap-2 mb-3">
               {[1, 7, 30, 90, 365].map(d => (
                 <button 
                   key={d}
                   onClick={() => setDays(d)}
                   className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${days === d ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                 >
                   {d} ngày
                 </button>
               ))}
             </div>
             <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">Tùy chỉnh:</span>
                <input 
                type="number" 
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-24 bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-center font-bold"
                />
             </div>
           </div>

           <button 
             onClick={handleGenerate}
             className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
           >
             <Plus className="w-5 h-5" /> Tạo Mã Kích Hoạt Mới
           </button>

           {generatedKey && (
             <div className="bg-slate-800 p-4 rounded-xl border border-slate-600 animate-in slide-in-from-bottom-2">
               <label className="text-xs font-bold text-slate-400 uppercase block mb-2">Mã kích hoạt của bạn:</label>
               <div className="flex items-center gap-2">
                 <code className="flex-1 bg-black/30 p-3 rounded-lg font-mono text-xs text-emerald-300 break-all border border-slate-700/50">
                   {generatedKey}
                 </code>
                 <button 
                   onClick={handleCopy}
                   className="p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors border border-slate-600"
                   title="Sao chép"
                 >
                   {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
                 </button>
               </div>
               <p className="text-xs text-slate-500 mt-2 text-center">
                 Key này có hiệu lực {days} ngày kể từ thời điểm người dùng nhập vào máy.
               </p>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;