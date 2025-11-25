import React from 'react';
import { History, Zap, Settings, ShieldCheck } from 'lucide-react';

interface Props {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  activeTab: 'new' | 'history';
  onOpenAdminAuth: () => void;
  onOpenAdminPanel: () => void;
  isAdmin: boolean;
}

const Header: React.FC<Props> = ({ 
  onOpenSettings, 
  onOpenHistory, 
  activeTab, 
  onOpenAdminAuth, 
  onOpenAdminPanel,
  isAdmin 
}) => {
  return (
    <div className="bg-gradient-to-r from-primary-700 via-primary-600 to-secondary-600 text-white shadow-lg sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div 
            className="flex items-center gap-3 group cursor-pointer select-none"
            onClick={(e) => {
                // Secret trigger: 5 rapid clicks on logo to open Admin Auth if not already admin
                if (e.detail === 5 && !isAdmin) {
                    onOpenAdminAuth();
                }
            }}
          >
            <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-sm group-hover:bg-white/30 transition-all duration-300 shadow-inner border border-white/10">
               <Zap className="w-6 h-6 text-yellow-300 fill-current transform group-hover:scale-110 transition-transform" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-white">Kichban AI</h1>
              <p className="text-[10px] text-primary-100 font-medium tracking-wider uppercase opacity-90">Trợ lý sáng tạo kịch bản đa năng</p>
            </div>
          </div>
          
          <div className="flex gap-2 md:gap-3">
            {/* Admin Button - Only visible to Authenticated Admin */}
            {isAdmin && (
              <button 
                onClick={onOpenAdminPanel}
                className="flex items-center gap-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 border border-emerald-400/30 px-3 py-2 rounded-full text-xs font-bold transition-all animate-in fade-in"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}

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