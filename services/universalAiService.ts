
import { GoogleGenAI } from "@google/genai";
import { ScriptTemplate, LanguageOption, DurationOption, InputMode, PerspectiveOption, AIProvider, ScriptAnalysis } from '../types';
import { getPersonaStyle } from './personaStyles';

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
  persona?: 'auto' | 'buffett' | 'munger' | 'custom';
  customPersonaName?: string;
  personalContext?: string;
  learnedExamples?: string[]; // Dữ liệu tự học từ lịch sử
  approvedAnalysis?: ScriptAnalysis; // Dữ liệu phân tích đã được user duyệt
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

  // CJK Languages (Chinese, Japanese, Korean)
  const isCJK = ['jp', 'cn', 'kr', 'tw', 'zh'].includes(langId);
  
  // Updated Density Rule (2025 Update: Higher density for CJK)
  let targetChars = 0;
  if (isCJK) {
    // RULE: 500 characters per minute for CJK (Increased from 333 to force verbosity)
    targetChars = Math.round(minutes * 500);
  } else {
    // RULE: 1000 characters = 1 minute for Latin
    targetChars = Math.round(minutes * 1000); 
  }

  const minChars = Math.round(targetChars * 0.9); 
  const maxChars = Math.round(targetChars * 1.2); // Allow slightly more overflow

  return { minutes, targetChars, minChars, maxChars, isCJK };
};

