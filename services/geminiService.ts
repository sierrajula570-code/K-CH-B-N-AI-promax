
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

// SYNCED WITH UNIVERSAL AI SERVICE (1000 chars/min)
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

  const isCJK = ['jp', 'cn', 'kr'].includes(langId);
  
  let targetChars = 0;
  if (isCJK) {
    targetChars = Math.round(minutes * 300);
  } else {
    targetChars = Math.round(minutes * 1000); 
  }

  const minChars = Math.round(targetChars * 0.95); 
  const maxChars = Math.round(targetChars * 1.05); 

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
  
  let ai;
  try {
    ai = getAiClient();
  } catch (e) {
    return `⚠️ CHƯA CẬP NHẬT API KEY\n\nXem hướng dẫn trong phần Cài đặt.`;
  }

  const config = calculateTargetLength(language.id, duration.id, customMinutes);
  
  // INCREASED CHUNK DURATION FOR CONSISTENCY
  const CHUNK_DURATION = 5; 
  const useChainedGeneration = config.minutes > 6;

  let languageRules = "";
  if (language.id === 'vi') {
    languageRules = `
      - VIETNAMESE SPECIFIC:
      - Read numbers as words (e.g., "2024" -> "hai nghìn không trăm hai mươi tư").
      - Use "VTV" style: Formal, clear, precise.
      - Translate any English input terms to Vietnamese unless they are proper nouns.
    `;
  } else {
    languageRules = `
      - Ensure natural phrasing for native speakers of ${language.code}.
      - If input is in a different language, TRANSLATE IT COMPLETELY.
    `;
  }

  let personaInstruction = "";
  if (template.id === 'charlie-munger') {
     if (persona === 'buffett') {
       personaInstruction = "IMPORTANT OVERRIDE: IGNORE input triggers. You MUST adopt the persona of WARREN BUFFETT (Optimistic, Folksy, Grandfatherly). DO NOT be Munger.";
     } else if (persona === 'munger') {
       personaInstruction = "IMPORTANT OVERRIDE: IGNORE input triggers. You MUST adopt the persona of CHARLIE MUNGER (Blunt, Realistic, Cynical). DO NOT be Buffett.";
     } else {
       personaInstruction = "AUTO-DETECT MODE: Analyze the input to decide whether to be Buffett or Munger.";
     }
  }

  let contextInstruction = "";
  if (personalContext && personalContext.trim().length > 0) {
    contextInstruction = `
      *** PERSONAL CONTEXT / BRAND VOICE ***
      USER CONTEXT: """${personalContext}"""
      INSTRUCTION: Apply this context implicitly.
    `;
  }

  const baseInstruction = `
    *** CRITICAL LANGUAGE FIREWALL ***
    YOU MUST WRITE THE SCRIPT ENTIRELY IN: [ ${language.code.toUpperCase()} ].
    
    ROLE: Expert YouTube Scriptwriter & Voice Director.
    TONE: Natural Storytelling, Emotional but Grounded, Rhythmic.
    
    *** NARRATIVE PERSPECTIVE ***
    - MODE: ${perspective.id !== 'auto' ? perspective.label : 'AUTO-DETECT based on content type'}
    - INSTRUCTION: Maintain this perspective consistently.

    ${personaInstruction}
    ${contextInstruction}

    === STRICT TTS FORMATTING ENGINE ===
    1. PARAGRAPH STRUCTURE: Short paragraphs (3-5 sentences). ONE main idea per paragraph.
    2. NO LISTS / NO HEADERS: Output PURE SPOKEN TEXT.
    3. CLEAN AUDIO ONLY: NO [Intro], [Music], [Sound Effect].
    4. NATURAL FLOW: AVOID filler words. Ensure logic flows forward.

    ${languageRules}

    TEMPLATE: ${template.title}
    ${template.systemPromptAddon}
  `;

  try {
    if (!useChainedGeneration) {
      // --- SINGLE PASS ---
      const maxWords = Math.round(config.targetChars / 4.5);
      
      const prompt = `
        TASK: Write a ${config.minutes}-minute script.
        TARGET LENGTH: ~${config.targetChars} chars (Approx ${maxWords} words).
        OUTPUT LANGUAGE: ${language.code.toUpperCase()} ONLY.
        INPUT TOPIC: "${input}"
        
        STRUCTURE:
        - Divide into logical sections (no headers).
        - Start with ONE strong Hook.
        
        STRICT LENGTH CONSTRAINT:
        - Do NOT exceed ${maxWords + 100} words.
      `;

      const response = await generateWithRetry(ai, {
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: baseInstruction, temperature: 0.65 }
      });
      
      return response.text || "No content.";

    } else {
      // --- CHAINED GENERATION ---
      const totalParts = Math.ceil(config.minutes / CHUNK_DURATION);
      const chunkCharsTarget = Math.round(config.targetChars / totalParts);
      const chunkWordTarget = Math.round(chunkCharsTarget / 4.5);

      let fullScript = "";
      let previousContext = ""; 

      console.log(`🚀 Starting Seamless Chain: ${totalParts} Parts for ${config.minutes} mins. Target: ~${chunkWordTarget} words/part.`);

      for (let i = 1; i <= totalParts; i++) {
        const isFirst = i === 1;
        const isLast = i === totalParts;
        
        // --- PACING CONTROL ---
        let pacingInstruction = "";
        if (isFirst) pacingInstruction = "STATUS: BEGINNING. Introduce characters/conflict. Establish consistent setting.";
        else if (isLast) pacingInstruction = "STATUS: ENDING. Resolve conflict. No cliffhangers. No new plots.";
        else pacingInstruction = "STATUS: MIDDLE. Develop story. Do not start over. Do not change names.";
        
        // Increased context window to 4000 chars to avoid "Amnesia"
        const contextWindow = previousContext.slice(-4000);

        const consistencyCheck = i > 1 ? `
            *** CRITICAL RULES ***
            1. DO NOT CHANGE NAMES.
            2. DO NOT RECAP OR RE-HOOK ("Before we dive in...").
            3. CONTINUE IMMEDIATELY from the previous sentence.
        ` : "";

        const partPrompt = `
            *** PART ${i} of ${totalParts} ***
            OUTPUT LANGUAGE: ${language.code.toUpperCase()} ONLY.
            GOAL: Write the NEXT ${CHUNK_DURATION} MINUTES (~${chunkWordTarget} words).
            TOPIC: "${input}"
            
            PACING: ${pacingInstruction}
            ${i > 1 ? `PREVIOUS CONTEXT: "...${contextWindow}"` : ""}
            ${consistencyCheck}
            
            STRICT LENGTH CONSTRAINT:
            - Target: ~${chunkWordTarget} words.
        `;

        console.log(`📝 Generating Part ${i}...`);
        
        const response = await generateWithRetry(ai, {
          model: 'gemini-2.5-flash',
          contents: partPrompt,
          config: { systemInstruction: baseInstruction, temperature: 0.65 }
        });

        let partText = response.text || "";
        
        // Cleanup
        partText = partText.replace(/^\*\*Part \d+\*\*[:\s]*/i, '').replace(/^Part \d+[:\s]*/i, '');
        partText = partText.replace(/^[\*\-]\s/gm, ''); 

        fullScript += (isFirst ? "" : " ") + partText;
        previousContext = partText;

        if (!isLast) await delay(4000); 
      }
      
      return fullScript;
    }

  } catch (error: any) {
    console.error("API Error:", error);
    const msg = error.message || '';
    if (msg.includes('API key') || msg.includes('403') || msg.includes('MISSING_API_KEY')) {
       return `⚠️ LỖI API KEY: KHÓA KHÔNG HỢP LỆ HOẶC ĐÃ HẾT HẠN.`;
    }
    if (msg.includes('quota')) return `⚠️ HỆ THỐNG ĐANG BẬN (QUOTA EXCEEDED): Vui lòng đợi 1-2 phút rồi thử lại.`;
    return `⚠️ LỖI: ${msg}`;
  }
};
