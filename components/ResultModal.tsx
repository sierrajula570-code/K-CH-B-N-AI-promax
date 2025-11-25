import React, { useMemo, useState } from 'react';
import { X, Copy, Check, AlertTriangle, FileCheck, ListCollapse, Loader2, Download } from 'lucide-react';
import { summarizeScript } from '../services/geminiService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  content: string;
  targetLength?: { min: number; max: number; target: number };
}

const ResultModal: React.FC<Props> = ({ isOpen, onClose, content, targetLength }) => {
  const [copied, setCopied] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  // Calculate actual length whenever content changes
  const actualLength = useMemo(() => content.length, [content]);

  // Determine status
  const status = useMemo(() => {
    if (!targetLength) return 'neutral';
    if (actualLength < targetLength.min) return 'short';
    if (actualLength > targetLength.max) return 'long';
    return 'good';
  }, [actualLength, targetLength]);

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
    document.body.appendChild(element); // Required for FireFox
    element.click();
    document.body.removeChild(element);
  };

  const handleSummarize = async () => {
      setIsSummarizing(true);
      try {
          const result = await summarizeScript(content);
          setSummary(result);
      } catch (e) {
          setSummary("Không thể tạo tóm tắt vào lúc này.");
      } finally {
          setIsSummarizing(false);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3">
             <h2 className="text-lg font-bold text-slate-800">Kết quả Kịch bản</h2>
             {/* Quality Badge */}
             {targetLength && (
                <div className={`
                  flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border
                  ${status === 'good' ? 'bg-green-50 text-green-700 border-green-200' : 
                    status === 'short' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                    'bg-blue-50 text-blue-700 border-blue-200'}
                `}>
                  {status === 'good' ? (
                    <><Check className="w-3 h-3" /> Đạt yêu cầu</>
                  ) : status === 'short' ? (
                    <><AlertTriangle className="w-3 h-3" /> Hơi ngắn</>
                  ) : (
                    <><FileCheck className="w-3 h-3" /> Hơi dài</>
                  )}
                  <span className="ml-1 opacity-75 font-normal">
                    ({actualLength} / {targetLength.target})
                  </span>
                </div>
             )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={handleSummarize}
              disabled={isSummarizing}
              className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium mr-1"
            >
              {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListCollapse className="w-4 h-4" />}
              {isSummarizing ? "Đang tóm tắt..." : "Tóm tắt ý chính"}
            </button>

            <div className="w-px h-6 bg-slate-200 mx-1"></div>

            <button 
              onClick={handleDownload}
              className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
              title="Tải xuống .txt"
            >
              <Download className="w-4 h-4" />
              Tải về
            </button>

            <button 
              onClick={handleCopy}
              className="p-2 text-slate-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Đã sao chép" : "Sao chép"}
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 relative">
            {/* Summary Panel (if active) */}
            {summary && (
                <div className="bg-yellow-50 border-b border-yellow-100 p-6 sticky top-0 z-10 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-yellow-800 flex items-center gap-2">
                            <ListCollapse className="w-4 h-4" /> Tóm tắt nhanh
                        </h3>
                        <button 
                            onClick={() => setSummary(null)} 
                            className="text-yellow-600 hover:text-yellow-800 text-xs font-medium"
                        >
                            Đóng
                        </button>
                    </div>
                    <div className="prose prose-sm prose-yellow text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {summary}
                    </div>
                </div>
            )}

            {/* Main Script */}
            <div className="p-6 font-mono text-sm leading-relaxed whitespace-pre-wrap text-slate-800">
                {content}
            </div>
        </div>
        
        {/* Footer (Validation Info) */}
        {targetLength && (
            <div className="bg-white border-t border-slate-100 p-3 flex justify-between items-center text-xs text-slate-500 rounded-b-2xl">
               <span>
                  Yêu cầu: <strong>{targetLength.min} - {targetLength.max}</strong> ký tự
               </span>
               <span>
                  Xác nhận 2 lớp: {status === 'good' ? '✅ Hoàn tất' : '⚠️ Cần kiểm tra lại'}
               </span>
            </div>
        )}
      </div>
    </div>
  );
};

export default ResultModal;