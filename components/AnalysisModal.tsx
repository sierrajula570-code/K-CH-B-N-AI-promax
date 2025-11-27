

import React, { useState } from 'react';
import { ScriptAnalysis } from '../types';
import { X, Check, Edit2, Users, List, Play, Fingerprint, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  analysis: ScriptAnalysis;
  onConfirm: (updatedAnalysis: ScriptAnalysis) => void;
}

const AnalysisModal: React.FC<Props> = ({ isOpen, onClose, analysis, onConfirm }) => {
  const [editableAnalysis, setEditableAnalysis] = useState<ScriptAnalysis>(analysis);
  const [activeTab, setActiveTab] = useState<'outline' | 'characters' | 'profile'>('outline');

  // Sync state when analysis prop changes
  React.useEffect(() => {
    setEditableAnalysis(analysis);
    // Auto switch to profile tab if it's a Monologue with profile data
    if (analysis.characterProfile && !analysis.characters.length) {
        setActiveTab('profile');
    }
  }, [analysis]);

  if (!isOpen) return null;

  const handleOutlineChange = (index: number, val: string) => {
    const newOutline = [...editableAnalysis.outline];
    newOutline[index] = val;
    setEditableAnalysis({ ...editableAnalysis, outline: newOutline });
  };

  const handleCharChange = (index: number, val: string) => {
    const newChars = [...editableAnalysis.characters];
    newChars[index] = val;
    setEditableAnalysis({ ...editableAnalysis, characters: newChars });
  };

  const hasProfile = !!editableAnalysis.characterProfile;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 rounded-t-2xl text-white">
           <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2">
                 <List className="w-6 h-6" /> Phân tích & Lên kế hoạch
              </h2>
              <button onClick={onClose} className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all">
                 <X className="w-5 h-5" />
              </button>
           </div>
           <p className="text-indigo-100 text-sm mt-2">Vui lòng kiểm tra kỹ Nhân vật và Cấu trúc cốt truyện trước khi viết.</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
            <button 
               onClick={() => setActiveTab('outline')}
               className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'outline' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <List className="w-4 h-4" /> Cấu trúc
            </button>
            <button 
               onClick={() => setActiveTab('characters')}
               className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'characters' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            >
                <Users className="w-4 h-4" /> Nhân vật
            </button>
            {hasProfile && (
                <button 
                onClick={() => setActiveTab('profile')}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'profile' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Fingerprint className="w-4 h-4" /> Hồ sơ (Wiki)
                </button>
            )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            {activeTab === 'outline' && (
                <div className="space-y-4">
                    {editableAnalysis.outline.map((step, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between mb-2">
                                <span className="text-xs font-bold uppercase text-indigo-500 bg-indigo-50 px-2 py-1 rounded">
                                    Bước {idx + 1}
                                </span>
                            </div>
                            <textarea
                                value={step}
                                onChange={(e) => handleOutlineChange(idx, e.target.value)}
                                className="w-full text-sm text-slate-700 font-medium border-0 focus:ring-0 p-0 bg-transparent resize-none h-16 leading-relaxed"
                            />
                        </div>
                    ))}
                </div>
            )}
            
            {activeTab === 'characters' && (
                <div className="space-y-3">
                    {editableAnalysis.characters.map((char, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm group focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 font-bold shrink-0">
                                {idx + 1}
                            </div>
                            <input
                                type="text"
                                value={char}
                                onChange={(e) => handleCharChange(idx, e.target.value)}
                                className="w-full text-sm font-bold text-slate-800 border-none focus:ring-0 bg-transparent"
                            />
                            <Edit2 className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100" />
                        </div>
                    ))}
                    <div className="text-center p-4 text-slate-400 text-xs italic">
                        * Bạn có thể sửa tên và vai trò trực tiếp tại đây. AI sẽ tuân thủ danh sách này tuyệt đối.
                    </div>
                </div>
            )}

            {activeTab === 'profile' && editableAnalysis.characterProfile && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-yellow-500" /> Hồ sơ AI Trích xuất
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold">Tên / Định danh</label>
                                <div className="text-sm font-bold text-slate-800">{editableAnalysis.characterProfile.name}</div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 uppercase font-bold">Hình mẫu (Archetype)</label>
                                <div className="text-sm font-medium text-slate-700">{editableAnalysis.characterProfile.archetype}</div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                        <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Phong cách nói chuyện (Style)</label>
                        <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            {editableAnalysis.characterProfile.style}
                        </p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                         <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Triết lý cốt lõi (Worldview)</label>
                         <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            {editableAnalysis.characterProfile.corePhilosophy}
                        </p>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                         <label className="text-xs text-slate-400 uppercase font-bold block mb-2">Từ khóa đặc trưng (Signature Keywords)</label>
                         <div className="flex flex-wrap gap-2">
                             {editableAnalysis.characterProfile.keywords.map((kw, i) => (
                                 <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-full border border-indigo-100">
                                     {kw}
                                 </span>
                             ))}
                         </div>
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 rounded-b-2xl">
            <button 
                onClick={onClose}
                className="px-5 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
            >
                Hủy bỏ
            </button>
            <button 
                onClick={() => onConfirm(editableAnalysis)}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2"
            >
                <Play className="w-4 h-4 fill-current" />
                Xác nhận & Viết Kịch bản
            </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisModal;