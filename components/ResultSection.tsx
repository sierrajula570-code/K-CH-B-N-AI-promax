
import React, { useState } from 'react';
import { Copy, Check, Download, FileText, Sparkles } from 'lucide-react';

interface Props {
  content: string;
}

const ResultSection: React.FC<Props> = ({ content }) => {
  const [copied, setCopied] = useState(false);

  if (!content) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `kichban-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-slate-50/80 border-b border-slate-100 p-4 flex justify-between items-center backdrop-blur-sm">
        <div className="flex items-center gap-3">
           <div className="bg-green-100 p-2 rounded-lg text-green-600 border border-green-200">
              <FileText className="w-5 h-5" />
           </div>
           <div>
              <h3 className="text-sm font-bold text-slate-800">Kết quả Kịch bản</h3>
              <p className="text-xs text-slate-500">Đã tạo xong lúc {new Date().toLocaleTimeString('vi-VN')}</p>
           </div>
        </div>

        <div className="flex items-center gap-2">
            <button 
              onClick={handleDownload}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 hover:text-primary-600 transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Tải về
            </button>
            <button 
              onClick={handleCopy}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5
                ${copied 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700 hover:shadow-md'
                }
              `}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Đã chép" : "Sao chép"}
            </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        <textarea
            readOnly
            value={content}
            className="w-full h-96 p-6 text-sm font-mono leading-relaxed text-slate-800 bg-white border-none focus:outline-none resize-y"
        />
        
        {/* Footer Stats */}
        <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur border border-slate-200 px-3 py-1.5 rounded-full text-xs font-bold text-slate-500 flex items-center gap-2 shadow-sm">
            <Sparkles className="w-3 h-3 text-primary-500" />
            {content.length} ký tự
        </div>
      </div>
    </div>
  );
};

export default ResultSection;
