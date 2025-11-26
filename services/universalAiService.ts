
import { GoogleGenAI } from "@google/genai";
import { ScriptTemplate, LanguageOption, DurationOption, InputMode, PerspectiveOption, AIProvider } from '../types';

// --- HELPER TYPES & FUNCTIONS ---

interface ApiKeys {
  googleApiKey?: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  xaiApiKey?: string;
}

interface GenerateOptions {
  provider: AIProvider;
  model: string;
  input: string;
  template: ScriptTemplate;
  language: LanguageOption;
  duration: DurationOption;
  mode: InputMode;
  perspective: PerspectiveOption;
  customMinutes?: number;
  persona?: 'auto' | 'buffett' | 'munger';
  personalContext?: string;
  learnedExamples?: string[]; // Dữ liệu tự học từ lịch sử
  apiKeys: ApiKeys;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
  // Math: CJK ~333 chars/min, Latin ~1000 chars/min
  let targetChars = 0;
  if (isCJK) {
    targetChars = Math.round(minutes * (1000 / 3));
  } else {
    targetChars = minutes * 1000;
  }

  // Strict range
  const minChars = Math.round(targetChars * 0.95); 
  const maxChars = Math.round(targetChars * 1.30); 

  return { minutes, targetChars, minChars, maxChars, isCJK };
};

// --- PROMPT BUILDER (Unified) ---
const buildSystemInstruction = (
  template: ScriptTemplate, 
  language: LanguageOption, 
  perspective: PerspectiveOption,
  persona: string = 'auto',
  personalContext?: string,
  learnedExamples?: string[]
): string => {

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
      The user has provided specific background information or a specific writing style they prefer.
      You MUST incorporate this context into the tone, style, and content of the script.
      USER CONTEXT: """${personalContext}"""
      INSTRUCTION: Apply this context implicitly.
    `;
  }

  // --- AUTO-LEARNING INJECTION ---
  let learningInstruction = "";
  if (learnedExamples && learnedExamples.length > 0) {
    learningInstruction = `
      *** ADAPTIVE STYLE LEARNING (FROM USER HISTORY) ***
      I have retrieved past scripts that the user successfully generated with this template.
      Analyze the writing style, vocabulary choice, sentence structure, and tone of the examples below.
      
      YOUR GOAL: MIMIC this style for the new script.
      
      --- [PAST EXAMPLE 1] ---
      ${learnedExamples[0]}
      --- [END EXAMPLE 1] ---
      
      ${learnedExamples.length > 1 ? `
      --- [PAST EXAMPLE 2] ---
      ${learnedExamples[1]}
      --- [END EXAMPLE 2] ---
      ` : ''}
      
      INSTRUCTION: Write the NEW script so it feels consistent with the examples above.
    `;
  }

  return `
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
    ${learningInstruction}

    === STRICT TTS FORMATTING ENGINE (NO COMPROMISE) ===
    1. PARAGRAPH STRUCTURE:
       - Break text into short paragraphs of 3-5 sentences maximum.
       - Each paragraph must have ONE clear main idea.
       - NO walls of text.
    
    2. NO LISTS / NO BULLET POINTS:
       - ABSOLUTELY NO using "-", "*", "1.", "2.".
       - Transform all lists into flowing narrative sentences.
    
    3. CLEAN AUDIO ONLY:
       - NO [Intro], [Music], [Sound Effect], [Scene], [Character Name].
       - JUST THE SPOKEN WORDS.
    
    4. NATURAL FLOW (NO FILLERS):
       - AVOID filler words.
       - Use natural punctuation.
       - Ensure logic flows: Hook -> Development -> Climax -> Conclusion.

    ${languageRules}

    TEMPLATE: ${template.title}
    ${template.systemPromptAddon}
  `;
};

// --- RAW API CALLERS ---

async function callOpenAI(apiKey: string, model: string, system: string, user: string): Promise<string> {
  if (!apiKey) throw new Error("Thiếu OpenAI API Key.");
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.7
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'OpenAI API Error');
  return data.choices?.[0]?.message?.content || "";
}

async function callAnthropic(apiKey: string, model: string, system: string, user: string): Promise<string> {
  if (!apiKey) throw new Error("Thiếu Anthropic API Key.");
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 
      'content-type': 'application/json', 
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true' // Needed for client-side calls
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Anthropic API Error');
  return data.content?.[0]?.text || "";
}

async function callXAI(apiKey: string, model: string, system: string, user: string): Promise<string> {
  if (!apiKey) throw new Error("Thiếu xAI API Key.");
  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      temperature: 0.7
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'xAI API Error');
  return data.choices?.[0]?.message?.content || "";
}

async function callGoogle(apiKey: string, model: string, system: string, user: string): Promise<string> {
  if (!apiKey) throw new Error("Thiếu Google API Key.");
  const ai = new GoogleGenAI({ apiKey });
  
  // Handling retry logic internally for Google as it's prone to 429 in free tier
  const generate = async (retries = 3, backoff = 5000): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: user,
        config: { systemInstruction: system, temperature: 0.85 }
      });
      return response.text || "";
    } catch (error: any) {
      const msg = (error.message || '').toLowerCase();
      const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('exhausted');
      if (isQuota && retries > 0) {
        await delay(backoff);
        return generate(retries - 1, backoff * 2);
      }
      throw error;
    }
  };
  return generate();
}

// --- MAIN UNIVERSAL GENERATOR ---

export const universalGenerateScript = async (options: GenerateOptions): Promise<string> => {
  const { 
    provider, model, input, template, language, duration, 
    customMinutes, persona, personalContext, learnedExamples, apiKeys 
  } = options;

  const config = calculateTargetLength(language.id, duration.id, customMinutes);
  
  // Pass learnedExamples to system instruction builder
  const systemInstruction = buildSystemInstruction(
      template, 
      language, 
      options.perspective, 
      persona, 
      personalContext,
      learnedExamples 
  );
  
  // Decide Strategy: Single vs Chained
  const CHUNK_DURATION = 3;
  const useChainedGeneration = config.minutes > 4;

  const executeCall = async (sys: string, usr: string) => {
    switch (provider) {
      case 'openai': return callOpenAI(apiKeys.openaiApiKey || '', model, sys, usr);
      case 'anthropic': return callAnthropic(apiKeys.anthropicApiKey || '', model, sys, usr);
      case 'xai': return callXAI(apiKeys.xaiApiKey || '', model, sys, usr);
      case 'google': return callGoogle(apiKeys.googleApiKey || '', model, sys, usr);
      default: throw new Error(`Provider ${provider} not supported`);
    }
  };

  try {
    if (!useChainedGeneration) {
      // --- SINGLE PASS ---
      const userPrompt = `
        TASK: Write a ${config.minutes}-minute script (~${config.targetChars} chars).
        OUTPUT LANGUAGE: ${language.code.toUpperCase()} ONLY.
        INPUT TOPIC: "${input}"
        STRUCTURE:
        - Divide into logical "CHAPTERS" (but do not use headers).
        - Every 30 seconds (~500 chars), insert a "Mini-Hook" or curiosity gap.
        REQUIREMENT: YOU MUST HIT AT LEAST ${config.minChars} CHARACTERS.
        Expand on every point. Do not summarize.
      `;
      return await executeCall(systemInstruction, userPrompt);

    } else {
      // --- CHAINED GENERATION ---
      const totalParts = Math.ceil(config.minutes / CHUNK_DURATION);
      let fullScript = "";
      let previousContext = "";

      console.log(`🚀 Starting Universal Chain (${provider}): ${totalParts} Parts`);

      for (let i = 1; i <= totalParts; i++) {
        const isFirst = i === 1;
        const isLast = i === totalParts;
        const chunkCharsTarget = config.isCJK ? 1000 : 3000;
        let partPrompt = "";

        if (isFirst) {
          partPrompt = `
            *** PART 1 of ${totalParts} ***
            OUTPUT LANGUAGE: ${language.code.toUpperCase()} ONLY.
            GOAL: Write the FIRST ${CHUNK_DURATION} MINUTES (~${chunkCharsTarget} chars).
            TOPIC: "${input}"
            INSTRUCTIONS:
            1. Start with a powerful HOOK.
            2. Develop the first 1-2 CHAPTERS.
            3. Paragraphs: 3-5 sentences. NO LISTS.
            4. END this part in the middle of a transition.
            STRICT RULE: BE EXTREMELY VERBOSE.
          `;
        } else {
          partPrompt = `
            *** PART ${i} of ${totalParts} ***
            OUTPUT LANGUAGE: ${language.code.toUpperCase()} ONLY.
            GOAL: Write the NEXT ${CHUNK_DURATION} MINUTES (~${chunkCharsTarget} chars).
            TOPIC: "${input}"
            CONTEXT FROM PREVIOUS PART: "...${previousContext.slice(-500)}"
            CRITICAL SEAMLESS INSTRUCTIONS:
            1. START IMMEDIATELY where the context left off. 
            2. DO NOT write an intro.
            3. Maintain the "Chapter" structure.
            ${isLast ? "5. WRAP UP: Bring all threads to a Climax and then a thought-provoking Conclusion." : "5. End this part on a transition, ready for the next part."}
          `;
        }

        let partText = await executeCall(systemInstruction, partPrompt);
        
        // Clean up common AI artifacts
        partText = partText.replace(/^\*\*Part \d+\*\*[:\s]*/i, '').replace(/^Part \d+[:\s]*/i, '');
        partText = partText.replace(/^[\*\-]\s/gm, '');

        fullScript += (isFirst ? "" : " ") + partText;
        previousContext = partText;

        if (!isLast) await delay(1000); // polite delay
      }
      return fullScript;
    }
  } catch (error: any) {
    console.error(`Error in Universal Generation (${provider}):`, error);
    return `⚠️ LỖI (${provider.toUpperCase()}): ${error.message}`;
  }
};
