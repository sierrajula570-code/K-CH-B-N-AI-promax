
import React, { useState, useEffect } from 'react';
import { TEMPLATES, LANGUAGES, DURATIONS, PERSPECTIVES, AI_MODELS } from './constants'; 
import { ScriptTemplate, LanguageOption, DurationOption, PerspectiveOption, InputMode, HistoryItem, AIProvider } from './types';
import Header from './components/Header';
import InputSection from './components/InputSection';
import TemplateSelector from './components/TemplateSelector';
import ConfigSection from './components/ConfigSection';
import ResultModal from './components/ResultModal';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import FirebaseConfigModal from './components/FirebaseConfigModal'; 
import AdminAuthModal from './components/AdminAuthModal';
import { universalGenerateScript, calculateTargetLength } from './services/universalAiService';
import { 
  getUserProfile,
  Account,
  logout,
  upgradeToAdmin
} from './services/accountService';
import { 
  getHistory, 
  saveHistoryItem as saveToFirestore, 
  deleteHistoryItem as deleteFromFirestore,
  clearHistory as clearFirestoreHistory,
  saveToGlobalKnowledge,
  getRecentHistoryByTemplate
} from './services/historyService';
import { fetchAppConfig } from './services/configService';
import { auth, isConfigured } from './services/firebase'; 
import { onAuthStateChanged } from 'firebase/auth';
import { Zap, Loader2 } from 'lucide-react';

