
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
  where,
  limit
} from 'firebase/firestore';
import { HistoryItem, GlobalKnowledgeItem } from '../types';

const USERS_COLLECTION = 'users';
const HISTORY_SUBCOLLECTION = 'history';
const GLOBAL_KNOWLEDGE_COLLECTION = 'global_training_data'; // Kho dữ liệu chung không thể xóa

// --- USER PRIVATE HISTORY ---

export const saveHistoryItem = async (uid: string, item: HistoryItem): Promise<boolean> => {
  try {
    const docRef = doc(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION, item.id);
    await setDoc(docRef, item);
    return true;
  } catch (e) {
    console.error("Save History Error:", e);
    return false;
  }
};

export const getHistory = async (uid: string): Promise<HistoryItem[]> => {
  try {
    const historyRef = collection(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION);
    const q = query(historyRef, orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const items: HistoryItem[] = [];
    querySnapshot.forEach((doc) => {
      items.push(doc.data() as HistoryItem);
    });
    return items;
  } catch (e) {
    console.error("Get History Error:", e);
    return [];
  }
};

// --- NEW FUNCTION: AI AUTO-LEARNING RETRIEVAL ---
// Lấy 2 bài viết gần nhất CÙNG MẪU KỊCH BẢN để AI học phong cách
export const getRecentHistoryByTemplate = async (uid: string, templateId: string): Promise<string[]> => {
  try {
    const historyRef = collection(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION);
    // Lấy 2 bài gần nhất của template này
    const q = query(
      historyRef, 
      where('templateId', '==', templateId),
      orderBy('timestamp', 'desc'),
      limit(2)
    );
    
    const querySnapshot = await getDocs(q);
    const examples: string[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as HistoryItem;
      if (data.content && data.content.length > 200) {
        // Chỉ lấy 1500 ký tự đầu tiên để tiết kiệm token cho AI, đủ để học Hook và Intro
        examples.push(data.content.substring(0, 1500));
      }
    });
    
    return examples;
  } catch (e) {
    console.warn("AI Learning Fetch Error (Firestore Index might be missing yet):", e);
    return [];
  }
};

export const deleteHistoryItem = async (uid: string, itemId: string): Promise<boolean> => {
  try {
    await deleteDoc(doc(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION, itemId));
    return true;
  } catch (e) {
    console.error("Delete History Error:", e);
    return false;
  }
};

export const clearHistory = async (uid: string): Promise<boolean> => {
  try {
    const historyRef = collection(db, USERS_COLLECTION, uid, HISTORY_SUBCOLLECTION);
    const snapshot = await getDocs(historyRef);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    return true;
  } catch (e) {
    console.error("Clear History Error:", e);
    return false;
  }
};

// --- GLOBAL KNOWLEDGE BASE (IMMUTABLE WAREHOUSE) ---

export const saveToGlobalKnowledge = async (
    input: string, 
    output: string, 
    templateId: string, 
    languageId: string
): Promise<void> => {
    try {
        const item: GlobalKnowledgeItem = {
            id: Date.now().toString(),
            input: input,
            output: output,
            templateId: templateId,
            languageId: languageId,
            timestamp: Date.now()
        };
        
        // Lưu vào collection chung. Collection này không có hàm delete được expose cho Client.
        // Chỉ Admin truy cập trực tiếp Firestore mới xóa được.
        await addDoc(collection(db, GLOBAL_KNOWLEDGE_COLLECTION), item);
        console.log(">> Data saved to Global Knowledge Warehouse.");
    } catch (e) {
        // Silent fail: Không làm phiền người dùng nếu việc lưu training data thất bại
        console.warn("Failed to save to Global Knowledge:", e);
    }
};
