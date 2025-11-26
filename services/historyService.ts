
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc,
  query,
  orderBy,
  writeBatch,
  addDoc,
  where
} from 'firebase/firestore';
import { HistoryItem, GlobalKnowledgeItem } from '../types';
import { checkGlobalQuota, setGlobalQuotaExceeded } from './accountService'; 

const USERS_COLLECTION = 'users';
const HISTORY_SUBCOLLECTION = 'history';
const GLOBAL_KNOWLEDGE_COLLECTION = 'global_training_data'; 

export const saveHistoryItem = async (uid: string, item: HistoryItem): Promise<boolean> => {
  if (checkGlobalQuota()) return false; 

  try {
    const docRef = doc(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION, item.id);
    await setDoc(docRef, item);
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    console.error("Save History Error:", e);
    return false;
  }
};

export const getHistory = async (uid: string): Promise<HistoryItem[]> => {
  if (checkGlobalQuota()) return [];

  try {
    const historyRef = collection(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION);
    // Sort client side usually if index missing, but here we try basic query
    const q = query(historyRef); // Remove orderBy if it causes issues, but quota is main concern
    const querySnapshot = await getDocs(q);
    
    const items: HistoryItem[] = [];
    querySnapshot.forEach((doc) => {
      items.push(doc.data() as HistoryItem);
    });
    // Sort client side
    items.sort((a, b) => b.timestamp - a.timestamp);
    
    return items;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    console.error("Get History Error:", e);
    return [];
  }
};

export const getRecentHistoryByTemplate = async (uid: string, templateId: string): Promise<string[]> => {
  if (checkGlobalQuota()) return [];

  try {
    const historyRef = collection(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION);
    const q = query(historyRef, where('templateId', '==', templateId));
    
    const querySnapshot = await getDocs(q);
    const items: HistoryItem[] = [];
    
    querySnapshot.forEach((doc) => {
      items.push(doc.data() as HistoryItem);
    });

    items.sort((a, b) => b.timestamp - a.timestamp);

    const examples: string[] = [];
    for (const item of items.slice(0, 2)) {
      if (item.content && item.content.length > 200) {
        examples.push(item.content.substring(0, 1500));
      }
    }
    
    return examples;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return [];
  }
};

export const deleteHistoryItem = async (uid: string, itemId: string): Promise<boolean> => {
  if (checkGlobalQuota()) return false;
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION, itemId));
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return false;
  }
};

export const clearHistory = async (uid: string): Promise<boolean> => {
  if (checkGlobalQuota()) return false;
  try {
    const historyRef = collection(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION);
    const snapshot = await getDocs(historyRef);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    return false;
  }
};

export const saveToGlobalKnowledge = async (
    input: string, 
    output: string, 
    templateId: string, 
    languageId: string
): Promise<void> => {
    if (checkGlobalQuota()) return;

    try {
        const item: GlobalKnowledgeItem = {
            id: Date.now().toString(),
            input: input,
            output: output,
            templateId: templateId,
            languageId: languageId,
            timestamp: Date.now()
        };
        
        await addDoc(collection(db, GLOBAL_KNOWLEDGE_COLLECTION), item);
    } catch (e: any) {
        if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    }
};
