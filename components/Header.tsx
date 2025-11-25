
import React from 'react';
import { History, Zap, Settings, ShieldCheck } from 'lucide-react';

interface Props {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  activeTab: 'new' | 'history';
  isAdmin: boolean;
  onOpenAdminPanel: () => void;
}

const Header: React.FC<Props> = ({ onOpenSettings, onOpenHistory, activeTab, isAdmin, onOpenAdminPanel }) => {
  return (
    <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600 text-white shadow-lg sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300 shadow-inner border border-white/10">
               <Zap className="w-6 h-6 text-yellow-300 fill-current transform group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Kichban AI</h1>
              <p className="text-[10px] text-primary-100 font-medium tracking-wider uppercase opacity-90">Trợ lý sáng tạo kịch bản đa năng</p>
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={onOpenHistory}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all border ${
                activeTab === 'history' 
                ? 'bg-white text-primary-700 border-white shadow-md' 
                : 'bg-white/10 text-white border-white/20 hover:bg-white/20 hover:shadow-sm'
              }`}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">Lịch sử</span>
            </button>

            {/* Admin button - Conditionally rendered */}
            {isAdmin && (
              <button
                onClick={onOpenAdminPanel}
                className="flex items-center gap-2 bg-slate-900/30 hover:bg-slate-900/50 text-white px-4 py-2 rounded-full text-sm font-bold border border-white/10 transition-all shadow-lg hover:shadow-xl ring-1 ring-white/10"
              >
                <ShieldCheck className="w-4 h-4 text-violet-300" />
                <span className="hidden sm:inline">Quản trị viên</span>
              </button>
            )}
            
            <button 
              onClick={onOpenSettings}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30 transition-all px-4 py-2 rounded-full text-sm font-bold backdrop-blur-md border border-white/20 hover:shadow-sm"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Cài đặt</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Decorative bottom line */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
    </div>
  );
};

export default Header;
