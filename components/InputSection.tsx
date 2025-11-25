import React from 'react';
import { InputMode } from '../types';
import { Lightbulb, FileText, Link as LinkIcon, Sparkles } from 'lucide-react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  mode: InputMode;
  setMode: (mode: InputMode) => void;
}

const InputSection: React.FC<Props> = ({ value, onChange, mode, setMode }) => {
  return (
    <div className="relative z-10">
      {/* Background glow effect for prominence */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-300 to-secondary-300 rounded-[20px] blur opacity-30 animate-pulse-slow pointer-events-none"></div>
      
      <div className="relative bg-white rounded-2xl shadow-card border-0 overflow-hidden group transition-all duration-300">
        {/* Header / Tabs */}
        <div className="bg-slate-50/80 border-b border-slate-100 p-2 flex gap-2 backdrop-blur-sm">
          {[
            { id: InputMode.IDEA, label: 'Ý tưởng mới', icon: Lightbulb, activeClass: 'bg-gradient-to-r from-yellow-50 to-orange-50 text-yellow-700 ring-1 ring-yellow-200 shadow-sm', iconColor: 'text-yellow-500' },
            { id: InputMode.TEXT, label: 'Viết lại văn bản', icon: FileText, activeClass: 'bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 ring-1 ring-blue-200 shadow-sm', iconColor: 'text-blue-500' },
            { id: InputMode.LINK, label: 'Từ đường Link', icon: LinkIcon, activeClass: 'bg-gradient-to-r from-pink-50 to-rose-50 text-pink-700 ring-1 ring-pink-200 shadow-sm', iconColor: 'text-pink-500' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id)}
              className={`
                flex-1 flex items-center justify-center gap-2.5 px-4 py-3.5 text-sm font-bold rounded-xl transition-all duration-300
                ${mode === tab.id
                  ? tab.activeClass
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                }
              `}
            >
              <tab.icon className={`w-4 h-4 ${mode === tab.id ? 'fill-current' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Input Area - Fixed Large Height */}
        <div className="relative group">
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={
              mode === InputMode.IDEA 
                ? "💡 Nhập ý tưởng, chủ đề hoặc nội dung thô của bạn tại đây...\n\nVí dụ: \n- Viết kịch bản về 5 thói quen giúp sống thọ.\n- Kịch bản video ngắn về mẹo vặt nhà bếp.\n- Câu chuyện cảm động về tình cha con." 
                : mode === InputMode.TEXT 
                ? "📝 Dán toàn bộ văn bản gốc cần viết lại tại đây..."
                : "🔗 Dán đường link bài viết hoặc video (YouTube, Blog) bạn muốn chuyển thành kịch bản..."
            }
            className="w-full h-96 p-6 text-lg leading-relaxed text-slate-800 placeholder-slate-400 bg-white border-none focus:outline-none resize-none font-normal"
          />
          
          {/* Visual cues */}
          <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
          
          {/* Character Count Badge */}
          <div className="absolute bottom-4 right-4">
             <div className={`
               backdrop-blur shadow-sm px-4 py-2 rounded-full text-xs font-bold border transition-all duration-300 flex items-center gap-2
               ${value.length > 0 ? 'bg-primary-50/90 text-primary-700 border-primary-200' : 'bg-slate-50/90 text-slate-400 border-slate-200'}
             `}>
               <Sparkles className={`w-3.5 h-3.5 ${value.length > 0 ? 'fill-current animate-pulse' : ''}`} />
               <span className="font-mono text-sm">{value.length}</span> ký tự
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputSection;