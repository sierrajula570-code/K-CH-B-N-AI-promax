
import React, { useState, useEffect, useRef } from 'react';
import { TEMPLATES, LANGUAGES, DURATIONS, PERSPECTIVES, AI_MODELS } from './constants'; 
import { ScriptTemplate, LanguageOption, DurationOption, PerspectiveOption, InputMode, HistoryItem, AIProvider, ScriptAnalysis } from './types';
import Header from './components/Header';
import InputSection from './components/InputSection';
import TemplateSelector from './components/TemplateSelector';
import ConfigSection from './components/ConfigSection';
import ResultModal from './components/ResultModal';
import ResultSection from './components/ResultSection';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import AdminPanel from './components/AdminPanel';
import LoginModal from './components/LoginModal';
import SignupModal from './components/SignupModal';
import FirebaseConfigModal from './components/FirebaseConfigModal'; 
import AdminAuthModal from './components/AdminAuthModal';
import AnalysisModal from './components/AnalysisModal';
import { universalGenerateScript, calculateTargetLength, analyzeScriptRequest } from './services/universalAiService';
import { 
  getUserProfile,
  Account,
  logout,
  upgradeToAdmin,
  claimSession,
  listenToAccountChanges,
  isQuotaExceeded
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
import { onAuthStateChanged, Unsubscribe } from 'firebase/auth';
import { Zap, Loader2, ScanSearch, ArrowDown, AlertTriangle, CloudOff } from 'lucide-react';

function App() {
  // Auth State
  const [currentAccount, setCurrentAccount] = useState<Account | null>(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Configuration State
  const [isFirebaseConfigOpen, setIsFirebaseConfigOpen] = useState(!isConfigured); 
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
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
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<ScriptAnalysis | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  // Load App Config on Mount
  useEffect(() => {
    const loadConfig = async () => {
      const config = await fetchAppConfig();
      if (config.templates.length > 0) setTemplates(config.templates);
      if (config.languages.length > 0) setLanguages(config.languages);
      if (config.durations.length > 0) setDurations(config.durations);
      if (config.perspectives.length > 0) setPerspectives(config.perspectives);
      
      if (config.templates.length > 0 && selectedTemplate.id === 'general') {
          // Keep selection logic roughly safe
      }
    };
    loadConfig();
  }, []);

  // Auth Listener
  useEffect(() => {
    let unsubscribeUser: Unsubscribe | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setAuthError(null);
      if (user) {
        try {
            const profile = await getUserProfile(user.uid);
            
            if (profile) {
               setCurrentAccount(profile);
               
               // Listen for realtime changes
               unsubscribeUser = listenToAccountChanges(user.uid, (updatedProfile) => {
                  if (!updatedProfile) {
                     // Account deleted
                  } else {
                     setCurrentAccount(updatedProfile);
                     claimSession(user.uid);
                  }
               });
               
               // Load history
               const historyData = await getHistory(user.uid);
               setHistory(historyData);
            } else {
               // Profile is null. Either Quota or DB Error.
               console.warn("Authentication successful, but Profile Load failed (Offline/Quota Mode).");
               setAuthError("Hệ thống Database đang bảo trì (Quota). Bạn vẫn có thể dùng AI bình thường, nhưng Lịch sử sẽ không được lưu.");
               setCurrentAccount(null); // Treat as guest visually
            }
        } catch (e) {
            console.error("Auth Init Error:", e);
            setCurrentAccount(null);
        }
      } else {
        setCurrentAccount(null);
        setHistory([]);
        if (unsubscribeUser) unsubscribeUser();
      }
      setIsCheckingAuth(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUser) unsubscribeUser();
    };
  }, []);

  const handleAnalyze = async () => {
    // Allow guest mode if quota exceeded, as long as API key exists
    const hasApiKey = localStorage.getItem('gemini_api_key') || process.env.API_KEY;
    if (!currentAccount && !hasApiKey && !authError) {
        setIsLoginOpen(true);
        return;
    }
    
    if (!inputText.trim()) {
        alert("Vui lòng nhập nội dung hoặc ý tưởng!");
        return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
        const apiKeys = {
            googleApiKey: localStorage.getItem('gemini_api_key') || process.env.API_KEY || undefined,
            openaiApiKey: localStorage.getItem('openai_api_key') || undefined,
            anthropicApiKey: localStorage.getItem('kb_anthropic_api_key') || undefined,
            xaiApiKey: localStorage.getItem('kb_xai_api_key') || undefined
        };

        const result = await analyzeScriptRequest({
            provider: selectedProvider,
            model: selectedModelId,
            input: inputText,
            template: selectedTemplate,
            language: selectedLanguage,
            duration: selectedDuration,
            mode: inputMode,
            perspective: selectedPerspective,
            apiKeys
        });

        setAnalysisResult(result);
        setIsAnalysisModalOpen(true);

    } catch (e: any) {
        alert("Lỗi khi phân tích: " + e.message);
    } finally {
        setIsAnalyzing(false);
    }
  };

  const handleGenerateFromAnalysis = async (approvedAnalysis: ScriptAnalysis) => {
    setIsAnalysisModalOpen(false);
    setIsLoading(true);
    setGeneratedContent(null);

    let learnedExamples: string[] = [];
    if (currentAccount && !isQuotaExceeded) {
       learnedExamples = await getRecentHistoryByTemplate(currentAccount.id, selectedTemplate.id);
    }

    const apiKeys = {
        googleApiKey: localStorage.getItem('gemini_api_key') || process.env.API_KEY || undefined,
        openaiApiKey: localStorage.getItem('openai_api_key') || undefined,
        anthropicApiKey: localStorage.getItem('kb_anthropic_api_key') || undefined,
        xaiApiKey: localStorage.getItem('kb_xai_api_key') || undefined
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
        customMinutes,
        persona: selectedPersona,
        personalContext: currentAccount?.personalContext,
        learnedExamples,
        approvedAnalysis, 
        apiKeys
    });

    setGeneratedContent(result);

    // Save History if possible
    if (currentAccount && !result.startsWith('⚠️')) {
        const newItem: HistoryItem = {
            id: Date.now().toString(),
            userId: currentAccount.id,
            timestamp: Date.now(),
            templateId: selectedTemplate.id,
            templateTitle: selectedTemplate.title,
            inputPreview: inputText.substring(0, 50) + '...',
            content: result
        };
        
        const saved = await saveToFirestore(currentAccount.id, newItem);
        if (saved) {
            setHistory(prev => [newItem, ...prev]);
        }

        await saveToGlobalKnowledge(inputText, result, selectedTemplate.id, selectedLanguage.id);
    }
    
    setIsLoading(false);
  };

  const handleDeleteHistory = async (id: string) => {
    if (!currentAccount) return;
    if (confirm("Bạn có chắc chắn muốn xóa?")) {
       await deleteFromFirestore(currentAccount.id, id);
       setHistory(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleClearHistory = async () => {
    if (!currentAccount) return;
    if (confirm("Xóa toàn bộ lịch sử? Hành động này không thể hoàn tác.")) {
        await clearFirestoreHistory(currentAccount.id);
        setHistory([]);
    }
  };

  const targetLength = calculateTargetLength(selectedLanguage.id, selectedDuration.id, customMinutes);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-20">
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAdminPanel={() => setIsAdminOpen(true)}
        currentAccount={currentAccount}
      />
      
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-10">
        
        {/* Auth Warning or Quota Warning */}
        {authError && (
             <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                <CloudOff className="w-5 h-5 text-amber-600" />
                <div>
                   <p className="font-bold text-sm">Chế độ Offline / Giới hạn</p>
                   <p className="text-xs">{authError}</p>
                </div>
             </div>
        )}

        {isConfigured && !isCheckingAuth && !currentAccount && !authError && (
           <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-4 rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                 <div className="bg-white/20 p-2 rounded-full backdrop-blur-sm">
                    <Zap className="w-5 h-5 text-yellow-300 fill-yellow-300" />
                 </div>
                 <div>
                    <h3 className="font-bold text-lg">Chào mừng bạn đến với Kichban AI Pro Max!</h3>
                    <p className="text-white/90 text-sm">Đăng nhập để lưu lịch sử, mở khóa tính năng tự học và quản lý Prompt cá nhân.</p>
                 </div>
              </div>
              <button 
                onClick={() => setIsLoginOpen(true)}
                className="bg-white text-indigo-600 px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-50 transition shadow-md active:scale-95 whitespace-nowrap"
              >
                Đăng nhập ngay
              </button>
           </div>
        )}

        {/* 1. INPUT SECTION (TOP & BIG) */}
        <section className="animate-in fade-in slide-in-from-top-4 duration-500">
           <InputSection 
              value={inputText}
              onChange={setInputText}
              mode={inputMode}
              setMode={setInputMode}
            />
        </section>

        {/* 2. TEMPLATE SELECTOR */}
        <section className="animate-in fade-in slide-in-from-top-8 duration-500 delay-100">
            <TemplateSelector 
              templates={templates}
              selectedTemplateId={selectedTemplate.id}
              onSelect={setSelectedTemplate}
            />
        </section>

        {/* 3. CONFIG SECTION */}
        <section className="animate-in fade-in slide-in-from-top-8 duration-500 delay-200">
            <ConfigSection 
              languages={languages}
              durations={durations}
              perspectives={perspectives}
              
              selectedTemplateId={selectedTemplate.id}
              selectedLanguage={selectedLanguage.id}
              onSelectLanguage={(l) => {
                  const lang = languages.find(la => la.id === l.id) || LANGUAGES[0];
                  setSelectedLanguage(lang);
              }}
              selectedDuration={selectedDuration.id}
              onSelectDuration={(d) => {
                  const dur = durations.find(du => du.id === d.id) || DURATIONS[0];
                  setSelectedDuration(dur);
              }}
              customMinutes={customMinutes}
              setCustomMinutes={setCustomMinutes}
              selectedPerspective={selectedPerspective.id}
              onSelectPerspective={(p) => {
                  const persp = perspectives.find(pe => pe.id === p.id) || PERSPECTIVES[0];
                  setSelectedPerspective(persp);
              }}
              selectedPersona={selectedPersona}
              onSelectPersona={setSelectedPersona}

              selectedProvider={selectedProvider}
              onSelectProvider={setSelectedProvider}
              selectedModelId={selectedModelId}
              onSelectModelId={setSelectedModelId}
            />
        </section>

        {/* 4. ACTION BUTTON */}
        <div className="flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-300 delay-300">
            <div className="flex flex-col items-center animate-bounce text-slate-400">
                <ArrowDown className="w-5 h-5" />
            </div>
            <button
                onClick={handleAnalyze} 
                disabled={isLoading || isAnalyzing}
                className={`
                w-full max-w-md py-5 rounded-2xl font-extrabold text-xl text-white shadow-2xl shadow-primary-500/40 transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3
                ${isLoading || isAnalyzing 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 hover:shadow-primary-500/60 ring-4 ring-primary-100'
                }
                `}
            >
                {isLoading ? (
                <>
                    <Loader2 className="w-7 h-7 animate-spin" />
                    <span>Đang viết kịch bản...</span>
                </>
                ) : isAnalyzing ? (
                <>
                    <ScanSearch className="w-7 h-7 animate-pulse" />
                    <span>Đang phân tích ý tưởng...</span>
                </>
                ) : (
                <>
                    <Zap className="w-7 h-7 fill-current" />
                    <span>PHÂN TÍCH & TẠO KỊCH BẢN</span>
                </>
                )}
            </button>
            <p className="text-xs text-slate-400 font-medium">
                * Hệ thống sẽ phân tích cấu trúc trước khi viết chi tiết.
            </p>
        </div>

        {/* 5. RESULT SECTION */}
        {generatedContent && (
             <div className="pt-8 border-t border-slate-200">
                <ResultSection content={generatedContent} />
             </div>
        )}

      </main>

      {/* MODALS */}
      <LoginModal 
        isOpen={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)} 
        onSuccess={(acc) => {
            setCurrentAccount(acc);
            setIsLoginOpen(false);
        }}
        onOpenSignup={() => {
            setIsLoginOpen(false);
            setIsSignupOpen(true);
        }}
      />

      <SignupModal
        isOpen={isSignupOpen}
        onClose={() => setIsSignupOpen(false)}
        onSuccess={() => {
            alert("Đăng ký thành công! Vui lòng chờ Admin duyệt.");
            setIsSignupOpen(false);
        }}
      />
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        onOpenFirebaseConfig={() => setIsFirebaseConfigOpen(true)}
        onOpenAdminAuth={() => setIsAdminAuthOpen(true)}
        currentAccount={currentAccount}
        selectedTemplate={selectedTemplate}
      />

      <ResultModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        content={generatedContent || ''}
        targetLength={{ min: targetLength.minChars, max: targetLength.maxChars, target: targetLength.targetChars }}
      />
      
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onDelete={handleDeleteHistory}
        onSelect={(content) => {
            setGeneratedContent(content);
            setIsModalOpen(true);
            setIsHistoryOpen(false);
        }}
        onClearAll={handleClearHistory}
      />
      
      <AdminPanel 
        isOpen={isAdminOpen} 
        onClose={() => setIsAdminOpen(false)} 
      />

      <AdminAuthModal 
        isOpen={isAdminAuthOpen}
        onClose={() => setIsAdminAuthOpen(false)}
        onSuccess={() => {
             if (currentAccount) upgradeToAdmin(currentAccount.id);
             alert("Đã mở khóa quyền Admin (Owner Mode)!");
             window.location.reload();
        }}
      />
      
      <FirebaseConfigModal 
        isOpen={isFirebaseConfigOpen}
        onClose={() => setIsFirebaseConfigOpen(false)}
      />

      {analysisResult && (
          <AnalysisModal 
            isOpen={isAnalysisModalOpen}
            onClose={() => setIsAnalysisModalOpen(false)}
            analysis={analysisResult}
            onConfirm={handleGenerateFromAnalysis}
          />
      )}

    </div>
  );
}

export default App;
