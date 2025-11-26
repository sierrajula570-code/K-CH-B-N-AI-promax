
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

// Helper: Wait function (simulating "Thinking Time")
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Retry logic
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
  
  // Math: CJK ~300 chars/min, Latin fixed at 1000 chars/min per user request
  let targetChars = 0;
  if (isCJK) {
    targetChars = Math.round(minutes * 300);
  } else {
    targetChars = Math.round(minutes * 1000);
  }

  // Strict range (Target +/- 10%)
  const minChars = Math.round(targetChars * 0.90); 
  const maxChars = Math.round(targetChars * 1.10); 

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
  personalContext?: string // Brand Voice / Memory
): Promise<string> => {
  
  let ai;
  try {
    ai = getAiClient();
  } catch (e) {
    return `⚠️ CHƯA CẬP NHẬT API KEY\n\nXem hướng dẫn trong phần Cài đặt.`;
  }

  const config = calculateTargetLength(language.id, duration.id, customMinutes);
  
  // === STRATEGY SELECTION ===
  const CHUNK_DURATION = 5; 
  const useChainedGeneration = config.minutes > 6;

  // LANGUAGE SPECIFIC RULES
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

  // HANDLE PERSONA OVERRIDE
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

  // HANDLE PERSONAL CONTEXT (BRAND VOICE)
  let contextInstruction = "";
  if (personalContext && personalContext.trim().length > 0) {
    contextInstruction = `
      *** PERSONAL CONTEXT / BRAND VOICE ***
      The user has provided specific background information or a specific writing style they prefer.
      You MUST incorporate this context into the tone, style, and content of the script.
      
      USER CONTEXT:
      """
      ${personalContext}
      """
      
      INSTRUCTION: Apply this context implicitly. Do not mention "The user said...". Just write in this voice/context.
    `;
  }

  const baseInstruction = `
    *** CRITICAL LANGUAGE FIREWALL ***
    YOU MUST WRITE THE SCRIPT ENTIRELY IN: [ ${language.code.toUpperCase()} ].
    IF THE INPUT IS IN ENGLISH/OTHER, YOU MUST TRANSLATE AND ADAPT IT TO ${language.code.toUpperCase()}.
    
    ROLE: Expert YouTube Scriptwriter & Voice Director.
    TONE: Natural Storytelling, Emotional but Grounded, Rhythmic.
    
    *** NARRATIVE PERSPECTIVE ***
    - MODE: ${perspective.id !== 'auto' ? perspective.label : 'AUTO-DETECT based on content type'}
    - CONTEXT: ${perspective.description}
    - INSTRUCTION: Maintain this perspective consistently throughout the entire script.

    ${personaInstruction}

    ${contextInstruction}

    === STRICT TTS FORMATTING ENGINE (NO COMPROMISE) ===
    1. PARAGRAPH STRUCTURE:
       - Break text into short paragraphs of 3-5 sentences maximum.
       - Each paragraph must have ONE clear main idea.
       - NO walls of text.
    
    2. NO LISTS / NO BULLET POINTS:
       - ABSOLUTELY NO using "-", "*", "1.", "2.".
       - Transform all lists into flowing narrative sentences (e.g., instead of "1. Eat healthy", say "First, you need to prioritize your diet...").
    
    3. CLEAN AUDIO ONLY:
       - NO [Intro], [Music], [Sound Effect], [Scene], [Character Name].
       - JUST THE SPOKEN WORDS.
    
    4. NATURAL FLOW (NO FILLERS):
       - AVOID filler words: "và rồi", "thế là", "thực ra thì", "sau đó thì".
       - Use natural punctuation for breathing: "." (stop), "," (pause).
       - Ensure logic flows: Hook -> Development -> Climax -> Conclusion.

    ${languageRules}

    TEMPLATE: ${template.title}
    ${template.systemPromptAddon}
  `;

  try {
    if (!useChainedGeneration) {
      // --- SINGLE PASS STRATEGY ---
      const prompt = `
        TASK: Write a ${config.minutes}-minute script (~${config.targetChars} chars).
        OUTPUT LANGUAGE: ${language.code.toUpperCase()} ONLY.
        INPUT TOPIC: "${input}"
        
        STRUCTURE:
        - Divide into logical "CHAPTERS" (but do not use headers).
        - Every 30 seconds (~400 chars), insert a "Mini-Hook" or curiosity gap.
        
        REQUIREMENT: YOU MUST HIT AT LEAST ${config.minChars} CHARACTERS.
        Expand on every point. Do not summarize.
      `;

      const response = await generateWithRetry(ai, {
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: baseInstruction, temperature: 0.85 }
      });
      
      return response.text || "No content.";

    } else {
      // --- SEAMLESS CHAINED GENERATION STRATEGY ---
      const totalParts = Math.ceil(config.minutes / CHUNK_DURATION);
      const chunkCharsTarget = Math.round(config.targetChars / totalParts);

      let fullScript = "";
      let previousContext = ""; 

      console.log(`🚀 Starting Seamless Chain: ${totalParts} Parts for ${config.minutes} mins`);

      for (let i = 1; i <= totalParts; i++) {
        const isFirst = i === 1;
        const isLast = i === totalParts;
        
        let partPrompt = "";

        if (isFirst) {
          partPrompt = `
            *** PART 1 of ${totalParts} ***
            OUTPUT LANGUAGE: ${language.code.toUpperCase()} ONLY.
            GOAL: Write the FIRST ${CHUNK_DURATION} MINUTES (~${chunkCharsTarget} chars).
            TOPIC: "${input}"

            INSTRUCTIONS:
            1. Start with a powerful HOOK (5-10s) that creates an emotional gap.
            2. Develop the first 1-2 CHAPTERS of the story.
            3. Each paragraph must be 3-5 sentences. NO LISTS.
            4. END this part in the middle of a transition.
            
            STRICT RULE: Write moderately. Do not be overly verbose.
          `;
        } else {
          partPrompt = `
            *** PART ${i} of ${totalParts} ***
            OUTPUT LANGUAGE: ${language.code.toUpperCase()} ONLY.
            GOAL: Write the NEXT ${CHUNK_DURATION} MINUTES (~${chunkCharsTarget} chars).
            TOPIC: "${input}"

            CONTEXT FROM PREVIOUS PART (Last 500 chars):
            "...${previousContext.slice(-500)}"

            CRITICAL SEAMLESS INSTRUCTIONS:
            1. START IMMEDIATELY where the context left off. 
            2. DO NOT write an intro (No "Welcome back", No "In this part").
            3. Maintain the "Chapter" structure: Introduce a new Mini-Hook for this section immediately.
            4. Paragraphs: 3-5 sentences. NO LISTS.
            
            ${isLast 
              ? "5. WRAP UP: Bring all threads to a Climax and then a thought-provoking Conclusion." 
              : "5. End this part on a transition, ready for the next part."
            }

            STRICT RULE: EXPAND DEEPLY BUT KEEP PACING. WRITE IN ${language.code.toUpperCase()}.
          `;
        }

        console.log(`📝 Generating Part ${i}...`);
        
        const response = await generateWithRetry(ai, {
          model: 'gemini-2.5-flash',
          contents: partPrompt,
          config: { systemInstruction: baseInstruction, temperature: 0.85 }
        });

        let partText = response.text || "";
        
        // CLEANUP: Remove any accidental headers AI might have generated
        partText = partText.replace(/^\*\*Part \d+\*\*[:\s]*/i, '').replace(/^Part \d+[:\s]*/i, '');
        // Cleanup Markdown Lists just in case AI failed the strict instruction
        partText = partText.replace(/^[\*\-]\s/gm, ''); 

        fullScript += (isFirst ? "" : " ") + partText;
        previousContext = partText;

        if (!isLast) {
          console.log("⏳ Waiting 4s for next part...");
          await delay(4000); 
        }
      }
      
      return fullScript;
    }

  } catch (error: any) {
    console.error("API Error:", error);
    const msg = error.message || '';
    if (msg.includes('API key') || msg.includes('403') || msg.includes('MISSING_API_KEY')) {
       return `⚠️ LỖI API KEY: KHÓA KHÔNG HỢP LỆ HOẶC ĐÃ HẾT HẠN.

Để khắc phục, vui lòng làm theo hướng dẫn sau:

1. Truy cập Google AI Studio để lấy Key miễn phí:
   https://aistudio.google.com/app/apikey

2. Sao chép API Key của bạn.

3. Quay lại đây, nhấn nút "Cài đặt" (biểu tượng bánh răng ở góc trên phải), dán Key mới vào và nhấn "Lưu".

Vui lòng thử lại sau khi cập nhật!`;
    }
    if (msg.includes('quota')) return `⚠️ HỆ THỐNG ĐANG BẬN (QUOTA EXCEEDED): Vui lòng đợi 1-2 phút rồi thử lại.`;
    return `⚠️ LỖI: ${msg}`;
  }
};
