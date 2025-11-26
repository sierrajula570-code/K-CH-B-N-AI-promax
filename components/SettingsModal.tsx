
import React, { useState, useEffect } from 'react';
import { X, Key, ExternalLink, Save, Eye, EyeOff, Database, Shield, Fingerprint, Loader2, Bot, Cpu, Layers } from 'lucide-react';
import { Account, updatePersonalContext, updateTemplateContext } from '../services/accountService';
import { ScriptTemplate } from '../types';
import { IconWrapper } from './IconWrapper';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onOpenFirebaseConfig: () => void;
  onOpenAdminAuth: () => void;
  currentAccount?: Account | null;
  selectedTemplate?: ScriptTemplate; // Nhận thêm template đang chọn
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

  const [showGemini, setShowGemini] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showXai, setShowXai] = useState(false);
  
  // Context state
  const [personalContext, setPersonalContext] = useState(''); // Bộ nhớ chung
  const [templateContext, setTemplateContext] = useState(''); // Bộ nhớ riêng cho Template hiện tại
  
  const [activeTab, setActiveTab] = useState<'template' | 'global'>('template');
  const [isSavingContext, setIsSavingContext] = useState(false);
  const [contextMessage, setContextMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setGeminiKey(localStorage.getItem('gemini_api_key') || '');
      setOpenaiKey(localStorage.getItem('openai_api_key') || '');
      setAnthropicKey(localStorage.getItem('kb_anthropic_api_key') || '');
      setXaiKey(localStorage.getItem('kb_xai_api_key') || '');
      
      // Load Global Context
      if (currentAccount?.personalContext) {
        setPersonalContext(currentAccount.personalContext);
      } else {
        setPersonalContext('');
      }

      // Load Template Specific Context
      if (currentAccount && selectedTemplate && currentAccount.templateContexts) {
          setTemplateContext(currentAccount.templateContexts[selectedTemplate.id] || '');
      } else {
          setTemplateContext('');
      }

      // Default to Template tab if a template is selected, else Global
      setActiveTab(selectedTemplate ? 'template' : 'global');
    }
  }, [isOpen, currentAccount, selectedTemplate]);

  const handleSave = async () => {
    // 1. Save API Keys Local
    if (geminiKey.trim()) localStorage.setItem('gemini_api_key', geminiKey.trim());
    if (openaiKey.trim()) localStorage.setItem('openai_api_key', openaiKey.trim());
    if (anthropicKey.trim()) localStorage.setItem('kb_anthropic_api_key', anthropicKey.trim());
    if (xaiKey.trim()) localStorage.setItem('kb_xai_api_key', xaiKey.trim());

    if (!currentAccount) {
        alert('Đã lưu cấu hình API!');
        onClose();
        return;
    }

    setIsSavingContext(true);
    let success = false;

    // 2. Save Context based on Active Tab
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

    setIsSavingContext(false);

    if (success) {
        setContextMessage('Đã lưu dữ liệu!');
        setTimeout(() => {
            setContextMessage('');
            onClose();
        }, 1000);
    } else {
        // Just API keys saved or error
        setContextMessage('Đã lưu API Keys!');
        setTimeout(() => {
            setContextMessage('');
            onClose();
        }, 1000);
    }
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
                <Bot className="w-4 h-4" /> Cấu hình AI Providers (Super AI Hub)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderKeyInput("GOOGLE GEMINI", "https://aistudio.google.com/app/apikey", geminiKey, setGeminiKey, showGemini, setShowGemini, "AIzaSy...")}
                {renderKeyInput("OPENAI (GPT)", "https://platform.openai.com/api-keys", openaiKey, setOpenaiKey, showOpenai, setShowOpenai, "sk-...")}
                {renderKeyInput("ANTHROPIC (CLAUDE)", "https://console.anthropic.com/", anthropicKey, setAnthropicKey, showAnthropic, setShowAnthropic, "sk-ant-...")}
                {renderKeyInput("xAI (GROK)", "https://console.x.ai/", xaiKey, setXaiKey, showXai, setShowXai, "xai-...")}
            </div>
          </div>

          <div className="w-full h-px bg-slate-100"></div>

          {/* Memory / Brand Voice Section */}
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
                    <div className="flex items-center gap-2 mb-2 bg-primary-50 p-2 rounded-lg border border-primary-100">
                         <div className="text-lg"><IconWrapper icon={selectedTemplate.icon} /></div>
                         <span className="text-xs font-bold text-primary-700">Đang dạy AI cách viết riêng cho mẫu: {selectedTemplate.title}</span>
                    </div>
                    <textarea
                        value={templateContext}
                        onChange={(e) => setTemplateContext(e.target.value)}
                        placeholder={`Ví dụ: "Với mẫu ${selectedTemplate.title} này, tôi luôn muốn giọng văn hài hước, dùng nhiều từ lóng miền Nam, và xưng hô là 'Ad'..."`}
                        className="w-full h-24 p-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all resize-none shadow-sm"
                    />
                 </div>
             ) : (
                 <div className="animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 mb-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                         <span className="text-xs font-bold text-slate-500">Bộ nhớ này sẽ được dùng khi Mẫu kịch bản không có bộ nhớ riêng.</span>
                    </div>
                    <textarea
                        value={personalContext}
                        onChange={(e) => setPersonalContext(e.target.value)}
                        placeholder="Ví dụ: Tôi là chuyên gia Bất động sản, phong cách sang trọng. Kênh của tôi hướng tới khách hàng cao cấp..."
                        className="w-full h-24 p-3 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-sm"
                    />
                 </div>
             )}
          </div>

          <div className="w-full h-px bg-slate-100"></div>

          {/* Database Settings */}
          <div className="space-y-3">
             <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Database className="w-4 h-4" /> Database Configuration
             </h3>
             <button
                onClick={() => {
                    onClose();
                    onOpenFirebaseConfig();
                }}
                className="w-full py-2 bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all flex items-center justify-center gap-2 text-sm"
             >
                <Database className="w-4 h-4" />
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
                  Lưu
              </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
