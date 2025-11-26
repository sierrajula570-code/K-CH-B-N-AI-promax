
import React, { useState, useEffect } from 'react';
import { 
  Users, X, UserPlus, Search, RefreshCw, 
  Lock, Unlock, Clock, Shield, CheckCircle, 
  CalendarDays, Trash2, LogOut, ChevronLeft, 
  ChevronRight, Mail, Crown, MoreHorizontal, ArrowRight,
  Database, CloudUpload
} from 'lucide-react';
import { 
  getAccounts, 
  createAccountByAdmin, 
  extendAccount, 
  toggleAccountActive, 
  updateUserRole,
  deleteAccount,
  logout,
  Account, 
  AccountRole 
} from '../services/accountService';
import { seedDatabase } from '../services/configService';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  
  // New Account Form State
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AccountRole>('user');
  const [newDays, setNewDays] = useState<string>('30'); // Default 30 days
  const [isLifetime, setIsLifetime] = useState(false);
  
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // State for row actions
  const [extendDaysMap, setExtendDaysMap] = useState<Record<string, string>>({});

  // Search & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  // Reset pagination when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const loadAccounts = async () => {
    setIsLoading(true);
    const data = await getAccounts();
    // Sort: Created recent first
    const sorted = data.sort((a, b) => b.createdAt - a.createdAt);
    setAccounts(sorted);
    setIsLoading(false);
  };

  const handleSeedData = async () => {
    if(confirm("Hành động này sẽ ghi đè dữ liệu Templates, Languages, v.v. mặc định lên Cloud Firestore. Bạn có chắc chắn không?")) {
        setIsSeeding(true);
        const success = await seedDatabase(true);
        setIsSeeding(false);
        if(success) {
            alert("Đã đồng bộ Dữ liệu Kiến thức lên Cloud thành công! Hãy tải lại App.");
        } else {
            alert("Lỗi khi đồng bộ dữ liệu.");
        }
    }
  };

  const setDurationPreset = (days: number) => {
      if (days === -1) {
          setIsLifetime(true);
          setNewDays('');
      } else {
          setIsLifetime(false);
          setNewDays(days.toString());
      }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    setIsCreating(true);

    if (!newUsername || !newPassword) {
      setFormError('Vui lòng nhập tên tài khoản và mật khẩu');
      setIsCreating(false);
      return;
    }

    const days = isLifetime ? null : (parseInt(newDays) || 30);
    
    // Use the secondary app method to prevent logging out admin
    const result = await createAccountByAdmin(newUsername, newEmail, newPassword, newRole, days);

    if (result.ok) {
      setFormSuccess(`Đã tạo tài khoản "${newUsername}" thành công!`);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setNewDays('30');
      setIsLifetime(false);
      loadAccounts(); 
      setTimeout(() => setFormSuccess(''), 3000);
    } else {
      setFormError(result.error || 'Lỗi khi tạo tài khoản');
    }
    setIsCreating(false);
  };

  const handleExtend = async (id: string, currentActive: boolean) => {
    const inputVal = extendDaysMap[id];
    // If empty input, default to 30. If typed "-1", meant lifetime.
    const daysToExtend = inputVal ? parseInt(inputVal) : 30;

    const message = daysToExtend === -1 
        ? `Bạn có chắc muốn cấp quyền VĨNH VIỄN cho tài khoản này?` 
        : `Gia hạn thêm ${daysToExtend} ngày cho tài khoản này?`;

    if (confirm(message)) {
      await extendAccount(id, daysToExtend);
      setExtendDaysMap(prev => ({...prev, [id]: ''})); // Clear input
      loadAccounts();
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? "KHOÁ" : "MỞ KHOÁ";
    if (confirm(`Xác nhận ${action} tài khoản này?`)) {
      await toggleAccountActive(id);
      loadAccounts();
    }
  };

  const handleChangeRole = async (id: string, currentRole: AccountRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if(confirm(`Thay đổi quyền từ ${currentRole.toUpperCase()} sang ${newRole.toUpperCase()}?`)) {
        await updateUserRole(id, newRole);
        loadAccounts();
    }
  };

  const handleDelete = async (id: string, username: string) => {
    const confirmMsg = `CẢNH BÁO: Bạn sắp xóa vĩnh viễn tài khoản "${username}".\nHành động này không thể hoàn tác.\n\nNhấn OK để xóa.`;
    if (confirm(confirmMsg)) {
      const success = await deleteAccount(id);
      if (success) {
        loadAccounts();
      } else {
        alert("Có lỗi xảy ra khi xóa.");
      }
    }
  };

  const handleLogout = async () => {
    if (confirm("Đăng xuất Admin?")) {
      await logout();
      onClose();
      window.location.reload();
    }
  };

  // --- Filtering & Pagination Logic ---
  const filteredAccounts = accounts.filter(acc => 
    acc.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (acc.email && acc.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredAccounts.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentAccounts = filteredAccounts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white rounded-2xl w-full max-w-[1400px] h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 ring-1 ring-slate-900/5">
        
        {/* Header Section */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center shrink-0">
           <div className="flex items-center gap-4">
             <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
                <Shield className="w-6 h-6 text-white" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white tracking-tight">Admin Dashboard</h2>
                <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    Hệ thống cấp quyền trực tuyến
                </div>
             </div>
           </div>
           
           <div className="flex items-center gap-3">
             <button
               onClick={handleSeedData}
               disabled={isSeeding}
               className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20"
             >
                {isSeeding ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                <span className="hidden sm:inline">Đồng bộ Kiến thức lên Mây</span>
             </button>

             <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-300 font-bold">{accounts.length} Tài khoản</span>
             </div>
             <button 
               onClick={handleLogout}
               className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-red-500/20"
             >
               <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Đăng xuất</span>
             </button>
             <button onClick={onClose} className="text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-2.5 rounded-xl transition-all">
               <X className="w-5 h-5" />
             </button>
           </div>
        </div>

        <div className="flex-1 flex overflow-hidden bg-slate-50">
          
          {/* LEFT: Create User Panel */}
          <div className="w-[360px] bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 shrink-0">
            <div className="p-6 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-indigo-600" /> Cấp Quyền Mới
                </h3>
                <p className="text-xs text-slate-500 mt-1">Tạo user & set hạn dùng ngay lập tức.</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <form onSubmit={handleCreateAccount} className="space-y-5">
                    {/* Input Group */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Username <span className="text-red-500">*</span></label>
                            <input 
                            type="text" 
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            placeholder="vd: khachvip01"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                            required
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Email (Tùy chọn)</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                type="email" 
                                value={newEmail}
                                onChange={(e) => setNewEmail(e.target.value)}
                                placeholder="email@example.com"
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 border-indigo-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Mật khẩu <span className="text-red-500">*</span></label>
                            <input 
                            type="text" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Tối thiểu 6 ký tự"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            required
                            />
                        </div>
                    </div>

                    <div className="w-full h-px bg-slate-100"></div>

                    {/* Roles & Duration */}
                    <div className="space-y-4">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cấu hình Quyền hạn</label>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setNewRole('user')}
                                className={`py-2.5 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 transition-all ${newRole === 'user' ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                            >
                                <Users className="w-3.5 h-3.5" /> Thành viên
                            </button>
                            <button
                                type="button"
                                onClick={() => setNewRole('admin')}
                                className={`py-2.5 px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 transition-all ${newRole === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200 ring-1 ring-purple-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                            >
                                <Shield className="w-3.5 h-3.5" /> Quản trị
                            </button>
                        </div>

                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-slate-600">Thời hạn sử dụng</span>
                                <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-400">Ngày</span>
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    type="number" 
                                    value={newDays}
                                    disabled={isLifetime}
                                    onChange={(e) => setNewDays(e.target.value)}
                                    className={`w-full p-2.5 border rounded-lg text-sm font-bold text-center focus:outline-none focus:border-indigo-500 ${isLifetime ? 'bg-slate-100 text-slate-400' : 'bg-white border-slate-300 text-slate-800'}`}
                                    min="1"
                                    placeholder={isLifetime ? "∞" : "30"}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2 mt-2">
                                <button type="button" onClick={() => setDurationPreset(30)} className="py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded text-[10px] font-medium text-slate-600 hover:text-indigo-600 transition-colors">1 Tháng</button>
                                <button type="button" onClick={() => setDurationPreset(365)} className="py-1.5 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded text-[10px] font-medium text-slate-600 hover:text-indigo-600 transition-colors">1 Năm</button>
                                <button type="button" onClick={() => setDurationPreset(-1)} className={`py-1.5 border rounded text-[10px] font-medium transition-colors ${isLifetime ? 'bg-slate-800 text-white border-slate-800' : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-600'}`}>Vĩnh viễn</button>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    {formError && (
                        <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl font-medium flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                            <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{formError}</span>
                        </div>
                    )}
                    {formSuccess && (
                        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs rounded-xl font-medium flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                            <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{formSuccess}</span>
                        </div>
                    )}
                </form>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50">
                <button
                    onClick={handleCreateAccount}
                    disabled={isCreating}
                    className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
                >
                    {isCreating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    {isCreating ? 'Đang tạo...' : 'Xác nhận tạo User'}
                </button>
            </div>
          </div>

          {/* RIGHT: Management Table */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            
            {/* Toolbar */}
            <div className="p-5 border-b border-slate-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="relative w-full sm:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm user, email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
              <button 
                onClick={loadAccounts} 
                className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 hover:text-indigo-600 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Làm mới
              </button>
            </div>

            {/* Table Area */}
            <div className="flex-1 overflow-auto bg-slate-50 p-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-[800px]">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-4">Tài khoản</th>
                      <th className="px-6 py-4 text-center">Vai trò</th>
                      <th className="px-6 py-4 text-center">Trạng thái</th>
                      <th className="px-6 py-4">Hạn dùng (Expires)</th>
                      <th className="px-6 py-4 text-right">Tác vụ quản lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentAccounts.map((acc) => {
                       const isExpired = acc.expiresAt !== null && acc.expiresAt < Date.now();
                       return (
                        <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors group">
                          {/* User Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white shadow-sm ${acc.role === 'admin' ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' : 'bg-gradient-to-br from-slate-200 to-slate-300 text-slate-600'}`}>
                                    {acc.username.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-800 text-sm">{acc.username}</div>
                                  <div className="text-xs text-slate-500 flex items-center gap-1">
                                      {acc.email}
                                  </div>
                                </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-6 py-4 text-center">
                             <button
                               onClick={() => handleChangeRole(acc.id, acc.role)}
                               className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all hover:scale-105 ${
                                   acc.role === 'admin' 
                                   ? 'bg-purple-50 text-purple-700 border-purple-200' 
                                   : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                               }`}
                             >
                                 {acc.role === 'admin' ? <Crown className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                                 {acc.role.toUpperCase()}
                             </button>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 text-center">
                            <button
                                onClick={() => handleToggleActive(acc.id, acc.isActive)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold border transition-all hover:scale-105 ${
                                    acc.isActive 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                    : 'bg-red-50 text-red-600 border-red-200'
                                }`}
                            >
                                {acc.isActive ? <CheckCircle className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                                {acc.isActive ? 'HOẠT ĐỘNG' : 'ĐÃ KHOÁ'}
                            </button>
                          </td>

                          {/* Expiry */}
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                                <span className={`text-sm font-bold flex items-center gap-1.5 ${isExpired ? 'text-red-500' : 'text-slate-700'}`}>
                                    {acc.expiresAt === null 
                                        ? <span className="text-indigo-600 flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Vĩnh viễn</span> 
                                        : new Date(acc.expiresAt).toLocaleDateString('vi-VN')
                                    }
                                </span>
                                {isExpired && <span className="text-[10px] font-bold text-red-500 bg-red-50 px-1.5 rounded w-fit mt-1">Đã hết hạn</span>}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                             <div className="flex items-center justify-end gap-2">
                                {/* Quick Extend Input */}
                                <div className="flex items-center h-9 bg-white border border-slate-200 rounded-lg shadow-sm focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all overflow-hidden w-32">
                                    <input 
                                        type="number" 
                                        className="w-full h-full px-2 text-xs font-bold text-center outline-none placeholder:text-slate-300"
                                        placeholder="+ Ngày"
                                        value={extendDaysMap[acc.id] || ''}
                                        onChange={(e) => setExtendDaysMap(prev => ({...prev, [acc.id]: e.target.value}))}
                                        onKeyDown={(e) => e.key === 'Enter' && handleExtend(acc.id, acc.isActive)}
                                    />
                                    <button 
                                        onClick={() => handleExtend(acc.id, acc.isActive)}
                                        className="h-full px-2.5 bg-slate-50 hover:bg-indigo-50 border-l border-slate-100 text-indigo-600 transition-colors"
                                        title="Gia hạn (Nhập -1 để Vĩnh viễn)"
                                    >
                                        <Clock className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                                
                                <div className="h-4 w-px bg-slate-200 mx-1"></div>

                                <button 
                                    onClick={() => handleDelete(acc.id, acc.username)}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Xóa tài khoản"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                             </div>
                          </td>
                        </tr>
                       );
                    })}
                  </tbody>
                </table>
                
                {currentAccounts.length === 0 && (
                    <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                        <Users className="w-12 h-12 mb-3 opacity-20" />
                        <p>Không tìm thấy tài khoản nào.</p>
                    </div>
                )}
              </div>
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
               <div className="p-4 bg-white border-t border-slate-200 flex justify-between items-center text-xs font-medium text-slate-500">
                  <span>Đang xem {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredAccounts.length)} trên tổng {filteredAccounts.length}</span>
                  <div className="flex gap-2">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 border rounded hover:bg-slate-50 disabled:opacity-50"
                      >
                        Trước
                      </button>
                      <button 
                         onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                         disabled={currentPage === totalPages}
                         className="px-3 py-1.5 border rounded hover:bg-slate-50 disabled:opacity-50"
                      >
                        Sau
                      </button>
                  </div>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
