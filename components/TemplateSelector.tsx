
import React, { useState } from 'react';
import { ScriptTemplate } from '../types';
import { IconWrapper } from './IconWrapper';
import { LayoutGrid, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  templates: ScriptTemplate[];
  selectedTemplateId: string;
  onSelect: (template: ScriptTemplate) => void;
}

const TemplateSelector: React.FC<Props> = ({ templates, selectedTemplateId, onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Mặc định hiển thị 8 mẫu
  const visibleTemplates = isExpanded ? templates : templates.slice(0, 8);
  const hiddenCount = templates.length - visibleTemplates.length;

  return (
    <div className="mb-8 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <div className="bg-primary-50 p-2 rounded-lg border border-primary-100">
                <LayoutGrid className="w-4 h-4 text-primary-700" />
            </div>
            <h2 className="text-base font-bold text-slate-800">Chọn Mẫu Kịch Bản</h2>
        </div>
        
        {/* Nút toggle ở header (mobile) hoặc chỉ hiển thị nếu cần thiết */}
        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
            {templates.length} mẫu
        </span>
      </div>
      
      {/* Grid compact: 2 cols mobile, 3 md, 4 lg */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 transition-all duration-500 ease-in-out">
        {visibleTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={`
              relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all duration-200 group h-full
              ${selectedTemplateId === template.id 
                ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500/30 shadow-md transform -translate-y-0.5' 
                : 'border-slate-200 bg-white hover:border-primary-300 hover:bg-slate-50 hover:shadow-sm'
              }
            `}
          >
            {/* Icon Box Compact */}
            <div className={`
              text-lg w-8 h-8 flex items-center justify-center rounded-lg shadow-sm transition-colors shrink-0 border
              ${selectedTemplateId === template.id 
                ? 'bg-white border-primary-100 text-primary-600' 
                : 'bg-slate-50 border-slate-100 group-hover:bg-white'}
            `}>
              <IconWrapper icon={template.icon} />
            </div>
            
            {/* Title Only */}
            <span className={`text-[11px] font-bold leading-tight line-clamp-2 ${selectedTemplateId === template.id ? 'text-primary-800' : 'text-slate-700 group-hover:text-primary-700'}`}>
              {template.title}
            </span>
            
            {/* Active Indicator Dot */}
            {selectedTemplateId === template.id && (
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 shadow-glow animate-pulse"></div>
            )}
          </button>
        ))}
      </div>

      {/* Expand/Collapse Button */}
      {templates.length > 8 && (
          <div className="mt-4 flex justify-center">
              <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-white border border-slate-200 text-slate-500 text-[10px] font-bold rounded-full hover:bg-slate-50 hover:text-primary-600 hover:border-primary-200 transition-all shadow-sm group"
              >
                  {isExpanded ? (
                      <>
                          <span>Thu gọn</span>
                          <ChevronUp className="w-3 h-3 group-hover:-translate-y-0.5 transition-transform" />
                      </>
                  ) : (
                      <>
                          <span>Xem thêm {hiddenCount} mẫu</span>
                          <ChevronDown className="w-3 h-3 group-hover:translate-y-0.5 transition-transform" />
                      </>
                  )}
              </button>
          </div>
      )}
    </div>
  );
};

export default TemplateSelector;
