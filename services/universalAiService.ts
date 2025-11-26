
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
  
  // USER REQUIREMENT: FIXED EXACTLY AT 1000 CHARS / MIN
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

  // 1. Remove Markdown headers and bold headers (e.g., **Part 1**, # Chapter 1)
  cleaned = cleaned.replace(/^#+\s.*$/gm, ''); // Remove "# Header"
  cleaned = cleaned.replace(/^\*\*.*(Part|Chapter|Phần|Chương|Intro|Outro).*\*\*[:\s]*$/gmi, ''); // Remove "**Part 1**"
  cleaned = cleaned.replace(/^.*(Part|Chapter|Phần|Chương)\s+\d+[:\.]?\s*$/gmi, ''); // Remove "Part 1:" lines

  // 2. Remove Labels (e.g., "Hook:", "Body:", "Conclusion:")
  cleaned = cleaned.replace(/^(Hook|Intro|Body|Conclusion|Lời dẫn|Thân bài|Kết bài|Scene \d+):/gmi, '');
  
  // 3. Remove Brackets/Parentheses (often used for actions like [Music], (Sighs))
  cleaned = cleaned.replace(/\[.*?\]/g, ''); 
  cleaned = cleaned.replace(/\(.*?\)/g, ''); 

  // 4. Remove Common AI Chaining Phrases
  cleaned = cleaned.replace(/Here is the (next|continuation).*?:/gi, '');
  cleaned = cleaned.replace(/Continuing from where we left off.*?/gi, '');
  cleaned = cleaned.replace(/As mentioned in the previous part.*?/gi, '');
  cleaned = cleaned.replace(/Before we dive in.*?/gi, ''); // Remove repeated hooks

  // 5. Cleanup Multiple Newlines to single/double
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
      
      INSTRUCTION: Write the NEW script so it feels consistent with the examples above.
    `;
  }

  return `
    *** CRITICAL LANGUAGE FIREWALL ***
    YOU MUST WRITE THE SCRIPT ENTIRELY IN: [ ${language.code.toUpperCase()} ].
    
    *** CULTURAL LOCALIZATION (MANDATORY) ***
    - YOU MUST ADAPT THE STORY TO THE CULTURE OF: ${language.code.toUpperCase()}.
    - CHANGE NAMES: Use common names from that country (e.g., English=John, Vietnamese=Hùng).
    - CHANGE LOCATIONS: Use cities/regions from that country.
    
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
    
    2. NO LISTS / NO BULLET POINTS / NO HEADERS:
       - ABSOLUTELY NO using "-", "*", "1.", "2.".
       - ABSOLUTELY NO "Chapter 1", "Part 1", "Intro", "Outro" headers.
       - The output must be PURE SPOKEN TEXT.
       - Transform all lists into flowing narrative sentences.
    
    3. CLEAN AUDIO ONLY:
       - NO [Intro], [Music], [Sound Effect], [Scene], [Character Name].
       - JUST THE SPOKEN WORDS.
    
    4. NATURAL FLOW (NO FILLERS):
       - AVOID filler words.
       - Use natural punctuation.
       - Ensure logic flows: Hook -> Development -> Climax -> Conclusion.
       - DO NOT Summarize or say "In conclusion" unless it is the very end.

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
      // Reduced temperature to 0.65 to reduce hallucinations/rambling
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
      template, 
      language, 
      options.perspective, 
      persona, 
      personalContext,
      learnedExamples 
  );
  
  // Decide Strategy
  // 5 minutes per chunk ensures the AI has enough context but doesn't drift
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
      // Using 4.5 divisor to be conservative and prevent over-writing
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
      // --- CHAINED GENERATION WITH PACING CONTROL ---
      const totalParts = Math.ceil(config.minutes / CHUNK_DURATION);
      
      const chunkCharsTarget = Math.round(config.targetChars / totalParts);
      // Explicit word count targets (AI understands words better than characters)
      const chunkWordTarget = Math.round(chunkCharsTarget / 4.5); 
      
      let fullScript = "";
      let previousContext = "";

      console.log(`🚀 Starting Universal Chain (${provider}): ${totalParts} Parts. Target per part: ~${chunkWordTarget} words.`);

      for (let i = 1; i <= totalParts; i++) {
        const isFirst = i === 1;
        const isLast = i === totalParts;
        let partPrompt = "";

        // --- DYNAMIC PACING CHECK ---
        const currentTotalLength = fullScript.length;
        const expectedProgressLength = (i - 1) * chunkCharsTarget;
        
        let pacingInstruction = "";
        if (i > 1) {
            // Check if previous parts were too long
            if (currentTotalLength > expectedProgressLength * 1.15) {
                pacingInstruction = `
                  URGENT PACING CORRECTION: You are writing TOO MUCH. 
                  - CONDENSE this part significantly.
                  - SKIP minor details.
                  - Focus ONLY on the main plot progression.
                  - WRITE FASTER/SHORTER.
                `;
            } else if (currentTotalLength < expectedProgressLength * 0.85) {
                pacingInstruction = "NOTE: You are writing too briefly. Please expand on details, emotions, and atmosphere more deeply.";
            } else {
                pacingInstruction = "PACING IS GOOD. Maintain this density.";
            }
        }

        if (isFirst) {
          partPrompt = `
            *** PART 1 of ${totalParts} ***
            OUTPUT LANGUAGE: ${language.code.toUpperCase()} ONLY.
            GOAL: Write the FIRST ${CHUNK_DURATION} MINUTES.
            TARGET LENGTH: ~${chunkWordTarget} words.
            
            TOPIC: "${input}"
            
            INSTRUCTIONS:
            1. Start with a powerful HOOK (e.g., "The betrayal happened on a Tuesday...").
            2. Develop the inciting incident and rising action.
            3. Paragraphs: 3-5 sentences. NO LISTS.
            
            STRICT LENGTH CONSTRAINT:
            - STOP writing after approximately ${chunkWordTarget} words.
          `;
        } else {
          partPrompt = `
            *** PART ${i} of ${totalParts} ***
            OUTPUT LANGUAGE: ${language.code.toUpperCase()} ONLY.
            GOAL: Write the NEXT ${CHUNK_DURATION} MINUTES.
            TARGET LENGTH: ~${chunkWordTarget} words.
            
            PREVIOUS CONTEXT (LAST 500 CHARS): 
            "...${previousContext.slice(-600)}"
            
            PACING CHECK: ${pacingInstruction}

            *** CRITICAL ANTI-REPETITION RULES ***
            1. DO NOT RECAP the previous part.
            2. DO NOT START with "Welcome back" or "In the last part".
            3. DO NOT REPEAT the "Hook" (e.g., "Before we dive in...").
            4. CONTINUE THE STORY IMMEDIATELY from the last sentence of the context.
            
            STRICT LENGTH CONSTRAINT:
            - STOP writing after approximately ${chunkWordTarget} words.
            
            ${isLast ? "5. WRAP UP: Bring all threads to a logical conclusion." : "5. End this part on a transition."}
          `;
        }

        let partText = await executeCall(systemInstruction, partPrompt);
        partText = cleanArtifacts(partText);

        fullScript += (isFirst ? "" : " ") + partText;
        previousContext = partText;

        if (!isLast) await delay(1000); 
      }
      return fullScript;
    }
  } catch (error: any) {
    console.error(`Error in Universal Generation (${provider}):`, error);
    return `⚠️ LỖI (${provider.toUpperCase()}): ${error.message}`;
  }
};
