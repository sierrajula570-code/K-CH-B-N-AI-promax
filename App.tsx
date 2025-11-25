
import React, { useState, useEffect } from 'react';
import { TEMPLATES, LANGUAGES, DURATIONS, PERSPECTIVES } from './constants';
import { ScriptTemplate, LanguageOption, DurationOption, PerspectiveOption, InputMode, HistoryItem } from './types';
import Header from './components/Header';
import InputSection from './components/InputSection';
import TemplateSelector from './components/TemplateSelector';
import ConfigSection from './components/ConfigSection';
import ResultModal from './components/ResultModal';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal'; // New Import
import { generateScript, calculateTargetLength } from './services/geminiService';
import { 
  getAccounts, 
  initializeDefaultAdmin, 
  getAdminAuthStatus,
  Account,
  setAdminAuthStatus
} from './services/accountService';
import { Zap, Loader2 } from 'lucide-react';

function App() {
  // Auth State
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false); // New state
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // App Logic State
  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.IDEA);
  
  const [selectedTemplate, setSelectedTemplate] = useState<ScriptTemplate>(TEMPLATES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(LANGUAGES[0]);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(DURATIONS[0]);
  const [customMinutes, setCustomMinutes] = useState<number>(5);
  const [selectedPerspective, setSelectedPerspective] = useState<PerspectiveOption>(PERSPECTIVES[0]);

  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [targetStats, setTargetStats] = useState<{ min: number; max: number; target: number } | undefined>(undefined);

  // --- Auth Initialization ---
  useEffect(() => {
    // 1. Ensure accounts exist (creates default admin if empty)
    initializeDefaultAdmin();

    // 2. Check for persisted Admin session
    const accounts = getAccounts();
    const isDeviceAdmin = getAdminAuthStatus();

    if (isDeviceAdmin) {
      // Find the admin account
      const adminAcc = accounts.find(a => a.role === 'admin' && a.isActive);
      if (adminAcc) {
        setCurrentAccount(adminAcc);
      } else {
        // Admin account might have been deleted or deactivated
        setIsLoginOpen(true);
      }
    } else {
      // Not an admin device, require login
      setIsLoginOpen(true);
    }
    
    setIsCheckingAuth(false);
  }, []);

  // --- History Logic ---
  useEffect(() => {
    const savedHistory = localStorage.getItem('script_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (content: string) => {
    if (!content || content.startsWith('⚠️')) return;

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      templateTitle: selectedTemplate.title,
      inputPreview: inputText.substring(0, 50) + (inputText.length > 50 ? '...' : ''),
      content: content
    };

    const newHistory = [newItem, ...history];
    setHistory(newHistory);
    localStorage.setItem('script_history', JSON.stringify(newHistory));
  };

  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter(item => item.id !== id);
    setHistory(newHistory);
    localStorage.setItem('script_history', JSON.stringify(newHistory));
  };
  
  const clearAllHistory = () => {
    if(confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử?")) {
        setHistory([]);
        localStorage.removeItem('script_history');
    }
  }

  // --- Generation Logic ---
  const handleGenerate = async () => {
    if (!inputText.trim()) {
      alert("Vui lòng nhập ý tưởng hoặc nội dung.");
      return;
    }

    setIsLoading(true);
    setTargetStats(undefined);

    try {
      const stats = calculateTargetLength(selectedLanguage.id, selectedDuration.id, customMinutes);
      setTargetStats({
        min: stats.minChars,
        max: stats.maxChars,
        target: stats.targetChars
      });

      const result = await generateScript(
        inputText,
        selectedTemplate,
        selectedLanguage,
        selectedDuration,
        inputMode,
        selectedPerspective,
        customMinutes
      );
      setGeneratedContent(result);
      saveToHistory(result);
      setIsModalOpen(true);
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenHistoryItem = (content: string) => {
    setGeneratedContent(content);
    setTargetStats(undefined);
    setIsHistoryOpen(false);
    setIsModalOpen(true);
  };

  const handleLoginSuccess = (account: Account) => {
    setCurrentAccount(account);
    if (account.role === 'admin') {
      localStorage.setItem('app_admin_auth', 'true');
    }
    setIsLoginOpen(false);
  };

  // --- Auth Checks ---
  if (isCheckingAuth) {
    return null; // Avoid flicker
  }

  const isAdmin = currentAccount?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* If logged in, render the main app */}
      {currentAccount ? (
        <>
          <Header 
            onOpenSettings={() => setIsSettingsOpen(true)} 
            onOpenHistory={() => setIsHistoryOpen(true)}
            activeTab="new"
            isAdmin={isAdmin}
            onOpenAdminPanel={() => setIsAdminOpen(true)}
          />

          <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
            <section>
              <InputSection 
                value={inputText} 
                onChange={setInputText}
                mode={inputMode}
                setMode={setInputMode}
              />
            </section>

            <section>
              <TemplateSelector 
                selectedTemplateId={selectedTemplate.id}
                onSelect={setSelectedTemplate}
              />
            </section>

            <section>
              <ConfigSection 
                selectedLanguage={selectedLanguage.id}
                onSelectLanguage={setSelectedLanguage}
                selectedDuration={selectedDuration.id}
                onSelectDuration={setSelectedDuration}
                customMinutes={customMinutes}
                setCustomMinutes={setCustomMinutes}
                selectedPerspective={selectedPerspective.id}
                onSelectPerspective={setSelectedPerspective}
              />
            </section>
          </main>

          <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 p-4 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.1)]">
            <div className="max-w-6xl mx-auto flex items-center justify-between">
                <div className="hidden md:flex items-center gap-3 text-sm text-slate-500">
                    <div className="bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                      <span className="font-bold text-slate-800">{inputText.length}</span> ký tự
                    </div>
                    <div className="flex items-center gap-2">
                      <span>•</span>
                      <span className="font-medium text-primary-700">{selectedTemplate.title}</span>
                      <span>•</span>
                      <span className="font-medium text-secondary-700">
                        {selectedDuration.id === 'custom' ? `${customMinutes} phút` : selectedDuration.label}
                      </span>
                    </div>
                </div>
                
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !inputText.trim()}
                    className={`
                        flex items-center justify-center gap-2 px-10 py-3.5 rounded-2xl font-extrabold text-white text-lg w-full md:w-auto transition-all duration-300 shadow-xl
                        ${isLoading || !inputText.trim() 
                            ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                            : 'bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 hover:-translate-y-1 hover:shadow-glow'
                        }
                    `}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            <span>Đang phân tích & viết...</span>
                        </>
                    ) : (
                        <>
                            <Zap className="w-6 h-6 fill-current animate-pulse" />
                            TẠO KỊCH BẢN NGAY
                        </>
                    )}
                </button>
            </div>
          </div>

          <ResultModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            content={generatedContent || ''}
            targetLength={targetStats}
          />

          <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
          />

          <HistoryModal
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            history={history}
            onDelete={deleteHistoryItem}
            onSelect={handleOpenHistoryItem}
            onClearAll={clearAllHistory}
          />

          <AdminPanel 
            isOpen={isAdminOpen}
            onClose={() => setIsAdminOpen(false)}
          />
        </>
      ) : (
        // Login Screen Full Overlay
        <div className="relative min-h-screen bg-slate-900">
          <LoginModal 
            isOpen={isLoginOpen && !isSignupOpen}
            onClose={() => {}} // Block closing
            onSuccess={handleLoginSuccess}
            onOpenSignup={() => {
              setIsLoginOpen(false);
              setIsSignupOpen(true);
            }}
          />
          <SignupModal 
            isOpen={isSignupOpen}
            onClose={() => {
              setIsSignupOpen(false);
              setIsLoginOpen(true); // Return to login on close
            }}
            onSuccess={() => {
              setIsSignupOpen(false);
              setIsLoginOpen(true);
              alert('Đăng ký thành công! Vui lòng liên hệ Admin để kích hoạt tài khoản.');
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App;
