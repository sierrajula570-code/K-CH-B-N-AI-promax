
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- HARDCODED CONFIGURATION (OPERATES IN BACKGROUND) ---
const SUPABASE_URL = 'https://icydfgdrkzluyplagvbz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljeWRmZ2Rya3psdXlwbGFndmJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyMjI0MzIsImV4cCI6MjA3OTc5ODQzMn0.eXEXlcmUmrcNA1QBXwZyJDzeTT2MtcySreCHqAe7FYI';

export const getSupabaseConfig = () => {
  return {
    url: SUPABASE_URL,
    key: SUPABASE_ANON_KEY
  };
};

// No longer needed to save to local storage, but kept for compatibility if needed elsewhere
export const saveSupabaseConfig = (url: string, key: string) => {
  // No-op since we use hardcoded values
  console.log("Supabase config is managed internally.");
};

export const isSupabaseConfigured = (): boolean => {
  return !!SUPABASE_URL && !!SUPABASE_ANON_KEY;
};

let supabaseInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  try {
    supabaseInstance = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    return supabaseInstance;
  } catch (e) {
    console.error("Failed to initialize Supabase:", e);
    return null;
  }
};

// --- API KEY MANAGEMENT ---

export interface UserApiKeys {
    gemini?: string;
    openai?: string;
    anthropic?: string;
    xai?: string;
}

export const saveUserApiKeys = async (userId: string, keys: UserApiKeys): Promise<boolean> => {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    try {
        const { error } = await supabase.from('user_settings').upsert({
            user_id: userId,
            gemini_key: keys.gemini || null,
            openai_key: keys.openai || null,
            anthropic_key: keys.anthropic || null,
            xai_key: keys.xai || null,
            updated_at: Date.now()
        }, { onConflict: 'user_id' });

        if (error) {
            console.error("Supabase Save Keys Error:", error);
            return false;
        }
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
};

export const getUserApiKeys = async (userId: string): Promise<UserApiKeys | null> => {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
        const { data, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (error || !data) return null;

        return {
            gemini: data.gemini_key,
            openai: data.openai_key,
            anthropic: data.anthropic_key,
            xai: data.xai_key
        };
    } catch (e) {
        return null;
    }
};
