
import React from 'react';
import { History, Zap, Settings, ShieldCheck, Clock, Crown } from 'lucide-react';
import { Account } from '../services/accountService';

interface Props {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  activeTab?: 'new' | 'history';
  onOpenAdminPanel: () => void;
  currentAccount: Account | null; // Receive current account info
}

const Header: React.FC<Props> = ({ onOpenSettings, onOpenHistory, onOpenAdminPanel, currentAccount }) => {
  const isAdmin = currentAccount?.role === 'admin';
  
  // Format expiry date
  const getExpiryDisplay = () => {
    if (!currentAccount) return null;
    if (currentAccount.role === 'admin') return 'Admin Access';
    if (currentAccount.expiresAt === null) return 'Vĩnh viễn';
    
    const date = new Date(currentAccount.expiresAt);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return `Hết hạn: ${date.toLocaleDateString('vi-VN')} (${diffDays} ngày)`;
  };

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
              <div className="flex items-center gap-2">
                 <p className="text-[10px] text-primary-100 font-medium tracking-wider uppercase opacity-90">Trợ lý sáng tạo</p>
                 {!isAdmin && currentAccount && (
                    <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/80 border border-white/10 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {getExpiryDisplay()}
                    </span>
                 )}
              </div>
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

            {/* SECURITY LOGIC: Only show Admin Button if role is 'admin' */}
            {isAdmin && (
                <button
                    onClick={onOpenAdminPanel}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500 text-white font-semibold hover:bg-amber-400 transition shadow-lg border border-amber-400 animate-in fade-in zoom-in"
                >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Quản trị</span>
                </button>
            )}

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
