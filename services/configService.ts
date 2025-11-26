
import { db } from './firebase';
import { collection, getDocs, setDoc, doc, writeBatch } from 'firebase/firestore';
import { TEMPLATES, LANGUAGES, DURATIONS, PERSPECTIVES } from '../constants';
import { ScriptTemplate, LanguageOption, DurationOption, PerspectiveOption } from '../types';
import { checkGlobalQuota, setGlobalQuotaExceeded } from './accountService';

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

const CACHE_KEY = 'app_config_cache';
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export const seedDatabase = async (force: boolean = false): Promise<boolean> => {
  if (checkGlobalQuota()) return false;
  try {
    const batch = writeBatch(db);

    if (force) {
      console.log("Seeding Templates...");
      TEMPLATES.forEach(t => {
        const ref = doc(db, COLLECTIONS.TEMPLATES, t.id);
        batch.set(ref, t);
      });
      LANGUAGES.forEach(l => {
        const ref = doc(db, COLLECTIONS.LANGUAGES, l.id);
        batch.set(ref, l);
      });
      DURATIONS.forEach(d => {
        const ref = doc(db, COLLECTIONS.DURATIONS, d.id);
        batch.set(ref, d);
      });
      PERSPECTIVES.forEach(p => {
        const ref = doc(db, COLLECTIONS.PERSPECTIVES, p.id);
        batch.set(ref, p);
      });
    }

    await batch.commit();
    localStorage.removeItem(CACHE_KEY);
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    console.error("Error seeding database:", e);
    return false;
  }
};

export const fetchAppConfig = async (): Promise<AppConfigData> => {
  // 1. Try Loading from Cache first
  try {
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
          const parsed = JSON.parse(cachedData);
          if (Date.now() - parsed.timestamp < CACHE_EXPIRY_MS) {
              console.log("Using Cached App Config (Local)");
              return parsed.data;
          }
      }
  } catch (e) {
      console.warn("Cache parsing error", e);
  }

  // 2. Global Quota Check
  if (checkGlobalQuota()) {
      console.warn("🚫 Global Quota Lock Active. Using Default Config.");
      return { templates: TEMPLATES, languages: LANGUAGES, durations: DURATIONS, perspectives: PERSPECTIVES };
  }

  // 3. Fetch from Firestore
  try {
    const [tempSnap, langSnap, durSnap, perspSnap] = await Promise.all([
      getDocs(collection(db, COLLECTIONS.TEMPLATES)),
      getDocs(collection(db, COLLECTIONS.LANGUAGES)),
      getDocs(collection(db, COLLECTIONS.DURATIONS)),
      getDocs(collection(db, COLLECTIONS.PERSPECTIVES))
    ]);

    const extract = <T>(snap: any, fallback: T[]): T[] => {
      if (snap.empty) return fallback;
      const data: T[] = [];
      snap.forEach((doc: any) => data.push(doc.data() as T));
      return data;
    };

    const templates = extract<ScriptTemplate>(tempSnap, TEMPLATES);
    const sortedTemplates = templates.sort((a, b) => {
        const indexA = TEMPLATES.findIndex(t => t.id === a.id);
        const indexB = TEMPLATES.findIndex(t => t.id === b.id);
        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });

    const result = {
      templates: sortedTemplates,
      languages: extract<LanguageOption>(langSnap, LANGUAGES),
      durations: extract<DurationOption>(durSnap, DURATIONS),
      perspectives: extract<PerspectiveOption>(perspSnap, PERSPECTIVES),
    };

    // Save to Cache
    localStorage.setItem(CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: result
    }));

    return result;

  } catch (e: any) {
    console.error("Error fetching config from Cloud:", e);
    
    // 3. FALLBACK
    const fallbackResult = {
      templates: TEMPLATES,
      languages: LANGUAGES,
      durations: DURATIONS,
      perspectives: PERSPECTIVES
    };

    if (e.code === 'resource-exhausted' || e.code === 'unavailable') {
        setGlobalQuotaExceeded();
        
        // Cache defaults as "fresh" to prevent retries
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: fallbackResult
        }));
    }

    return fallbackResult;
  }
};
