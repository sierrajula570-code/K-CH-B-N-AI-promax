
import React, { useState } from 'react';
import { LanguageOption, DurationOption, PerspectiveOption, AIProvider } from '../types';
import { Languages, Clock, Settings2, ChevronDown, User, Crown, Bot, Sparkles, Brain, Zap } from 'lucide-react';
import { AI_MODELS } from '../constants';

interface Props {
  languages: LanguageOption[];
  durations: DurationOption[];
  perspectives: PerspectiveOption[];
  
  selectedTemplateId: string;
  selectedLanguage: string;
  onSelectLanguage: (lang: LanguageOption) => void;
  selectedDuration: string;
  onSelectDuration: (duration: DurationOption) => void;
  customMinutes: number;
  setCustomMinutes: (min: number) => void;
  selectedPerspective: string;
  onSelectPerspective: (perspective: PerspectiveOption) => void;
  
  selectedPersona: 'auto' | 'buffett' | 'munger';
  onSelectPersona: (p: 'auto' | 'buffett' | 'munger') => void;

  selectedProvider: AIProvider;
  onSelectProvider: (p: AIProvider) => void;
  selectedModelId: string;
  onSelectModelId: (id: string) => void;
}

const ConfigSection: React.FC<Props> = ({
  languages,
  durations,
  perspectives,
  selectedTemplateId,
  selectedLanguage,
  onSelectLanguage,
  selectedDuration,
  onSelectDuration,
  customMinutes,
  setCustomMinutes,
  selectedPerspective,
  onSelectPerspective,
  selectedPersona,
  onSelectPersona,
  selectedProvider,
  onSelectProvider,
  selectedModelId,
  onSelectModelId
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const showPersonaSelector = selectedTemplateId === 'charlie-munger';
  
  const availableModels = AI_MODELS.filter(m => m.provider === selectedProvider);

  const renderProviderBtn = (id: AIProvider, label: string, colorClass: string, icon: React.ReactNode) => (
    <button
        onClick={() => {
            onSelectProvider(id);
            const first = AI_MODELS.find(m => m.provider === id);
            if(first) onSelectModelId(first.id);
        }}
        className={`
          flex-1 flex flex-col items-center justify-center gap-2 py-3 px-2 rounded-xl font-bold text-xs border transition-all duration-200
          ${selectedProvider === id 
            ? colorClass + ' ring-1 ring-offset-1 ring-offset-white shadow-md transform -translate-y-0.5' 
            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
          }
        `}
    >
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
    </button>
  );

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-slate-100 mb-24 overflow-hidden transition-all duration-300">
      {/* Header */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white hover:from-primary-50 hover:to-white transition-colors group cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary-100 rounded-xl text-secondary-600 border border-secondary-200 group-hover:scale-105 transition-transform">
            <Settings2 className="w-5 h-5" />
          </div>
          <div className="text-left">
             <h3 className="text-sm font-bold text-slate-800 group-hover:text-primary-700 transition-colors">Cấu hình nâng cao (Super AI Hub)</h3>
             <p className="text-xs text-slate-500">Chọn AI (GPT-5, Claude, Gemini...), Ngôn ngữ, Thời lượng</p>
          </div>
        </div>
        
        <div className={`p-1.5 rounded-full bg-slate-100 text-slate-400 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180 bg-primary-100 text-primary-600'}`}>
          <ChevronDown className="w-5 h-5" />
        </div>
      </button>

      {/* Content */}
      <div 
        className={`
          transition-all duration-500 ease-in-out overflow-hidden bg-white
          ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[1200px] opacity-100'}
        `}
      >
        <div className={`p-6 grid grid-cols-1 gap-8 border-t border-slate-100 lg:grid-cols-4`}>
          
          {/* AI MODEL SELECTOR */}
          <div className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-slate-100">
             <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="p-1 bg-teal-100 rounded text-teal-600"><Bot className="w-3.5 h-3.5" /></div>
                    Chọn Nhà Cung Cấp AI
                </h4>
                <div className="flex gap-2 w-full">
                    {renderProviderBtn('google', 'Google', 'bg-blue-50 text-blue-700 border-blue-500', <span className="text-lg">🇬</span>)}
                    {renderProviderBtn('openai', 'OpenAI', 'bg-green-50 text-green-700 border-green-500', <span className="text-lg">🤖</span>)}
                    {renderProviderBtn('anthropic', 'Claude', 'bg-orange-50 text-orange-700 border-orange-500', <Brain className="w-5 h-5 text-orange-600" />)}
                    {renderProviderBtn('xai', 'xAI (Grok)', 'bg-slate-800 text-white border-slate-900', <span className="text-lg font-mono">𝕏</span>)}
                </div>
             </div>
             
             <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <div className="p-1 bg-indigo-100 rounded text-indigo-600"><Sparkles className="w-3.5 h-3.5" /></div>
                    Chọn Model ({availableModels.length})
                </h4>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                    {availableModels.map(model => (
                        <button
                            key={model.id}
                            onClick={() => onSelectModelId(model.id)}
                            className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-left transition-all ${selectedModelId === model.id ? 'bg-slate-800 text-white border-slate-800 shadow-md transform -translate-x-1' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                        >
                            <div className="flex flex-col">
                                <span className="text-sm font-bold">{model.name}</span>
                                <span className={`text-[10px] ${selectedModelId === model.id ? 'text-slate-300' : 'text-slate-400'}`}>{model.description}</span>
                            </div>
                            {model.isPremium && <Crown className={`w-4 h-4 ${selectedModelId === model.id ? 'text-yellow-400' : 'text-slate-300'}`} />}
                        </button>
                    ))}
                </div>
             </div>
          </div>

          {/* Persona Selector */}
          {showPersonaSelector && (
            <div className="animate-in fade-in slide-in-from-left-4 duration-300">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <div className="p-1 bg-yellow-100 rounded text-yellow-600"><Crown className="w-3.5 h-3.5" /></div>
                Chọn Nhân Vật
              </h4>
              <div className="flex flex-col gap-2">
                <button onClick={() => onSelectPersona('auto')} className={`px-4 py-3 text-xs font-bold rounded-xl border text-left transition-all ${selectedPersona === 'auto' ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600'}`}>✨ Tự động (Theo nội dung)</button>
                <button onClick={() => onSelectPersona('buffett')} className={`px-4 py-3 text-xs font-bold rounded-xl border text-left transition-all ${selectedPersona === 'buffett' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}>🍔 Warren Buffett (Lạc quan)</button>
                <button onClick={() => onSelectPersona('munger')} className={`px-4 py-3 text-xs font-bold rounded-xl border text-left transition-all ${selectedPersona === 'munger' ? 'border-slate-600 bg-slate-100 text-slate-800' : 'border-slate-200 text-slate-600'}`}>👓 Charlie Munger (Thực tế)</button>
              </div>
            </div>
          )}

          {/* Language Section */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <div className="p-1 bg-blue-100 rounded text-blue-600"><Languages className="w-3.5 h-3.5" /></div>
              Ngôn ngữ đầu ra
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {languages.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => onSelectLanguage(lang)}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${selectedLanguage === lang.id ? 'border-primary-500 bg-primary-600 text-white shadow-lg' : 'border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-600'}`}
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
              {perspectives.map((perspective) => (
                <button
                  key={perspective.id}
                  onClick={() => onSelectPerspective(perspective)}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border text-left transition-all ${selectedPerspective === perspective.id ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-600 hover:border-primary-300'}`}
                >
                  <span className="text-sm">{perspective.label}</span>
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
              {durations.map((duration) => (
                <button
                  key={duration.id}
                  onClick={() => onSelectDuration(duration)}
                  className={`px-4 py-2.5 text-xs font-bold rounded-xl border transition-all ${selectedDuration === duration.id ? 'border-primary-500 bg-primary-600 text-white shadow-lg' : 'border-slate-200 text-slate-600 hover:border-primary-300 hover:text-primary-600'}`}
                >
                  {duration.label}
                </button>
              ))}
            </div>
            
            {selectedDuration === 'custom' && (
              <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-1">
                <label className="text-sm font-semibold text-slate-700">Số phút:</label>
                <input 
                  type="number" min="1" max="120" value={customMinutes} onChange={(e) => setCustomMinutes(Number(e.target.value))}
                  className="w-20 border border-slate-300 rounded-lg px-3 py-2 text-center font-bold text-primary-700 focus:outline-none focus:border-primary-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigSection;