function App() {
  // Auth State
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Configuration State
  const [isFirebaseConfigOpen, setIsFirebaseConfigOpen] = useState(!isConfigured); 
  
  // App Config Data (Knowledge)
  const [templates, setTemplates] = useState<ScriptTemplate[]>(TEMPLATES);
  const [languages, setLanguages] = useState<LanguageOption[]>(LANGUAGES);
  const [durations, setDurations] = useState<DurationOption[]>(DURATIONS);
  const [perspectives, setPerspectives] = useState<PerspectiveOption[]>(PERSPECTIVES);

  // App Logic State
  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>(InputMode.IDEA);
  
  const [selectedTemplate, setSelectedTemplate] = useState<ScriptTemplate>(TEMPLATES[0]);
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(LANGUAGES[0]);
  const [selectedDuration, setSelectedDuration] = useState<DurationOption>(DURATIONS[0]);
  const [customMinutes, setCustomMinutes] = useState<number>(5);
  const [selectedPerspective, setSelectedPerspective] = useState<PerspectiveOption>(PERSPECTIVES[0]);
  
  const [selectedPersona, setSelectedPersona] = useState<'auto' | 'buffett' | 'munger'>('auto');

  // AI Selection State
  const [selectedProvider, setSelectedProvider] = useState<AIProvider>('google');
  const [selectedModelId, setSelectedModelId] = useState<string>('gemini-2.5-flash');

  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [targetStats, setTargetStats] = useState<{ min: number; max: number; target: number } | undefined>(undefined);

  // --- Auth Initialization with Firebase ---
  useEffect(() => {
    if (!isConfigured) {
      setIsCheckingAuth(false);
      return; 
    }

    // 1. Fetch Dynamic Configuration
    const loadConfig = async () => {
        const config = await fetchAppConfig();
        setTemplates(config.templates);
        setLanguages(config.languages);
        setDurations(config.durations);
        setPerspectives(config.perspectives);
        
        if(config.templates.length > 0) setSelectedTemplate(config.templates[0]);
        if(config.languages.length > 0) setSelectedLanguage(config.languages[0]);
        if(config.durations.length > 0) setSelectedDuration(config.durations[0]);
        if(config.perspectives.length > 0) setSelectedPerspective(config.perspectives[0]);
    };
    loadConfig();

    // 2. Auth State Listener
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setIsCheckingAuth(true);
      if (user) {
        const profile = await getUserProfile(user.uid);
        if (profile) {
           if (!profile.isActive && profile.role !== 'admin') {
             setCurrentAccount(null);
             setIsLoginOpen(true);
           } else if (profile.expiresAt !== null && Date.now() > profile.expiresAt) {
             alert("Tài khoản đã hết hạn.");
             await logout();
             setCurrentAccount(null);
             setIsLoginOpen(true);
           } else {
             setCurrentAccount(profile);
             setIsLoginOpen(false);
             loadCloudHistory(profile.id);
           }
        } else {
          setCurrentAccount(null);
          setIsLoginOpen(true); 
        }
      } else {
        setCurrentAccount(null);
        setHistory([]);
        setIsLoginOpen(true);
      }
      setIsCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // --- History Logic ---
  const loadCloudHistory = async (uid: string) => {
    const cloudHistory = await getHistory(uid);
    setHistory(cloudHistory);
  };

  const saveToHistory = async (content: string) => {
    if (!content || content.startsWith('⚠️')) return;
    
    // 1. Lưu vào kho chung (Global Warehouse)
    await saveToGlobalKnowledge(
        inputText,
        content,
        selectedTemplate.id,
        selectedLanguage.id
    );

    // 2. Lưu vào lịch sử cá nhân (nếu đã đăng nhập)
    if (!currentAccount) return;

    const newItem: HistoryItem = {
      id: Date.now().toString(),
      userId: currentAccount.id,
      timestamp: Date.now(),
      templateId: selectedTemplate.id, // Lưu lại Template ID để AI sau này học
      templateTitle: selectedTemplate.title,
      inputPreview: inputText.substring(0, 50) + (inputText.length > 50 ? '...' : ''),
      content: content
    };

    setHistory(prev => [newItem, ...prev]);
    await saveToFirestore(currentAccount.id, newItem);
  };

  const deleteHistoryItem = async (id: string) => {
    if (!currentAccount) return;
    setHistory(prev => prev.filter(item => item.id !== id));
    await deleteFromFirestore(currentAccount.id, id);
  };
  
  const clearAllHistory = async () => {
    if (!currentAccount) return;
    if(confirm("Bạn có chắc chắn muốn xóa toàn bộ lịch sử CÁ NHÂN?\nDữ liệu đã đóng góp vào Kho tri thức chung sẽ KHÔNG bị xóa.")) {
        setHistory([]);
        await clearFirestoreHistory(currentAccount.id);
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

      // --- AUTO LEARNING RETRIEVAL ---
      // Lấy các bài viết cũ của User cho mẫu này để AI học
      let learnedExamples: string[] = [];
      if (currentAccount) {
         learnedExamples = await getRecentHistoryByTemplate(currentAccount.id, selectedTemplate.id);
         if (learnedExamples.length > 0) {
             console.log(">> AI Auto-Learning: Retrieved " + learnedExamples.length + " previous scripts.");
         }
      }

      // --- MEMORY RETRIEVAL STRATEGY ---
      const specificContext = currentAccount?.templateContexts?.[selectedTemplate.id];
      const globalContext = currentAccount?.personalContext;
      
      const finalContext = (specificContext && specificContext.trim().length > 0) 
                           ? specificContext 
                           : (globalContext || "");

      // Load Keys
      const apiKeys = {
        googleApiKey: localStorage.getItem('gemini_api_key') || process.env.API_KEY || '',
        openaiApiKey: localStorage.getItem('openai_api_key') || '',
        anthropicApiKey: localStorage.getItem('kb_anthropic_api_key') || '',
        xaiApiKey: localStorage.getItem('kb_xai_api_key') || ''
      };
      
      const result = await universalGenerateScript({
        provider: selectedProvider,
        model: selectedModelId,
        input: inputText,
        template: selectedTemplate,
        language: selectedLanguage,
        duration: selectedDuration,
        mode: inputMode,
        perspective: selectedPerspective,
        customMinutes: customMinutes,
        persona: selectedPersona,
        personalContext: finalContext,
        learnedExamples: learnedExamples, // Nạp bài cũ vào để AI bắt chước
        apiKeys: apiKeys
      });
      
      setGeneratedContent(result);
      await saveToHistory(result); 
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
    setIsLoginOpen(false);
    loadCloudHistory(account.id);
  };

  if (isFirebaseConfigOpen) {
      return (
          <FirebaseConfigModal 
              isOpen={true} 
              onClose={() => {
                  if (isConfigured) setIsFirebaseConfigOpen(false);
              }} 
          />
      );
  }

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin mr-3" />
        Đang tải dữ liệu...
      </div>
    );
  }

  const isAdmin = currentAccount?.role === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {currentAccount ? (
        <>
          <Header 
            onOpenSettings={() => setIsSettingsOpen(true)} 
            onOpenHistory={() => setIsHistoryOpen(true)}
            activeTab="new"
            onOpenAdminPanel={() => setIsAdminOpen(true)}
            currentAccount={currentAccount}
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
                templates={templates}
                selectedTemplateId={selectedTemplate.id}
                onSelect={setSelectedTemplate}
              />
            </section>

            <section>
              <ConfigSection 
                languages={languages}
                durations={durations}
                perspectives={perspectives}
                selectedTemplateId={selectedTemplate.id}
                selectedLanguage={selectedLanguage.id}
                onSelectLanguage={setSelectedLanguage}
                selectedDuration={selectedDuration.id}
                onSelectDuration={setSelectedDuration}
                customMinutes={customMinutes}
                setCustomMinutes={setCustomMinutes}
                selectedPerspective={selectedPerspective.id}
                onSelectPerspective={setSelectedPerspective}
                selectedPersona={selectedPersona}
                onSelectPersona={setSelectedPersona}
                // AI Props
                selectedProvider={selectedProvider}
                onSelectProvider={setSelectedProvider}
                selectedModelId={selectedModelId}
                onSelectModelId={setSelectedModelId}
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
                      <span className={`font-bold ${
                        selectedProvider === 'openai' ? 'text-green-600' : 
                        selectedProvider === 'anthropic' ? 'text-orange-600' :
                        selectedProvider === 'xai' ? 'text-slate-900' :
                        'text-blue-600'
                      }`}>
                        {AI_MODELS.find(m => m.id === selectedModelId)?.name || selectedModelId}
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
            onOpenFirebaseConfig={() => {
                setIsFirebaseConfigOpen(true);
                setIsSettingsOpen(false);
            }}
            onOpenAdminAuth={() => {
               setIsSettingsOpen(false);
               setIsAdminAuthOpen(true);
            }}
            currentAccount={currentAccount}
            selectedTemplate={selectedTemplate}
          />

          <AdminAuthModal 
            isOpen={isAdminAuthOpen}
            onClose={() => setIsAdminAuthOpen(false)}
            onSuccess={async () => {
              if (currentAccount) {
                 const success = await upgradeToAdmin(currentAccount.id);
                 if (success) {
                   alert("Đã nâng cấp quyền Admin thành công! Vui lòng tải lại trang.");
                   window.location.reload();
                 } else {
                   alert("Có lỗi xảy ra khi nâng cấp quyền.");
                 }
              }
            }}
          />

          <HistoryModal
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            history={history}
            onDelete={deleteHistoryItem}
            onSelect={handleOpenHistoryItem}
            onClearAll={clearAllHistory}
          />

          {/* Security Guard: Only render AdminPanel if role is truly admin */}
          {isAdmin && (
              <AdminPanel 
                isOpen={isAdminOpen}
                onClose={() => setIsAdminOpen(false)}
              />
          )}
        </>
      ) : (
        <div className="relative min-h-screen bg-slate-900">
          <LoginModal 
            isOpen={isLoginOpen && !isSignupOpen && !isFirebaseConfigOpen}
            onClose={() => {}} 
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
              setIsLoginOpen(true); 
            }}
            onSuccess={() => {
              setIsSignupOpen(false);
              setIsLoginOpen(true);
              alert('Đăng ký thành công! Vui lòng đợi Quản trị viên kích hoạt.');
            }}
          />
        </div>
      )}

      {isFirebaseConfigOpen && (
          <FirebaseConfigModal 
              isOpen={true}
              onClose={() => setIsFirebaseConfigOpen(false)}
          />
      )}
    </div>
  );
}

export default App;
