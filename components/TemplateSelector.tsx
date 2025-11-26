
import React from 'react';
import { ScriptTemplate } from '../types';
import { IconWrapper } from './IconWrapper';
import { LayoutGrid } from 'lucide-react';

interface Props {
  templates: ScriptTemplate[];
  selectedTemplateId: string;
  onSelect: (template: ScriptTemplate) => void;
}

const TemplateSelector: React.FC<Props> = ({ templates, selectedTemplateId, onSelect }) => {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-gradient-to-br from-primary-100 to-secondary-100 p-2.5 rounded-xl shadow-sm border border-primary-50">
            <LayoutGrid className="w-5 h-5 text-primary-700" />
        </div>
        <h2 className="text-lg font-extrabold text-slate-800">Chọn Mẫu Kịch Bản</h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={`
              flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-200 relative group h-full
              ${selectedTemplateId === template.id 
                ? 'border-primary-500 bg-gradient-to-b from-primary-50 to-white ring-2 ring-primary-500/30 shadow-lg z-10 transform -translate-y-1' 
                : 'border-slate-200 bg-white hover:border-primary-300 hover:shadow-md hover:-translate-y-0.5'
              }
            `}
          >
            <div className="flex items-center gap-3 mb-2 w-full">
              <div className={`
                text-2xl w-9 h-9 flex items-center justify-center rounded-xl shadow-sm transition-colors shrink-0 border border-slate-100
                ${selectedTemplateId === template.id 
                  ? 'bg-white text-primary-600' 
                  : 'bg-slate-50 group-hover:bg-primary-50 group-hover:text-primary-600'}
              `}>
                <IconWrapper icon={template.icon} />
              </div>
              <span className={`font-bold text-xs leading-tight ${selectedTemplateId === template.id ? 'text-primary-800' : 'text-slate-700 group-hover:text-primary-700'}`}>
                {template.title}
              </span>
            </div>
            
            <p className={`text-[11px] line-clamp-2 leading-relaxed ${selectedTemplateId === template.id ? 'text-primary-700/80' : 'text-slate-400 group-hover:text-slate-500'}`}>
              {template.description}
            </p>
            
            {/* Active Indicator */}
            {selectedTemplateId === template.id && (
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500 shadow-glow animate-pulse"></div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelector;
