
import React, { useState, useEffect } from 'react';
import { Users, X, UserPlus, Search, RefreshCw, Lock, Unlock, Clock, Shield, CheckCircle, CalendarDays, Trash2, LogOut } from 'lucide-react';
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
  
  // New Account Form State (Admin creation)
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<AccountRole>('user');
  const [newDays, setNewDays] = useState<string>('30'); 
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // State for custom extension days per account row
  const [extendDaysMap, setExtendDaysMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      loadAccounts();
    }
  }, [isOpen]);

  const loadAccounts = async () => {
    setIsLoading(true);
    const data = await getAccounts();
    setAccounts(data);
    setIsLoading(false);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!newUsername || !newPassword) {
      setFormError('Vui lòng nhập tên tài khoản và mật khẩu');
      return;
    }

    const days = newDays.trim() === '' ? null : parseInt(newDays);
    
    // Lưu ý: createAccountByAdmin trên Firebase Client có hạn chế, nhưng vẫn để UI
    const result = await createAccountByAdmin(newUsername, newPassword, newRole, days);

    if (result.ok) {
      setFormSuccess(`Đã tạo tài khoản "${newUsername}" thành công!`);
      setNewUsername('');
      setNewPassword('');
      loadAccounts(); 
      setTimeout(() => setFormSuccess(''), 3000);
    } else {
      setFormError(result.error || 'Lỗi khi tạo tài khoản');
    }
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
      // App.tsx auth listener will handle redirection
    }
  };

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
              <UserPlus className="w-5 h-5 text-primary-600" /> Cấp tài khoản thủ công
            </h3>
            
            <form onSubmit={handleCreateAccount} className="space-y-4">
               {/* Disabled overlay since client-side admin creation is limited in Firebase without Cloud Functions */}
               <div className="opacity-50 pointer-events-none relative">
                 <div className="absolute inset-0 z-10"></div>
                 <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Tên đăng nhập</label>
                    <input type="text" className="w-full p-3 bg-white border border-slate-200 rounded-xl" disabled />
                 </div>
                 {/* ... other fields ... */}
               </div>
               
               <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-800 leading-relaxed">
                  <strong>Lưu ý quan trọng:</strong> Khi dùng Firebase Client, vui lòng hướng dẫn người dùng tự đăng ký (qua nút "Tạo tài khoản" ở màn hình đăng nhập). Sau đó, bạn sẽ thấy họ xuất hiện ở danh sách bên phải để Duyệt.
               </div>
            </form>
          </div>

          {/* RIGHT: Account List */}
          <div className="flex-1 p-6 overflow-y-auto bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Search className="w-5 h-5 text-slate-400" /> Danh sách ({accounts.length})
              </h3>
              <button onClick={loadAccounts} disabled={isLoading} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                    <th className="p-4 font-semibold">Tài khoản</th>
                    <th className="p-4 font-semibold">Vai trò</th>
                    <th className="p-4 font-semibold">Trạng thái</th>
                    <th className="p-4 font-semibold">Hết hạn</th>
                    <th className="p-4 font-semibold text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 font-bold text-slate-700">
                        {acc.username}
                        <div className="text-[10px] font-normal text-slate-400">{acc.email}</div>
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
                          : <span className="text-slate-400 italic">Chưa thiết lập</span>
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
                         
                         {/* Lock/Unlock Control - Protect "admin" username specifically or check logic */}
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