// --- ARTIFACT CLEANER ---
const cleanArtifacts = (text: string): string => {
  if (!text) return "";
  let cleaned = text;
  cleaned = cleaned.replace(/^#+\s.*$/gm, ''); 
  cleaned = cleaned.replace(/^\*\*.*(Part|Chapter|Phần|Chương|Intro|Outro).*\*\*[:\s]*$/gmi, ''); 
  cleaned = cleaned.replace(/^.*(Part|Chapter|Phần|Chương)\s+\d+[:\.]?\s*$/gmi, ''); 
  cleaned = cleaned.replace(/^(Hook|Intro|Body|Conclusion|Lời dẫn|Thân bài|Kết bài|Scene \d+):/gmi, '');
  cleaned = cleaned.replace(/\[.*?\]/g, ''); 
  cleaned = cleaned.replace(/\(.*?\)/g, ''); 
  cleaned = cleaned.replace(/Here is the (next|continuation).*?:/gi, '');
  cleaned = cleaned.replace(/Before we (dive|jump) into today’s story.*?(Let’s get started|Let’s begin)!/gsi, '');
  cleaned = cleaned.replace(/Before we dive into today’s story.*?(\.|\!)/gi, '');
  cleaned = cleaned.replace(/take a moment to (let us know|share).*?(\.|\!)/gi, '');
  cleaned = cleaned.replace(/If you haven’t already, (be sure to|don’t forget to) (hit|click) that subscribe button.*?(\.|\!)/gi, '');
  cleaned = cleaned.replace(/Now, (settle in|get comfortable|grab a).*?(\.|\!)/gi, '');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
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

// --- NEW FEATURE: ANALYZE REQUEST ---
export const analyzeScriptRequest = async (options: GenerateOptions): Promise<ScriptAnalysis> => {
    const { provider, model, input, template, language, apiKeys, persona, customPersonaName } = options;
    
    // SPECIAL HANDLER FOR MONOLOGUE (CHARLIE MUNGER/CUSTOM)
    if (template.id === 'charlie-munger') {
        const targetCharacter = persona === 'custom' && customPersonaName ? customPersonaName : 
                                persona === 'buffett' ? 'Warren Buffett' : 
                                persona === 'munger' ? 'Charlie Munger' : 'The Expert';

        // 1. Check if we have PRE-DEFINED STYLE MEMORY for this persona
        if (persona === 'buffett' || persona === 'munger') {
            const styleData = getPersonaStyle(persona);
            if (styleData) {
                return {
                    outline: ["The Opening Hook (Chào hỏi & Vào đề)", "The Pivot (Lật lại vấn đề)", "The Wisdom (Bài học cốt lõi)", "The Verdict (Lời khuyên chốt hạ)"],
                    characters: [styleData.name],
                    pacingNote: styleData.styleDescription,
                    characterProfile: {
                        name: styleData.name,
                        archetype: styleData.archetype,
                        style: styleData.styleDescription,
                        corePhilosophy: styleData.corePhilosophy,
                        keywords: styleData.keywords
                    }
                };
            }
        }

        // 2. If Custom, Simulate Wiki Lookup
        const monologueSystem = `
            ROLE: Master Persona Architect & Researcher.
            TASK: Perform a Deep Persona Analysis on: ${targetCharacter}.
            OUTPUT LANGUAGE: ${language.code.toUpperCase()}.
            
            SIMULATE KNOWLEDGE RETRIEVAL:
            1. Analyze ${targetCharacter}'s real-world speaking style.
            2. Identify Core Philosophy.
            3. List Signature Keywords.
            
            JSON OUTPUT ONLY:
            {
               "outline": ["Hook", "Core Argument", "Insight", "Call to Action"],
               "characters": ["${targetCharacter}"],
               "pacingNote": "Tone description",
               "characterProfile": {
                   "name": "${targetCharacter}",
                   "archetype": "Brief archetype",
                   "style": "Speaking style",
                   "corePhilosophy": "Key beliefs",
                   "keywords": ["Keyword1", "Keyword2"]
               }
            }
        `;
        try {
            const executeCall = async (sys: string, usr: string) => {
                switch (provider) {
                  case 'openai': return callOpenAI(apiKeys.openaiApiKey || '', model, sys, usr);
                  case 'anthropic': return callAnthropic(apiKeys.anthropicApiKey || '', model, sys, usr);
                  case 'xai': return callXAI(apiKeys.xaiApiKey || '', model, sys, usr);
                  case 'google': return callGoogle(apiKeys.googleApiKey || '', model, sys, usr);
                  default: throw new Error(`Provider ${provider} not supported`);
                }
            };
            let raw = await executeCall(monologueSystem, `Topic: ${input}`);
            raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(raw);
            return {
                outline: parsed.outline || ["Intro", "Body", "Conclusion"],
                characters: parsed.characters || [targetCharacter],
                pacingNote: parsed.pacingNote || "Direct",
                characterProfile: parsed.characterProfile
            };
        } catch(e) {
            return {
                outline: ["Mở đầu", "Thân bài", "Kết luận"],
                characters: [targetCharacter],
                pacingNote: "Standard",
                characterProfile: {
                    name: targetCharacter,
                    archetype: "Expert",
                    style: "Authoritative",
                    corePhilosophy: "Rational",
                    keywords: []
                }
            };
        }
    }

    // ... (Existing logic for Drama/Senior Love) ...
    const systemPrompt = `
      ROLE: Senior Script Doctor & Architect.
      TASK: Analyze the user's idea and outline a solid structure.
      OUTPUT LANGUAGE: ${language.code.toUpperCase()}.
      
      REQUIREMENTS:
      1. Define the 7-Stage Plot Framework.
      2. Create a list of FIXED characters.
      3. OUTPUT FORMAT: JSON ONLY.
      
      JSON SCHEMA:
      {
        "outline": ["Stage 1...", "Stage 2...", ...],
        "characters": ["Name - Role"],
        "pacingNote": "Tone advice"
      }
    `;
    
    const userPrompt = `Input Idea: "${input}"\nTemplate: ${template.title}`;

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
        let raw = await executeCall(systemPrompt, userPrompt);
        raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(raw);
        return {
            outline: parsed.outline || [],
            characters: parsed.characters || [],
            pacingNote: parsed.pacingNote || "Standard"
        };
    } catch (e) {
        return {
            outline: ["Khởi đầu", "Uẩn khúc", "Xung đột", "Leo thang", "Cao trào", "Giải quyết", "Kết thúc"],
            characters: ["Nhân vật chính", "Nhân vật phụ"],
            pacingNote: "Manual Review"
        };
    }
};

// --- PROMPT BUILDER (Unified) ---
const buildSystemInstruction = (
  template: ScriptTemplate, 
  language: LanguageOption, 
  perspective: PerspectiveOption,
  persona: string = 'auto',
  customPersonaName?: string,
  personalContext?: string,
  learnedExamples?: string[],
  approvedAnalysis?: ScriptAnalysis
): string => {

  let languageRules = "";
  if (language.id === 'vi') {
    languageRules = `
      - VIETNAMESE SPECIFIC:
      - Read numbers as words.
      - Use "VTV" style: Formal, clear, precise.
    `;
  } else {
    languageRules = `
      - Ensure natural phrasing for native speakers of ${language.code}.
    `;
  }

  let approvedStructureInstruction = "";
  if (approvedAnalysis) {
      approvedStructureInstruction = `
        *** APPROVED BLUEPRINT ***
        CHARACTERS (FIXED): ${approvedAnalysis.characters.join(', ')}
        OUTLINE: ${approvedAnalysis.outline.join(' -> ')}
      `;
  }

  let personaInstruction = "";
  if (template.id === 'charlie-munger') {
     if (approvedAnalysis?.characterProfile) {
         const p = approvedAnalysis.characterProfile;
         let styleMemory = "";
         if (p.name === 'Warren Buffett') {
             const s = getPersonaStyle('buffett');
             if (s) styleMemory = `\nSTYLE MEMORY / SAMPLE TEXT:\n"""${s.sampleMonologue}"""`;
         } else if (p.name === 'Charlie Munger') {
             const s = getPersonaStyle('munger');
             if (s) styleMemory = `\nSTYLE MEMORY / SAMPLE TEXT:\n"""${s.sampleMonologue}"""`;
         }

         personaInstruction = `
            *** DEEP PERSONA SIMULATION: ${p.name} ***
            You are NOT an AI. You are ${p.name}.
            ARCHETYPE: ${p.archetype}
            STYLE: ${p.style}
            PHILOSOPHY: ${p.corePhilosophy}
            KEYWORDS: ${p.keywords.join(', ')}.
            ${styleMemory}
            INSTRUCTION: Write in the first person ("Tôi"). Channel this persona completely.
         `;
     } else if (persona === 'custom' && customPersonaName) {
       personaInstruction = `IMPORTANT: You are ${customPersonaName}. Adopt their persona perfectly. Speak in the first person ("Tôi").`;
     }
  }

  let contextInstruction = "";
  if (personalContext && personalContext.trim().length > 0) {
    contextInstruction = `USER CONTEXT: """${personalContext}"""\nApply this context implicitly.`;
  }

  return `
    *** CRITICAL LANGUAGE FIREWALL ***
    YOU MUST WRITE THE SCRIPT ENTIRELY IN: [ ${language.code.toUpperCase()} ].
    
    *** VERBOSE MODE ACTIVATED (CRITICAL) ***
    - DO NOT SUMMARIZE. DO NOT CONDENSE.
    - EXPAND ON EVERY POINT. Use anecdotes, examples, and detailed explanations.
    - If the user asks for a long script, you MUST fill the time.
    - AVOID bullet points unless absolutely necessary. Use flowing narrative paragraphs.
    
    ROLE: Expert Scriptwriter.
    TONE: Natural Storytelling, Emotional but Grounded.
    
    *** NARRATIVE PERSPECTIVE ***
    - MODE: ${perspective.id !== 'auto' ? perspective.label : 'AUTO'}

    ${approvedStructureInstruction}
    ${personaInstruction}
    ${contextInstruction}

    === STRICT TTS FORMATTING ===
    1. Short paragraphs (3-5 sentences).
    2. Narrative style only.
    3. NO [Music], [Sound].

    ${languageRules}

    TEMPLATE: ${template.title}
    ${template.systemPromptAddon}
  `;
};

// --- MAIN UNIVERSAL GENERATOR ---

export const universalGenerateScript = async (options: GenerateOptions): Promise<string> => {
  const { 
    provider, model, input, template, language, duration, 
    customMinutes, persona, customPersonaName, personalContext, learnedExamples, apiKeys, approvedAnalysis 
  } = options;

  const config = calculateTargetLength(language.id, duration.id, customMinutes);
  
  const systemInstruction = buildSystemInstruction(
      template, language, options.perspective, persona, customPersonaName, personalContext, learnedExamples, approvedAnalysis 
  );
  
  const CHUNK_DURATION = 4;
  const useChainedGeneration = config.minutes > 5; 

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
      const userPrompt = `
        TASK: Write a complete ${config.minutes}-minute script.
        TARGET: ~${config.targetChars} characters.
        TOPIC: "${input}"
        STRUCTURE: Continuous narrative. ONE Hook at start.
        STRICT: DO NOT SUMMARIZE. BE VERBOSE.
      `;
      const rawText = await executeCall(systemInstruction, userPrompt);
      return cleanArtifacts(rawText);

    } else {
      // Optimized Chained Generation
      const totalParts = Math.ceil(config.minutes / CHUNK_DURATION);
      const chunkCharsTarget = Math.round(config.targetChars / totalParts);
      
      let fullScript = "";
      
      console.log(`🚀 Starting Optimized Chain: ${totalParts} Parts. Target ~${chunkCharsTarget} chars/part.`);

      for (let i = 1; i <= totalParts; i++) {
        const isFirst = i === 1;
        const isLast = i === totalParts;
        
        let pacingInstruction = "";
        if (approvedAnalysis && approvedAnalysis.outline.length > 0) {
             const totalStages = approvedAnalysis.outline.length;
             const startStage = Math.floor(((i - 1) / totalParts) * totalStages);
             const endStage = Math.floor((i / totalParts) * totalStages);
             const stagesCovered = approvedAnalysis.outline.slice(startStage, endStage + 1);
             pacingInstruction = `
                CURRENT PLOT FOCUS (Part ${i}/${totalParts}):
                ${stagesCovered.map(s => `- ${s}`).join('\n')}
             `;
        } else {
             const progress = i / totalParts;
             if (progress <= 0.2) pacingInstruction = "PACING: INTRODUCTION & HOOK.";
             else if (progress <= 0.8) pacingInstruction = "PACING: DEVELOPMENT & CONFLICT.";
             else pacingInstruction = "PACING: CONCLUSION & RESOLUTION.";
        }

        const memoryContext = fullScript.slice(-3000);
        const transitionContext = fullScript.slice(-300);

        const continuityInstruction = isFirst ? "" : `
            *** CONTINUITY ENFORCEMENT ***
            PREVIOUS TEXT ENDED WITH: "...${transitionContext}"
            INSTRUCTION: Start your response IMMEDIATELY after the text above. 
            - DO NOT repeat the last sentence.
            - Connect the syntax naturally.
            - MAINTAIN LANGUAGE: ${language.code.toUpperCase()}.
        `;

        const promptTemplate = `
            *** GENERATING PART ${i} of ${totalParts} ***
            TARGET LENGTH: ~${chunkCharsTarget} characters.
            TOPIC: "${input}"
            
            ${pacingInstruction}
            
            STRICT INSTRUCTION: BE VERBOSE. DO NOT SUMMARIZE.
            TELL STORIES. GIVE EXAMPLES. EXPAND ON EVERY DETAIL.
            
            ${isFirst ? "Start with a powerful Hook." : ""}
            ${isLast ? "Bring the story to a satisfying conclusion." : "End this part on a transition."}
            
            CONTEXT MEMORY: "...${memoryContext}"
            ${continuityInstruction}
        `;

        let partText = await executeCall(systemInstruction, promptTemplate);
        partText = cleanArtifacts(partText);

        fullScript += (isFirst ? "" : " ") + partText;

        if (!isLast) await delay(1000); 
      }
      return fullScript;
    }
  } catch (error: any) {
    console.error(`Error in Generator:`, error);
    return `⚠️ LỖI: ${error.message}`;
  }
};
