
import { db } from './firebase';
import { collection, getDocs, doc, writeBatch } from 'firebase/firestore';
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
    return true;
  } catch (e: any) {
    if (e.code === 'resource-exhausted') setGlobalQuotaExceeded();
    console.error("Error seeding database:", e);
    return false;
  }
};

export const fetchAppConfig = async (): Promise<AppConfigData> => {
  // STRATEGY CHANGE: ALWAYS PREFER LOCAL CONSTANTS TO SAVE QUOTA
  // Only fetch from Firestore if absolutely necessary or if Admin triggers it.
  // For standard users, the hardcoded constants are faster and free.
  
  const defaultConfig = {
      templates: TEMPLATES,
      languages: LANGUAGES,
      durations: DURATIONS,
      perspectives: PERSPECTIVES
  };

  // If Quota is exceeded, definitely return default
  if (checkGlobalQuota()) {
      return defaultConfig;
  }

  // OPTIONAL: You can uncomment the code below if you really need dynamic updates from Cloud.
  // But for a free tier app, relying on code updates is safer.
  
  /* 
  try {
    // ... Firestore fetching logic ...
  } catch (e) { ... }
  */

  // Defaulting to "Offline First" mode
  return defaultConfig;
};
