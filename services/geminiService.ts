
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ScriptTemplate, LanguageOption, DurationOption, InputMode, PerspectiveOption } from '../types';

const getAiClient = () => {
  let apiKey = '';
  if (typeof window !== 'undefined') {
    apiKey = localStorage.getItem('gemini_api_key') || '';
  }
  if (!apiKey && process.env.API_KEY) {
    apiKey = process.env.API_KEY;
  }
  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function generateWithRetry(
  ai: GoogleGenAI, 
  params: any, 
  retries = 3, 
  backoff = 5000
): Promise<GenerateContentResponse> {
  try {
    return await ai.models.generateContent(params);
  } catch (error: any) {
    const msg = (error.message || '').toLowerCase();
    const isQuotaError = msg.includes('429') || msg.includes('quota') || msg.includes('exhausted');
    const isServerError = msg.includes('503') || msg.includes('overloaded');

    if ((isQuotaError || isServerError) && retries > 0) {
      console.warn(`⚠️ Wait & Retry: ${backoff/1000}s...`);
      await delay(backoff);
      return generateWithRetry(ai, params, retries - 1, backoff * 2);
    }
    throw error;
  }
}

// SYNCED WITH UNIVERSAL AI SERVICE
export const calculateTargetLength = (langId: string, durationId: string, customMinutes?: number) => {
  let minutes = 3; 
  if (durationId === 'custom' && customMinutes && customMinutes > 0) {
    minutes = customMinutes;
  } else {
    switch (durationId) {
      case 'short': minutes = 3; break;
      case 'medium': minutes = 7; break;
      case 'long': minutes = 10; break;
      case 'very-long': minutes = 20; break;
      default: minutes = 3;
    }
  }

  // CJK Languages (Chinese, Japanese, Korean)
  const isCJK = ['jp', 'cn', 'kr', 'tw', 'zh'].includes(langId);
  
  let targetChars = 0;
  if (isCJK) {
    // RULE: 500 characters per minute for CJK (Increased from 333 to force verbosity)
    targetChars = Math.round(minutes * 500);
  } else {
    // RULE: 1000 characters = 1 minute (English/Vietnamese/etc)
    targetChars = Math.round(minutes * 1000); 
  }

  const minChars = Math.round(targetChars * 0.9); 
  const maxChars = Math.round(targetChars * 1.2); 

  return { minutes, targetChars, minChars, maxChars, isCJK };
};

export const summarizeScript = async (content: string): Promise<string> => {
    let ai;
    try {
        ai = getAiClient();
    } catch (e) {
        return "⚠️ Lỗi: Chưa có API Key để tóm tắt.";
    }

    const prompt = `
      TASK: Summarize the following script into a concise bullet-point list of key takeaways.
      OUTPUT LANGUAGE: DETECT LANGUAGE OF SCRIPT AND USE THE SAME.
      FORMAT:
      - Key Point 1
      - Key Point 2
      ...
      
      SCRIPT CONTENT:
      """
      ${content.substring(0, 25000)} 
      """
    `;

    try {
        const response = await generateWithRetry(ai, {
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: { temperature: 0.5 }
        });
        return response.text || "Không thể tạo tóm tắt.";
    } catch (e: any) {
        return `⚠️ Lỗi tóm tắt: ${e.message}`;
    }
};

export const generateScript = async (
  input: string,
  template: ScriptTemplate,
  language: LanguageOption,
  duration: DurationOption,
  mode: InputMode,
  perspective: PerspectiveOption,
  customMinutes?: number,
  persona: 'auto' | 'buffett' | 'munger' = 'auto',
  personalContext?: string 
): Promise<string> => {
  
  // Legacy Wrapper for direct Gemini Usage (Universal Service is preferred)
  return `⚠️ Vui lòng sử dụng hàm universalGenerateScript() trong App.tsx để có tính năng đầy đủ.`;
};
