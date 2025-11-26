
import React from 'react';
import { History, Zap, Settings, ShieldCheck } from 'lucide-react';

interface Props {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  activeTab?: 'new' | 'history'; // Made optional as it wasn't used in the requested snippet
  isAdmin?: boolean; // Kept for compatibility but not used for button visibility
  onOpenAdminPanel: () => void;
}

const Header: React.FC<Props> = ({ onOpenSettings, onOpenHistory, onOpenAdminPanel }) => {
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
          
          <nav className="flex items-center gap-3 text-sm font-medium">
            <button
                onClick={onOpenHistory}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition backdrop-blur-sm border border-white/10"
            >
                <History className="w-4 h-4" />
                <span>Lịch sử</span>
            </button>

            <button
                onClick={onOpenAdminPanel}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500 text-white font-semibold hover:bg-amber-400 transition shadow-lg border border-amber-400"
            >
                <ShieldCheck className="w-4 h-4" />
                <span>Quản trị</span>
            </button>

            <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 transition backdrop-blur-sm border border-white/10"
            >
                <Settings className="w-4 h-4" />
                <span>Cài đặt</span>
            </button>
          </nav>
        </div>
      </div>
      
      {/* Decorative bottom line */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
    </div>
  );
};

export default Header;
