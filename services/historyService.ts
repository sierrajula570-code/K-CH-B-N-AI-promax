
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  query,
  writeBatch,
  addDoc,
  where
} from 'firebase/firestore';
import { HistoryItem, GlobalKnowledgeItem } from '../types';
import { checkGlobalQuota, setGlobalQuotaExceeded } from './accountService'; 
import { getSupabaseClient, isSupabaseConfigured } from './supabase';

const USERS_COLLECTION = 'users';
const HISTORY_SUBCOLLECTION = 'history';
const GLOBAL_KNOWLEDGE_COLLECTION = 'global_training_data'; 
const LOCAL_HISTORY_KEY = 'offline_history_backup';

// --- LOCAL STORAGE HELPERS ---
const getLocalHistory = (): HistoryItem[] => {
    try {
        const stored = localStorage.getItem(LOCAL_HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch { return []; }
};

const saveLocalHistory = (items: HistoryItem[]) => {
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(items));
};

export const saveHistoryItem = async (uid: string, item: HistoryItem): Promise<boolean> => {
  // 1. ALWAYS SAVE LOCAL (Backup)
  const localItems = getLocalHistory();
  const updatedLocal = [item, ...localItems].slice(0, 50); 
  saveLocalHistory(updatedLocal);

  // 2. TRY SUPABASE (Priority 1)
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    if (supabase) {
        try {
            // Need a 'history' table in Supabase
            // SQL: create table history (id text primary key, user_id text, template_id text, template_title text, input_preview text, content text, timestamp bigint, json_data jsonb);
            const { error } = await supabase.from('history').insert({
                id: item.id,
                user_id: uid,
                template_id: item.templateId,
                template_title: item.templateTitle,
                input_preview: item.inputPreview,
                content: item.content,
                timestamp: item.timestamp
            });
            if (!error) return true;
            console.error("Supabase Save Error:", error);
        } catch (e) { console.error(e); }
    }
  }

  // 3. TRY FIREBASE (Priority 2)
  if (checkGlobalQuota()) return true; 

  try {
    const docRef = doc(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION, item.id);
    await setDoc(docRef, item);
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') {
        setGlobalQuotaExceeded();
        return true; 
    }
    console.error("Firebase Save Error:", e);
    return false;
  }
};

export const getHistory = async (uid: string): Promise<HistoryItem[]> => {
  const localItems = getLocalHistory();

  // 1. TRY SUPABASE
  if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) {
          const { data, error } = await supabase
            .from('history')
            .select('*')
            .eq('user_id', uid)
            .order('timestamp', { ascending: false });
            
          if (!error && data) {
              // Map snake_case to camelCase if needed, or stick to interface
              const mapped: HistoryItem[] = data.map((d: any) => ({
                  id: d.id,
                  userId: d.user_id,
                  timestamp: d.timestamp,
                  templateId: d.template_id,
                  templateTitle: d.template_title,
                  inputPreview: d.input_preview,
                  content: d.content
              }));
              return mapped;
          }
      }
  }

  // 2. CHECK QUOTA
  if (checkGlobalQuota()) {
      return localItems;
  }

  // 3. TRY FIREBASE
  try {
    const historyRef = collection(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION);
    const q = query(historyRef);
    const querySnapshot = await getDocs(q);
    
    const cloudItems: HistoryItem[] = [];
    querySnapshot.forEach((doc) => {
      cloudItems.push(doc.data() as HistoryItem);
    });
    
    cloudItems.sort((a, b) => b.timestamp - a.timestamp);
    
    if (cloudItems.length === 0 && localItems.length > 0) {
        return localItems;
    }

    return cloudItems;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') {
        setGlobalQuotaExceeded();
        return localItems;
    }
    console.error("Firebase Get Error:", e);
    return localItems;
  }
};

export const getRecentHistoryByTemplate = async (uid: string, templateId: string): Promise<string[]> => {
    // Similar Logic: Try Supabase -> Firebase -> Fail
    if (isSupabaseConfigured()) {
        const supabase = getSupabaseClient();
        if (supabase) {
            const { data } = await supabase
                .from('history')
                .select('content')
                .eq('user_id', uid)
                .eq('template_id', templateId)
                .order('timestamp', { ascending: false })
                .limit(2);
            if (data) return data.map((d:any) => d.content.substring(0, 1500));
        }
    }

    if (checkGlobalQuota()) return [];

    try {
        const historyRef = collection(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION);
        const q = query(historyRef, where('templateId', '==', templateId));
        const querySnapshot = await getDocs(q);
        const items: string[] = [];
        querySnapshot.forEach((doc) => {
             const d = doc.data();
             if(d.content) items.push(d.content.substring(0, 1500));
        });
        return items.slice(0, 2);
    } catch(e) { return []; }
};

export const deleteHistoryItem = async (uid: string, itemId: string): Promise<boolean> => {
  // Delete Local
  const localItems = getLocalHistory();
  saveLocalHistory(localItems.filter(i => i.id !== itemId));

  // Delete Supabase
  if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) await supabase.from('history').delete().eq('id', itemId);
  }

  if (checkGlobalQuota()) return true;

  try {
    await deleteDoc(doc(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION, itemId));
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return true;
  }
};

export const clearHistory = async (uid: string): Promise<boolean> => {
  saveLocalHistory([]); 

  if (isSupabaseConfigured()) {
      const supabase = getSupabaseClient();
      if (supabase) await supabase.from('history').delete().eq('user_id', uid);
  }

  if (checkGlobalQuota()) return true;
  
  try {
    const historyRef = collection(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION);
    const snapshot = await getDocs(historyRef);
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return true;
  }
};

export const saveToGlobalKnowledge = async (input: string, output: string, templateId: string, languageId: string) => {
    // Optional implementation for Supabase Knowledge base
};
