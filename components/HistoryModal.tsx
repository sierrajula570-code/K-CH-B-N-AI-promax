import React from 'react';
import { X, Copy, Trash2, Calendar, FileText } from 'lucide-react';
import { HistoryItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onDelete: (id: string) => void;
  onSelect: (content: string) => void;
  onClearAll: () => void;
}

const HistoryModal: React.FC<Props> = ({ isOpen, onClose, history, onDelete, onSelect, onClearAll }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary-600" /> Lịch sử Kịch bản
            </h2>
            <span className="bg-primary-100 text-primary-700 text-xs px-2 py-1 rounded-full font-bold">{history.length}</span>
          </div>
         
          <div className="flex items-center gap-2">
             {history.length > 0 && (
              <button 
                onClick={onClearAll}
                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors font-medium mr-2"
              >
                Xóa tất cả
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
          {history.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <FileText className="w-16 h-16 opacity-20" />
              <p>Chưa có kịch bản nào được lưu.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-md mb-2 inline-block">
                        {item.templateTitle}
                      </span>
                      <p className="text-sm font-medium text-slate-800 line-clamp-1">
                        Input: {item.inputPreview}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                         onClick={() => {
                           navigator.clipboard.writeText(item.content);
                           alert("Đã sao chép vào bộ nhớ đệm!");
                         }}
                         title="Sao chép"
                         className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button 
                         onClick={() => onDelete(item.id)}
                         title="Xóa"
                         className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div 
                    onClick={() => onSelect(item.content)}
                    className="text-xs text-slate-500 line-clamp-3 bg-slate-50 p-2 rounded border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors font-mono"
                  >
                    {item.content}
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                    <Calendar className="w-3 h-3" />
                    {new Date(item.timestamp).toLocaleString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;