
import { ScriptTemplate, LanguageOption, DurationOption, InputMode, PerspectiveOption } from '../types';
import { calculateTargetLength } from './geminiService';

const getOpenAiKey = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('openai_api_key') || '';
  }
  return '';
};

// Helper: Wait function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function callOpenAI(
  apiKey: string,
  model: string,
  messages: any[],
  temperature: number = 0.7
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature,
    })
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || 'OpenAI API Error');
  }

  return data.choices?.[0]?.message?.content || "";
}

export const generateScriptOpenAI = async (
  input: string,
  template: ScriptTemplate,
  language: LanguageOption,
  duration: DurationOption,
  mode: InputMode,
  perspective: PerspectiveOption,
  modelId: string, // e.g., 'gpt-4o', 'gpt-3.5-turbo'
  customMinutes?: number,
  persona: 'auto' | 'buffett' | 'munger' = 'auto',
  personalContext?: string
): Promise<string> => {
  
  const apiKey = getOpenAiKey();
  if (!apiKey) {
    return `⚠️ CHƯA CÓ OPENAI API KEY\n\nVui lòng vào Cài đặt -> Cấu hình AI -> Nhập OpenAI API Key.`;
  }

  const config = calculateTargetLength(language.id, duration.id, customMinutes);
  const CHUNK_DURATION = 3; 
  const useChainedGeneration = config.minutes > 4;

  // --- PROMPT CONSTRUCTION (Mirrored from Gemini Service for consistency) ---
  
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

  // HANDLE PERSONAL CONTEXT
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
      INSTRUCTION: Apply this context implicitly.
    `;
  }

  const systemInstruction = `
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

  try {
    if (!useChainedGeneration) {
      // --- SINGLE PASS STRATEGY ---
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

      return await callOpenAI(apiKey, modelId, [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: userPrompt }
      ]);

    } else {
      // --- CHAINED GENERATION STRATEGY ---
      const totalParts = Math.ceil(config.minutes / CHUNK_DURATION);
      let fullScript = "";
      let previousContext = ""; 

      console.log(`🚀 Starting OpenAI Chain: ${totalParts} Parts`);

      for (let i = 1; i <= totalParts; i++) {
        const isFirst = i === 1;
        const isLast = i === totalParts;
        const chunkCharsTarget = 3000;

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

            CONTEXT FROM PREVIOUS PART:
            "...${previousContext.slice(-500)}"

            CRITICAL SEAMLESS INSTRUCTIONS:
            1. START IMMEDIATELY where the context left off. 
            2. DO NOT write an intro.
            3. Maintain the "Chapter" structure.
            
            ${isLast 
              ? "5. WRAP UP: Bring all threads to a Climax and then a thought-provoking Conclusion." 
              : "5. End this part on a transition, ready for the next part."
            }
          `;
        }

        const partText = await callOpenAI(apiKey, modelId, [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: partPrompt }
        ]);

        // Cleanup
        let cleanedPart = partText.replace(/^\*\*Part \d+\*\*[:\s]*/i, '').replace(/^Part \d+[:\s]*/i, '');
        cleanedPart = cleanedPart.replace(/^[\*\-]\s/gm, ''); 

        fullScript += (isFirst ? "" : " ") + cleanedPart;
        previousContext = cleanedPart;

        if (!isLast) await delay(1000);
      }
      
      return fullScript;
    }

  } catch (error: any) {
    console.error("OpenAI Error:", error);
    return `⚠️ LỖI OPENAI: ${error.message}`;
  }
};
