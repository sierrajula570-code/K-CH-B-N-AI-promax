
import React, { useState, useEffect } from 'react';
import { Users, X, UserPlus, Search, RefreshCw, Lock, Unlock, Clock, Shield, CheckCircle, CalendarDays, Trash2, LogOut, ChevronLeft, ChevronRight, Mail } from 'lucide-react';
import { 
  getAccounts, 
  createAccountByAdmin, 
  extendAccount, 
  toggleAccountActive, 
  deleteAccount,
  logout,
  Account, 
  AccountRole 
} from '../services/accountService';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  
  // New Account Form State (Admin creation)
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AccountRole>('user');
  const [newDays, setNewDays] = useState<string>('30'); 
  
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // State for custom extension days per account row
  const [extendDaysMap, setExtendDaysMap] = useState<Record<string, number>>({});

  // Search & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

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
    // Sort by created date desc (newest first) if createdAt exists, or just generic sort
    const sorted = data.sort((a, b) => b.createdAt - a.createdAt);
    setAccounts(sorted);
    setIsLoading(false);
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

    const days = newDays.trim() === '' ? null : parseInt(newDays);
    
    // Gọi hàm tạo tài khoản nâng cao
    const result = await createAccountByAdmin(newUsername, newEmail, newPassword, newRole, days);

    if (result.ok) {
      setFormSuccess(`Đã tạo tài khoản "${newUsername}" thành công!`);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setNewDays('30');
      loadAccounts(); 
      setTimeout(() => setFormSuccess(''), 3000);
    } else {
      setFormError(result.error || 'Lỗi khi tạo tài khoản');
    }
    setIsCreating(false);
  };

  const handleExtend = async (id: string, currentActive: boolean) => {
    const daysToExtend = extendDaysMap[id] || 30;

    if (daysToExtend <= 0) {
        alert("Số ngày gia hạn phải lớn hơn 0");
        return;
    }

    const message = currentActive 
        ? `Gia hạn thêm ${daysToExtend} ngày cho tài khoản này?`
        : `KÍCH HOẠT và Gia hạn ${daysToExtend} ngày cho tài khoản này?`;

    if (confirm(message)) {
      await extendAccount(id, daysToExtend);
      loadAccounts();
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const action = currentStatus ? "KHOÁ" : "MỞ KHOÁ";
    if (confirm(`Bạn có chắc muốn ${action} tài khoản này?`)) {
      await toggleAccountActive(id);
      loadAccounts();
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn XÓA vĩnh viễn tài khoản này?")) {
      const success = await deleteAccount(id);
      if (success) {
        loadAccounts();
      } else {
        alert("Không thể xóa tài khoản này.");
      }
    }
  };

  const handleLogout = async () => {
    if (confirm("Đăng xuất khỏi hệ thống?")) {
      await logout();
      onClose();
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 flex justify-between items-center shrink-0">
           <div className="flex items-center gap-3">
             <div className="p-2 bg-violet-600 rounded-lg shadow-lg shadow-violet-900/50">
                <Users className="w-6 h-6 text-white" />
             </div>
             <div>
                <h2 className="text-xl font-bold text-white">Quản lý Tài khoản (Firebase)</h2>
                <p className="text-xs text-slate-400">Hệ thống phân quyền & người dùng</p>
             </div>
           </div>
           <div className="flex items-center gap-3">
             <button 
               onClick={handleLogout}
               className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/40 text-red-200 px-3 py-2 rounded-lg text-xs font-bold transition-colors border border-red-500/30"
             >
               <LogOut className="w-4 h-4" /> Đăng xuất
             </button>
             <button onClick={onClose} className="text-slate-400 hover:text-white bg-white/10 p-2 rounded-lg transition-colors">
               <X className="w-5 h-5" />
             </button>
           </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          
          {/* LEFT: Create Account Form */}
          <div className="w-1/3 max-w-sm bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto hidden lg:block">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary-600" /> Tạo Tài khoản Mới
            </h3>
            
            <form onSubmit={handleCreateAccount} className="space-y-4">
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Tên hiển thị</label>
                    <input 
                      type="text" 
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="VD: Nguyen Van A"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      required
                    />
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Email (Tùy chọn)</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="email" 
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="user@example.com"
                        className="w-full pl-9 p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Nếu để trống, sẽ tự tạo email ảo từ tên.</p>
                 </div>

                 <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Mật khẩu</label>
                    <input 
                      type="text" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mật khẩu (min 6 ký tự)"
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:outline-none"
                      required
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Vai trò</label>
                        <select 
                            value={newRole}
                            onChange={(e) => setNewRole(e.target.value as AccountRole)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                        >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Thời hạn (ngày)</label>
                        <input 
                            type="number" 
                            value={newDays}
                            onChange={(e) => setNewDays(e.target.value)}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                            min="0"
                        />
                    </div>
                 </div>

                 {formError && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg font-medium">
                        {formError}
                    </div>
                 )}
                 {formSuccess && (
                    <div className="p-3 bg-green-50 text-green-600 text-xs rounded-lg font-medium">
                        {formSuccess}
                    </div>
                 )}

                 <button
                    type="submit"
                    disabled={isCreating}
                    className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 disabled:opacity-70 disabled:cursor-not-allowed"
                 >
                    {isCreating ? 'Đang tạo...' : 'Tạo & Kích hoạt ngay'}
                 </button>
            </form>
          </div>

          {/* RIGHT: Account List */}
          <div className="flex-1 p-6 flex flex-col bg-white overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3 shrink-0">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Tìm theo tên hoặc email..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500">
                   Tổng: {filteredAccounts.length}
                </span>
                <button onClick={loadAccounts} disabled={isLoading} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="Làm mới">
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 shadow-sm relative">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="sticky top-0 z-10 shadow-sm">
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 font-semibold">Tài khoản</th>
                    <th className="p-4 font-semibold">Vai trò</th>
                    <th className="p-4 font-semibold">Trạng thái</th>
                    <th className="p-4 font-semibold">Hết hạn</th>
                    <th className="p-4 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm bg-white">
                  {currentAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                         {searchTerm ? 'Không tìm thấy kết quả phù hợp.' : 'Chưa có tài khoản nào.'}
                      </td>
                    </tr>
                  ) : (
                    currentAccounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-4 font-bold text-slate-700">
                          {acc.username}
                          <div className="text-[10px] font-normal text-slate-400 flex items-center gap-1">
                             <Mail className="w-3 h-3" /> {acc.email}
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${acc.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                            {acc.role.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          {acc.isActive ? (
                            <span className="flex items-center gap-1 text-green-600 font-medium">
                              <Shield className="w-3 h-3" /> Hoạt động
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-amber-500 font-bold bg-amber-50 px-2 py-1 rounded-full w-fit">
                              <Clock className="w-3 h-3" /> Chờ duyệt / Khoá
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-500 font-mono text-xs">
                          {acc.expiresAt 
                            ? new Date(acc.expiresAt).toLocaleDateString('vi-VN') 
                            : <span className="text-slate-400 italic">Vô thời hạn</span>
                          }
                        </td>
                        <td className="p-4 text-right flex justify-end items-center gap-3">
                          {/* Extension Controls */}
                          <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 border border-slate-200">
                              <div className="relative">
                                  <input 
                                      type="number" 
                                      min="1"
                                      className="w-12 bg-transparent text-center font-bold text-xs outline-none text-slate-700 placeholder:text-slate-400"
                                      placeholder="30"
                                      value={extendDaysMap[acc.id] || ''}
                                      onChange={(e) => {
                                          const val = parseInt(e.target.value);
                                          setExtendDaysMap(prev => ({...prev, [acc.id]: isNaN(val) ? 0 : val}));
                                      }}
                                  />
                              </div>
                              <span className="text-[10px] text-slate-400 font-medium border-l border-slate-300 pl-1 pr-1">ngày</span>
                          </div>

                          <button 
                              onClick={() => handleExtend(acc.id, acc.isActive)}
                              title={acc.isActive ? `Gia hạn thêm ${extendDaysMap[acc.id] || 30} ngày` : `Kích hoạt + Gia hạn ${extendDaysMap[acc.id] || 30} ngày`}
                              className={`p-2 rounded-lg border flex items-center gap-1 transition-colors ${!acc.isActive ? 'bg-green-600 text-white hover:bg-green-700 border-green-600 shadow-md' : 'bg-green-50 text-green-600 hover:bg-green-100 border-green-200'}`}
                          >
                              {!acc.isActive ? <CheckCircle className="w-4 h-4" /> : <CalendarDays className="w-4 h-4" />}
                              <span className="text-xs font-bold hidden xl:inline">{!acc.isActive ? 'Duyệt' : 'Gia hạn'}</span>
                          </button>
                          
                          {/* Lock/Unlock Control */}
                          {acc.username !== 'admin' && (
                            <>
                              <button 
                                  onClick={() => handleToggleActive(acc.id, acc.isActive)}
                                  title={acc.isActive ? "Khóa tài khoản" : "Mở khóa"}
                                  className={`p-2 rounded-lg border transition-colors ${acc.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300'}`}
                              >
                                  {acc.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                              </button>

                              <button 
                                  onClick={() => handleDelete(acc.id)}
                                  title="Xóa tài khoản"
                                  className="p-2 rounded-lg border bg-red-600 text-white hover:bg-red-700 border-red-600 transition-colors"
                              >
                                  <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-between items-center pt-4 shrink-0 border-t border-slate-100 mt-2">
                <span className="text-xs text-slate-500">
                  Hiển thị {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredAccounts.length)} trong tổng số {filteredAccounts.length}
                </span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-600" />
                  </button>
                  <span className="text-sm font-bold text-slate-700 px-2">
                     Trang {currentPage} / {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-600" />
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
