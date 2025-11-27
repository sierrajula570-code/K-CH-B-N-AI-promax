
import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, Save, Eye, EyeOff, Database, Shield, Fingerprint, Loader2, Bot, Cpu, Layers, Copy, Terminal, Cloud } from 'lucide-react';
import { Account, updatePersonalContext, updateTemplateContext } from '../services/accountService';
import { ScriptTemplate } from '../types';
import { IconWrapper } from './IconWrapper';
import { saveSupabaseConfig, getSupabaseConfig, isSupabaseConfigured } from '../services/supabase';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenFirebaseConfig: () => void;
  onOpenAdminAuth: () => void;
  currentAccount?: Account | null;
  selectedTemplate?: ScriptTemplate; 
}

const SettingsModal: React.FC<Props> = ({ 
  isOpen, 
  onClose, 
  onOpenFirebaseConfig, 
  onOpenAdminAuth, 
  currentAccount, 
  selectedTemplate 
}) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [xaiKey, setXaiKey] = useState('');

  // Supabase State
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [showSupabaseKey, setShowSupabaseKey] = useState(false);
  const [showSql, setShowSql] = useState(false);

  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showXai, setShowXai] = useState(false);
  
  // Context state
  const [personalContext, setPersonalContext] = useState(''); 
  const [templateContext, setTemplateContext] = useState(''); 
  
  const [activeTab, setActiveTab] = useState<'template' | 'global'>('template');
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [contextMessage, setContextMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load Local Keys First
      setGeminiKey(localStorage.getItem('gemini_api_key') || '');
      setOpenaiKey(localStorage.getItem('openai_api_key') || '');
      setAnthropicKey(localStorage.getItem('kb_anthropic_api_key') || '');
      setXaiKey(localStorage.getItem('kb_xai_api_key') || '');
      
      const sbConfig = getSupabaseConfig();
      setSupabaseUrl(sbConfig.url);
      setSupabaseKey(sbConfig.key);

      // --- SUPABASE API KEY FETCHING REMOVED FOR PRIVACY ---
      // Keys are now strictly local.

      if (currentAccount?.personalContext) {
        setPersonalContext(currentAccount.personalContext);
      } else {
        setPersonalContext('');
      }

      if (currentAccount && selectedTemplate && currentAccount.templateContexts) {
          setTemplateContext(currentAccount.templateContexts[selectedTemplate.id] || '');
      } else {
          setTemplateContext('');
      }

      setActiveTab(selectedTemplate ? 'template' : 'global');
    }
  }, [isOpen, currentAccount, selectedTemplate]);

  const handleSave = async () => {
    setIsSavingContext(true);

    // 1. Save Supabase Config First
    if (supabaseUrl.trim() && supabaseKey.trim()) {
        saveSupabaseConfig(supabaseUrl, supabaseKey);
    }

    // 2. Save API Keys (Local Only - Privacy)
    if (geminiKey.trim()) localStorage.setItem('gemini_api_key', geminiKey.trim());
    if (openaiKey.trim()) localStorage.setItem('openai_api_key', openaiKey.trim());
    if (anthropicKey.trim()) localStorage.setItem('kb_anthropic_api_key', anthropicKey.trim());
    if (xaiKey.trim()) localStorage.setItem('kb_xai_api_key', xaiKey.trim());

    // 3. Save Contexts
    if (currentAccount) {
        let success = false;
        if (activeTab === 'global') {
            success = await updatePersonalContext(currentAccount.id, personalContext);
            if (success) currentAccount.personalContext = personalContext;
        } else if (activeTab === 'template' && selectedTemplate) {
            success = await updateTemplateContext(currentAccount.id, selectedTemplate.id, templateContext);
            if (success) {
                if (!currentAccount.templateContexts) currentAccount.templateContexts = {};
                currentAccount.templateContexts[selectedTemplate.id] = templateContext;
            }
        }
    }

    setIsSavingContext(false);
    setContextMessage('Đã lưu cấu hình (Keys saved Locally)!');
    setTimeout(() => {
        setContextMessage('');
        onClose();
    }, 1500);
  };

  const renderKeyInput = (label: string, link: string, val: string, setVal: (s:string)=>void, show: boolean, setShow: (b:boolean)=>void, placeholder: string) => (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
        <label className="block text-xs font-bold text-slate-500 mb-2 flex justify-between">
            <span>{label}</span>
            <a href={link} target="_blank" className="text-primary-600 hover:underline flex items-center gap-1">Lấy Key <ExternalLink className="w-3 h-3"/></a>
        </label>
        <div className="relative">
            <input
            type={show ? "text" : "password"}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-4 pr-10 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
            />
            <button onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
        </div>
    </div>
  );

  const SQL_SCRIPT = `-- 1. Bảng lưu trữ Lịch sử Kịch bản
create table history (
  id text primary key,
  user_id text,
  template_id text,
  template_title text,
  input_preview text,
  content text,
  timestamp bigint
);

-- 2. Mở quyền truy cập
alter table history enable row level security;
create policy "Access History" on history for all using (true) with check (true);`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 border border-slate-100 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Key className="w-5 h-5 text-primary-600" /> Cài đặt Hệ thống
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6 mb-6">
          
          {/* AI Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4" /> Cấu hình API Providers (Local Storage Only)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderKeyInput("GOOGLE GEMINI", "https://aistudio.google.com/app/apikey", geminiKey, setGeminiKey, showGemini, setShowGemini, "AIzaSy...")}
                {renderKeyInput("OPENAI (GPT)", "https://platform.openai.com/api-keys", openaiKey, setOpenaiKey, showOpenai, setShowOpenai, "sk-...")}
                {renderKeyInput("ANTHROPIC (CLAUDE)", "https://console.anthropic.com/", anthropicKey, setAnthropicKey, showAnthropic, setShowAnthropic, "sk-ant-...")}
                {renderKeyInput("xAI (GROK)", "https://console.x.ai/", xaiKey, setXaiKey, showXai, setShowXai, "xai-...")}
            </div>
            
            <div className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded">
                * Lưu ý: API Key chỉ được lưu trên trình duyệt này của bạn để đảm bảo quyền riêng tư.
            </div>
          </div>

          <div className="w-full h-px bg-slate-100"></div>

          {/* SUPABASE SETTINGS */}
          <div className="space-y-3">
             <h3 className="text-sm font-bold text-green-700 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4" /> Supabase Storage (Lưu Lịch sử)
             </h3>
             <p className="text-xs text-slate-500">Kết nối Supabase để lưu trữ lịch sử kịch bản không giới hạn.</p>
             
             <div className="grid grid-cols-1 gap-4 bg-green-50 p-4 rounded-xl border border-green-100">
                <div>
                    <label className="block text-xs font-bold text-green-800 mb-1">Project URL</label>
                    <input
                        type="text"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        placeholder="https://xyz.supabase.co"
                        className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
                    />
                </div>
                <div className="relative">
                    <label className="block text-xs font-bold text-green-800 mb-1">Anon Key (Public)</label>
                    <input
                        type={showSupabaseKey ? "text" : "password"}
                        value={supabaseKey}
                        onChange={(e) => setSupabaseKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                        className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:outline-none pr-10"
                    />
                     <button onClick={() => setShowSupabaseKey(!showSupabaseKey)} className="absolute right-3 top-8 text-green-600 hover:text-green-800">
                        {showSupabaseKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
                
                {/* SQL Helper */}
                <div>
                     <button 
                        onClick={() => setShowSql(!showSql)}
                        className="text-[10px] font-bold text-green-700 hover:text-green-900 flex items-center gap-1 mb-2 underline"
                     >
                        <Terminal className="w-3 h-3" />
                        {showSql ? "Ẩn hướng dẫn SQL" : "Hướng dẫn tạo bảng Database (SQL) - Copy đoạn này!"}
                     </button>
                     
                     {showSql && (
                         <div className="bg-slate-900 rounded-lg p-3 relative group">
                             <pre className="text-[10px] text-green-400 font-mono whitespace-pre-wrap overflow-x-auto">
                                 {SQL_SCRIPT}
                             </pre>
                             <button
                                onClick={() => {
                                    navigator.clipboard.writeText(SQL_SCRIPT);
                                    alert("Đã copy SQL! Hãy vào Supabase > SQL Editor > Paste & Run.");
                                }}
                                className="absolute top-2 right-2 p-1.5 bg-white/10 hover:bg-white/20 rounded text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copy SQL"
                             >
                                <Copy className="w-3 h-3" />
                             </button>
                             <div className="mt-2 text-[10px] text-slate-400">
                                Bắt buộc phải chạy lệnh này thì tính năng lưu Cloud mới hoạt động.
                             </div>
                         </div>
                     )}
                </div>
             </div>
          </div>

          <div className="w-full h-px bg-slate-100"></div>

          {/* Context Section */}
          <div className="space-y-3">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Fingerprint className="w-4 h-4" /> Cá nhân hóa / Bộ nhớ AI
             </h3>
             
             {/* Tab Switcher */}
             <div className="flex gap-2 p-1 bg-slate-100 rounded-lg mb-2">
                {selectedTemplate && (
                    <button 
                        onClick={() => setActiveTab('template')}
                        className={`flex-1 py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'template' ? 'bg-white text-primary-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Riêng cho: {selectedTemplate.title.substring(0, 15)}...</span>
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('global')}
                    className={`flex-1 py-2 px-3 rounded-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'global' ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <Fingerprint className="w-3.5 h-3.5" />
                    <span>Bộ nhớ Chung (Mặc định)</span>
                </button>
             </div>

             {activeTab === 'template' && selectedTemplate ? (
                 <div className="animate-in fade-in duration-300">
                    <textarea
                        value={templateContext}
                        onChange={(e) => setTemplateContext(e.target.value)}
                        placeholder={`Ngữ cảnh riêng cho mẫu: ${selectedTemplate.title}...`}
                        className="w-full h-24 p-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none shadow-sm"
                    />
                 </div>
             ) : (
                 <div className="animate-in fade-in duration-300">
                    <textarea
                        value={personalContext}
                        onChange={(e) => setPersonalContext(e.target.value)}
                        placeholder="Ngữ cảnh chung cho mọi kịch bản..."
                        className="w-full h-24 p-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-sm"
                    />
                 </div>
             )}
          </div>

          <div className="w-full h-px bg-slate-100"></div>

          {/* Legacy Firebase Config */}
          <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-3.5 h-3.5" /> Firebase (Legacy)
             </h3>
             <button
                onClick={() => {
                    onClose();
                    onOpenFirebaseConfig();
                }}
                className="w-full py-2 bg-slate-50 text-slate-500 font-bold rounded-lg border border-slate-200 hover:bg-slate-100 transition-all flex items-center justify-center gap-2 text-xs"
             >
                Cấu hình Firebase
             </button>
          </div>
        </div>

        <div className="flex justify-between items-center gap-3 pt-2">
            <button
                onClick={() => {
                  onClose();
                  onOpenAdminAuth();
                }}
                className="text-xs text-slate-400 font-medium hover:text-violet-600 hover:underline transition-colors flex items-center gap-1"
            >
              <Shield className="w-3 h-3" /> Quyền Owner
            </button>

            <div className="flex gap-3 ml-auto items-center">
              {contextMessage && <span className="text-xs font-bold text-green-600 animate-pulse">{contextMessage}</span>}
              
              <button
                  onClick={onClose}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg transition-colors"
              >
                  Đóng
              </button>
              <button
                  onClick={handleSave}
                  disabled={isSavingContext}
                  className="px-6 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-lg shadow-primary-200 transform active:scale-95 disabled:opacity-70"
              >
                  {isSavingContext ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Lưu & Đồng bộ
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
