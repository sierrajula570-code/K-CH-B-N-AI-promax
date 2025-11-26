
import { db } from './firebase';
import { collection, getDocs, setDoc, doc, writeBatch } from 'firebase/firestore';
import { TEMPLATES, LANGUAGES, DURATIONS, PERSPECTIVES } from '../constants';
import { ScriptTemplate, LanguageOption, DurationOption, PerspectiveOption } from '../types';

export interface AppConfigData {
  templates: ScriptTemplate[];
  languages: LanguageOption[];
  durations: DurationOption[];
  perspectives: PerspectiveOption[];
}

const COLLECTIONS = {
  TEMPLATES: 'config_templates',
  LANGUAGES: 'config_languages',
  DURATIONS: 'config_durations',
  PERSPECTIVES: 'config_perspectives'
};

// Hàm này sẽ kiểm tra xem DB có dữ liệu chưa. 
// Nếu chưa (hoặc bị ép buộc), nó sẽ đẩy dữ liệu từ constants.tsx lên Cloud.
export const seedDatabase = async (force: boolean = false): Promise<boolean> => {
  try {
    const batch = writeBatch(db);

    // 1. Templates
    if (force) {
      console.log("Seeding Templates...");
      TEMPLATES.forEach(t => {
        const ref = doc(db, COLLECTIONS.TEMPLATES, t.id);
        batch.set(ref, t);
      });
    }

    // 2. Languages
    if (force) {
        LANGUAGES.forEach(l => {
            const ref = doc(db, COLLECTIONS.LANGUAGES, l.id);
            batch.set(ref, l);
        });
    }

    // 3. Durations
    if (force) {
        DURATIONS.forEach(d => {
            const ref = doc(db, COLLECTIONS.DURATIONS, d.id);
            batch.set(ref, d);
        });
    }

    // 4. Perspectives
    if (force) {
        PERSPECTIVES.forEach(p => {
            const ref = doc(db, COLLECTIONS.PERSPECTIVES, p.id);
            batch.set(ref, p);
        });
    }

    await batch.commit();
    return true;
  } catch (e) {
    console.error("Error seeding database:", e);
    return false;
  }
};

// Hàm tải toàn bộ cấu hình từ Firestore
export const fetchAppConfig = async (): Promise<AppConfigData> => {
  try {
    const [tempSnap, langSnap, durSnap, perspSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.TEMPLATES)),
      getDocs(collection(db, COLLECTIONS.LANGUAGES)),
      getDocs(collection(db, COLLECTIONS.DURATIONS)),
      getDocs(collection(db, COLLECTIONS.PERSPECTIVES))
    ]);

    // Helper to extract data or fallback to constants if empty
    const extract = <T>(snap: any, fallback: T[]): T[] => {
      if (snap.empty) return fallback;
      const data: T[] = [];
      snap.forEach((doc: any) => data.push(doc.data() as T));
      return data;
    };

    // Sort function for Templates to keep them in order (optional, requires an 'order' field or assume ID)
    // For now, we rely on the DB return order or fallback to constants logic
    const templates = extract<ScriptTemplate>(tempSnap, TEMPLATES);
    
    // Sort templates: Priority for hardcoded IDs to maintain order, others appended
    const sortedTemplates = templates.sort((a, b) => {
        const indexA = TEMPLATES.findIndex(t => t.id === a.id);
        const indexB = TEMPLATES.findIndex(t => t.id === b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    return {
      templates: sortedTemplates,
      languages: extract<LanguageOption>(langSnap, LANGUAGES),
      durations: extract<DurationOption>(durSnap, DURATIONS),
      perspectives: extract<PerspectiveOption>(perspSnap, PERSPECTIVES),
    };

  } catch (e) {
    console.error("Error fetching config from Cloud, using local constants:", e);
    return {
      templates: TEMPLATES,
      languages: LANGUAGES,
      durations: DURATIONS,
      perspectives: PERSPECTIVES
    };
  }
};
