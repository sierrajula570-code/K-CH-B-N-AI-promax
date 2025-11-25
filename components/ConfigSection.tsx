import React, { useState } from 'react';
import { LanguageOption, DurationOption, PerspectiveOption } from '../types';
import { LANGUAGES, DURATIONS, PERSPECTIVES } from '../constants';
import { Languages, Clock, Settings2, ChevronDown, User } from 'lucide-react';

interface Props {
  selectedLanguage: string;
  onSelectLanguage: (lang: LanguageOption) => void;
  selectedDuration: string;
  onSelectDuration: (duration: DurationOption) => void;
  customMinutes: number;
  setCustomMinutes: (min: number) => void;
  selectedPerspective: string;
  onSelectPerspective: (perspective: PerspectiveOption) => void;
}

const ConfigSection: React.FC<Props> = ({
  selectedLanguage,
  onSelectLanguage,
  selectedDuration,
  onSelectDuration,
  customMinutes,
  setCustomMinutes,
  selectedPerspective,
  onSelectPerspective
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-100 mb-24 overflow-hidden transition-all duration-300">
      {/* Collapsible Header */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white hover:from-primary-50 hover:to-white transition-colors group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary-100 rounded-xl text-secondary-600 border border-secondary-200 group-hover:scale-105 transition-transform">
            <Settings2 className="w-5 h-5" />
          </div>
          <div className="text-left">
             <h3 className="text-sm font-bold text-slate-800 group-hover:text-primary-700 transition-colors">Cấu hình nâng cao</h3>
             <p className="text-xs text-slate-500">Ngôn ngữ, Thời lượng & Ngôi kể</p>
          </div>
        </div>
        
        <div className={`p-1.5 rounded-full bg-slate-100 text-slate-400 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180 bg-primary-100 text-primary-600'}`}>
          <ChevronDown className="w-5 h-5" />
        </div>
      </button>

      {/* Collapsible Content */}
      <div 
        className={`
          transition-all duration-500 ease-in-out overflow-hidden bg-white
          ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[800px] opacity-100'}
        `}
      >
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 border-t border-slate-100">
          
          {/* Language Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="p-1 bg-blue-100 rounded text-blue-600"><Languages className="w-3.5 h-3.5" /></div>
              Ngôn ngữ đầu ra
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => onSelectLanguage(lang)}
                  className={`
                    px-4 py-2.5 text-xs font-bold rounded-xl border transition-all duration-200
                    ${selectedLanguage === lang.id
                      ? 'border-primary-500 bg-primary-600 text-white shadow-lg shadow-primary-500/20 transform scale-105'
                      : 'border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50'
                    }
                  `}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Perspective Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="p-1 bg-purple-100 rounded text-purple-600"><User className="w-3.5 h-3.5" /></div>
              Ngôi kể
            </h4>
            <div className="flex flex-col gap-2">
              {PERSPECTIVES.map((perspective) => (
                <button
                  key={perspective.id}
                  onClick={() => onSelectPerspective(perspective)}
                  className={`
                    px-4 py-2.5 text-xs font-bold rounded-xl border text-left transition-all duration-200 flex flex-col
                    ${selectedPerspective === perspective.id
                      ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500 text-primary-700'
                      : 'border-slate-200 text-slate-600 hover:border-primary-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <span className="text-sm">{perspective.label}</span>
                  <span className={`text-[10px] font-normal ${selectedPerspective === perspective.id ? 'text-primary-500' : 'text-slate-400'}`}>
                    {perspective.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Duration Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="p-1 bg-orange-100 rounded text-orange-600"><Clock className="w-3.5 h-3.5" /></div>
              Thời lượng video
            </h4>
            <div className="flex flex-wrap gap-2.5 mb-4">
              {DURATIONS.map((duration) => (
                <button
                  key={duration.id}
                  onClick={() => onSelectDuration(duration)}
                  className={`
                    px-4 py-2.5 text-xs font-bold rounded-xl border transition-all duration-200
                    ${selectedDuration === duration.id
                      ? 'border-primary-500 bg-primary-600 text-white shadow-lg shadow-primary-500/20 transform scale-105'
                      : 'border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-600 hover:bg-primary-50'
                    }
                  `}
                >
                  {duration.label}
                </button>
              ))}
            </div>
            
            {selectedDuration === 'custom' && (
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-1">
                <label className="text-sm font-semibold text-slate-700">Số phút tùy chỉnh:</label>
                <div className="flex items-center relative">
                  <input 
                    type="number" 
                    min="1" 
                    max="120"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(Number(e.target.value))}
                    className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-center font-bold text-primary-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200"
                  />
                  <span className="ml-2 text-sm font-medium text-slate-500">phút (~{(customMinutes * 150)} từ)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigSection;