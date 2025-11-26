

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
  
  // FIXED: Set exactly to 1000 chars/min as requested
  // This helps maintain a predictable output length (e.g., 60 mins -> 60k chars)
  let targetChars = 0;
  if (isCJK) {
    targetChars = Math.round(minutes * 300);
  } else {
    targetChars = Math.round(minutes * 1000); 
  }

  // Strict range to avoid overflowing (Target +/- 5% only)
  const minChars = Math.round(targetChars * 0.95); 
  const maxChars = Math.round(targetChars * 1.05); 

  return { minutes, targetChars, minChars, maxChars, isCJK };
};

// --- ARTIFACT CLEANER (FOR TTS) ---
const cleanArtifacts = (text: string): string => {
  if (!text) return "";
  
  let cleaned = text;

  // 1. Remove Markdown headers and bold headers
  cleaned = cleaned.replace(/^#+\s.*$/gm, ''); 
  cleaned = cleaned.replace(/^\*\*.*(Part|Chapter|Phần|Chương|Intro|Outro).*\*\*[:\s]*$/gmi, ''); 
  cleaned = cleaned.replace(/^.*(Part|Chapter|Phần|Chương)\s+\d+[:\.]?\s*$/gmi, ''); 

  // 2. Remove Labels
  cleaned = cleaned.replace(/^(Hook|Intro|Body|Conclusion|Lời dẫn|Thân bài|Kết bài|Scene \d+):/gmi, '');
  
  // 3. Remove Brackets/Parentheses (actions)
  cleaned = cleaned.replace(/\[.*?\]/g, ''); 
  cleaned = cleaned.replace(/\(.*?\)/g, ''); 

  // 4. Remove Common AI Chaining Phrases & Repetitive Hooks
  cleaned = cleaned.replace(/Here is the (next|continuation).*?:/gi, '');
  cleaned = cleaned.replace(/Continuing from where we left off.*?/gi, '');
  cleaned = cleaned.replace(/As mentioned in the previous part.*?/gi, '');
  
  // -- SPECIFIC REMOVAL OF THE UNWANTED HOOKS --
  // More aggressive cleaning of the specific YouTube engagement bait
  cleaned = cleaned.replace(/Before we (dive|jump) into today’s story.*?(Let’s get started|Let’s begin)!/gsi, '');
  cleaned = cleaned.replace(/Before we dive into today’s story.*?(\.|\!)/gi, '');
  cleaned = cleaned.replace(/take a moment to (let us know|share).*?(\.|\!)/gi, '');
  
  // Clean up residual sentences if the regex wasn't greedy enough or varied slightly
  cleaned = cleaned.replace(/If you haven’t already, (be sure to|don’t forget to) (hit|click) that subscribe button.*?(\.|\!)/gi, '');
  cleaned = cleaned.replace(/Now, (settle in|get comfortable|grab a).*?(\.|\!)/gi, '');
  
  cleaned = cleaned.replace(/Before we dive in.*?/gi, ''); 
  cleaned = cleaned.replace(/Welcome back to.*?/gi, '');
  cleaned = cleaned.replace(/In today's story.*?/gi, '');

  // 5. Cleanup Multiple Newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
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
      - LOCALIZATION: Use Vietnamese names (Hùng, Lan, Tuấn...) and locations (Hà Nội, Sài Gòn...) unless the topic implies otherwise.
    `;
  } else {
    languageRules = `
      - Ensure natural phrasing for native speakers of ${language.code}.
      - LOCALIZATION: Adapt names, cities, and currency to match ${language.code} culture.
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

  let learningInstruction = "";
  if (learnedExamples && learnedExamples.length > 0) {
    learningInstruction = `
      *** ADAPTIVE STYLE LEARNING ***
      YOUR GOAL: MIMIC the style of these past examples:
      --- [EXAMPLE START] ---
      ${learnedExamples[0].substring(0, 500)}...
      --- [EXAMPLE END] ---
    `;
  }

  return `
    *** CRITICAL LANGUAGE FIREWALL ***
    YOU MUST WRITE THE SCRIPT ENTIRELY IN: [ ${language.code.toUpperCase()} ].
    
    *** CULTURAL LOCALIZATION (MANDATORY) ***
    - YOU MUST ADAPT THE STORY TO THE CULTURE OF: ${language.code.toUpperCase()}.
    - CHANGE NAMES: Use common names from that country.
    - CHANGE LOCATIONS: Use cities/regions from that country.
    
    ROLE: Expert YouTube Scriptwriter & Voice Director.
    TONE: Natural Storytelling, Emotional but Grounded, Rhythmic.
    
    *** NARRATIVE PERSPECTIVE ***
    - MODE: ${perspective.id !== 'auto' ? perspective.label : 'AUTO-DETECT based on content type'}
    - INSTRUCTION: Maintain this perspective consistently.

    ${personaInstruction}
    ${contextInstruction}
    ${learningInstruction}

    === STRICT TTS FORMATTING ENGINE ===
    1. PARAGRAPH STRUCTURE: Short paragraphs (3-5 sentences). ONE main idea per paragraph.
    2. NO LISTS / NO HEADERS: Transform lists into narrative sentences. Output PURE SPOKEN TEXT.
    3. CLEAN AUDIO ONLY: NO [Intro], [Music], [Sound Effect].
    4. NATURAL FLOW: AVOID filler words. Ensure logic flows forward.

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
      'anthropic-dangerous-direct-browser-access': 'true' 
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
  
  const generate = async (retries = 3, backoff = 5000): Promise<string> => {
    try {
      const response = await ai.models.generateContent({
        model: model,
        contents: user,
        config: { systemInstruction: system, temperature: 0.65 }
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
  
  const systemInstruction = buildSystemInstruction(
      template, language, options.perspective, persona, personalContext, learnedExamples 
  );
  
  // Chunk duration increased to 5 minutes to maintain better context
  const CHUNK_DURATION = 5;
  const useChainedGeneration = config.minutes > 6; 

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
      // Conversion: 1 word approx 4.5 chars
      const maxWords = Math.round(config.targetChars / 4.5);

      const userPrompt = `
        TASK: Write a ${config.minutes}-minute script.
        TARGET LENGTH: ~${config.targetChars} characters (Approx ${maxWords} words).
        OUTPUT LANGUAGE: ${language.code.toUpperCase()} ONLY.
        INPUT TOPIC: "${input}"
        
        STRUCTURE:
        - Write continuously. No headers.
        - Insert ONE strong "Hook" at the beginning.
        
        STRICT LENGTH CONSTRAINT:
        - Do NOT exceed ${maxWords + 100} words.
        - Stop when you have reached the logical conclusion.
      `;
      const rawText = await executeCall(systemInstruction, userPrompt);
      return cleanArtifacts(rawText);

    } else {
      // --- CHAINED GENERATION WITH INTELLIGENT PACING ---
      const totalParts = Math.ceil(config.minutes / CHUNK_DURATION);
      const chunkCharsTarget = Math.round(config.targetChars / totalParts);
      const chunkWordTarget = Math.round(chunkCharsTarget / 4.5); 
      
      let fullScript = "";
      let previousContext = "";

      console.log(`🚀 Starting Chain: ${totalParts} Parts. Target: ~${chunkWordTarget} words/part.`);

      for (let i = 1; i <= totalParts; i++) {
        const isFirst = i === 1;
        const isLast = i === totalParts;
        let partPrompt = "";

        // --- PACING CONTROL ---
        let pacingInstruction = "";
        
        if (isFirst) {
            pacingInstruction = `
              - STATUS: BEGINNING.
              - ACTION: Introduce characters (Names, Ages) and the main conflict. 
              - SETTING: Establish a specific location (e.g., Ohio, Vietnam) and STICK TO IT.
            `;
        } else if (isLast) {
             pacingInstruction = `
              - STATUS: ENDING.
              - ACTION: Resolve the main conflict. Provide emotional closure.
              - IMPORTANT: Wrap up the story. Do NOT start a new subplot.
            `;
        } else {
            pacingInstruction = `
              - STATUS: MIDDLE (Development).
              - ACTION: Escalate the conflict. Move the story forward.
              - DO NOT introduce new main characters.
              - DO NOT start a new random plot (like a murder mystery) if not present before.
            `;
        }

        // --- ANTI-LOOPING & CONSISTENCY ---
        // We pass a much larger context window (last 4000 chars) to ensure the AI remembers names.
        const contextWindow = previousContext.slice(-4000); 

        const consistencyCheck = i > 1 ? `
            *** CRITICAL CONSISTENCY RULES ***
            1. CONSISTENT NAMES: You MUST use the SAME character names as the previous context.
            2. CONSISTENT LOCATION: Do not change the city/setting unless they travel.
            3. NO RECAPS: Do NOT say "Previously..." or "As we saw...".
            4. NO NEW HOOKS: Do NOT say "Before we dive in..." or "Welcome back...".
            5. CONTINUITY: Continue the scene exactly where the previous text cut off.
        ` : "";

        const promptTemplate = `
            *** PART ${i} of ${totalParts} ***
            OUTPUT LANGUAGE: ${language.code.toUpperCase()} ONLY.
            GOAL: Write the NEXT ${CHUNK_DURATION} MINUTES (~${chunkWordTarget} words).
            TOPIC: "${input}"
            
            PACING INSTRUCTION: ${pacingInstruction}
            
            ${i > 1 ? `PREVIOUS CONTEXT (STORY SO FAR): "...${contextWindow}"` : ""}
            
            ${consistencyCheck}
            
            STRICT LENGTH CONSTRAINT:
            - Target: ~${chunkWordTarget} words.
            - Do not write significantly more than this.
        `;

        let partText = await executeCall(systemInstruction, promptTemplate);
        partText = cleanArtifacts(partText);

        fullScript += (isFirst ? "" : " ") + partText;
        previousContext = partText; // Store last part for context

        if (!isLast) await delay(1000); 
      }
      return fullScript;
    }
  } catch (error: any) {
    console.error(`Error in Universal Generation (${provider}):`, error);
    return `⚠️ LỖI (${provider.toUpperCase()}): ${error.message}`;
  }
};