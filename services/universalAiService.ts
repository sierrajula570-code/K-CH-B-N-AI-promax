

import { GoogleGenAI } from "@google/genai";
import { ScriptTemplate, LanguageOption, DurationOption, InputMode, PerspectiveOption, AIProvider, ScriptAnalysis } from '../types';

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

  const isCJK = ['jp', 'cn', 'kr'].includes(langId);
  
  // ADJUSTMENT: 950 chars/min to aim for ~57,000 chars for 60 mins.
  let targetChars = 0;
  if (isCJK) {
    targetChars = Math.round(minutes * 300);
  } else {
    targetChars = Math.round(minutes * 950); 
  }

  // Strict range
  const minChars = Math.round(targetChars * 0.95); 
  const maxChars = Math.round(targetChars * 1.05); 

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
    const { provider, model, input, template, language, apiKeys } = options;
    
    const systemPrompt = `
      ROLE: Senior Script Doctor & Architect.
      TASK: Analyze the user's idea and outline a solid structure + character list.
      OUTPUT LANGUAGE: ${language.code.toUpperCase()} (Vietnamese if 'vi').
      
      REQUIREMENTS:
      1. Define the 7-Stage Plot Framework specific to this story.
      2. Create a list of FIXED characters (Name, Role, Key Trait).
      3. OUTPUT FORMAT: JSON ONLY. No markdown.
      
      JSON SCHEMA:
      {
        "outline": [
           "Stage 1 (Start): [Detail]",
           "Stage 2 (Mystery): [Detail]",
           "Stage 3 (Conflict): [Detail]",
           "Stage 4 (Escalation): [Detail]",
           "Stage 5 (Climax): [Detail]",
           "Stage 6 (Resolution): [Detail]",
           "Stage 7 (Ending): [Detail]"
        ],
        "characters": [
           "Name - Role - Trait",
           "Name - Role - Trait"
        ],
        "pacingNote": "Brief advice on tone (e.g., Slow burn, Fast paced)"
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
        // Clean markdown code blocks if present
        raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(raw);
        return {
            outline: parsed.outline || [],
            characters: parsed.characters || [],
            pacingNote: parsed.pacingNote || "Standard Pacing"
        };
    } catch (e) {
        console.error("Analysis Parsing Error:", e);
        // Fallback if AI fails to return JSON
        return {
            outline: ["Khởi đầu", "Uẩn khúc", "Xung đột", "Leo thang", "Cao trào", "Giải quyết", "Kết thúc"],
            characters: ["Nhân vật chính (Chưa đặt tên)", "Nhân vật phụ (Chưa đặt tên)"],
            pacingNote: "Manual Review Needed"
        };
    }
};

// --- PROMPT BUILDER (Unified) ---
const buildSystemInstruction = (
  template: ScriptTemplate, 
  language: LanguageOption, 
  perspective: PerspectiveOption,
  persona: string = 'auto',
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
      - LOCALIZATION: Use Vietnamese names/locations unless topic implies otherwise.
    `;
  } else {
    languageRules = `
      - Ensure natural phrasing for native speakers of ${language.code}.
    `;
  }

  let approvedStructureInstruction = "";
  if (approvedAnalysis) {
      approvedStructureInstruction = `
        *** APPROVED BLUEPRINT (DO NOT DEVIATE) ***
        1. CHARACTERS (FIXED):
           ${approvedAnalysis.characters.join('\n           ')}
           -> YOU MUST USE THESE NAMES EXACTLY. DO NOT INVENT NEW MAIN CHARACTERS.
           
        2. PLOT OUTLINE (FIXED):
           ${approvedAnalysis.outline.map((step, idx) => `Stage ${idx+1}: ${step}`).join('\n           ')}
           -> FOLLOW THIS TRAJECTORY STRICTLY.
      `;
  }

  let personaInstruction = "";
  if (template.id === 'charlie-munger') {
     if (persona === 'buffett') {
       personaInstruction = "IMPORTANT: You are WARREN BUFFETT.";
     } else if (persona === 'munger') {
       personaInstruction = "IMPORTANT: You are CHARLIE MUNGER.";
     }
  }

  let contextInstruction = "";
  if (personalContext && personalContext.trim().length > 0) {
    contextInstruction = `USER CONTEXT: """${personalContext}"""\nApply this context implicitly.`;
  }

  let learningInstruction = "";
  if (learnedExamples && learnedExamples.length > 0) {
    learningInstruction = `
      *** STYLE MIMICRY ***
      MIMIC this style:
      ${learnedExamples[0].substring(0, 500)}...
    `;
  }

  return `
    *** CRITICAL LANGUAGE FIREWALL ***
    YOU MUST WRITE THE SCRIPT ENTIRELY IN: [ ${language.code.toUpperCase()} ].
    
    ROLE: Expert Scriptwriter.
    TONE: Natural Storytelling, Emotional but Grounded.
    
    *** NARRATIVE PERSPECTIVE ***
    - MODE: ${perspective.id !== 'auto' ? perspective.label : 'AUTO'}

    ${approvedStructureInstruction}

    ${personaInstruction}
    ${contextInstruction}
    ${learningInstruction}

    === STRICT TTS FORMATTING ===
    1. Short paragraphs (3-5 sentences).
    2. NO LISTS. Narrative only.
    3. NO [Music], [Sound].
    4. NO "Before we dive in...".

    ${languageRules}

    TEMPLATE: ${template.title}
    ${template.systemPromptAddon}
  `;
};

// --- MAIN UNIVERSAL GENERATOR ---

export const universalGenerateScript = async (options: GenerateOptions): Promise<string> => {
  const { 
    provider, model, input, template, language, duration, 
    customMinutes, persona, personalContext, learnedExamples, apiKeys, approvedAnalysis 
  } = options;

  const config = calculateTargetLength(language.id, duration.id, customMinutes);
  
  const systemInstruction = buildSystemInstruction(
      template, language, options.perspective, persona, personalContext, learnedExamples, approvedAnalysis 
  );
  
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
      const maxWords = Math.round(config.targetChars / 4.5);
      const userPrompt = `
        TASK: Write a ${config.minutes}-minute script.
        TARGET: ~${maxWords} words.
        TOPIC: "${input}"
        ${approvedAnalysis ? "NOTE: Stick to the Approved Blueprint defined in System Prompt." : ""}
        STRUCTURE: Continuous narrative. ONE Hook at start.
      `;
      const rawText = await executeCall(systemInstruction, userPrompt);
      return cleanArtifacts(rawText);

    } else {
      const totalParts = Math.ceil(config.minutes / CHUNK_DURATION);
      const chunkWordTarget = Math.round((config.targetChars / totalParts) / 4.5); 
      
      let fullScript = "";
      let previousContext = "";

      console.log(`🚀 Starting Chain: ${totalParts} Parts with Approved Blueprint.`);

      for (let i = 1; i <= totalParts; i++) {
        const isFirst = i === 1;
        const isLast = i === totalParts;
        const progress = i / totalParts;
        
        // Map progress to the 7 stages from the Approved Analysis if available
        let pacingInstruction = "";
        let stageName = "";
        
        if (approvedAnalysis && approvedAnalysis.outline.length === 7) {
             // Logic mapping 7 outline steps to parts
             // Simple distribution logic
             const stageIndex = Math.floor((i - 1) / totalParts * 7); 
             // Ensure we don't go out of bounds
             const validIndex = Math.min(stageIndex, 6);
             stageName = `Stage ${validIndex + 1}`;
             const stageDetail = approvedAnalysis.outline[validIndex];
             
             pacingInstruction = `
                CURRENT FOCUS: ${stageName}.
                DETAILS: ${stageDetail}.
                Keep characters consistent: ${approvedAnalysis.characters.join(', ')}.
             `;
        } else {
             // Fallback logic if no analysis (old logic)
             if (progress <= 0.15) pacingInstruction = "STAGE: KHỞI ĐẦU.";
             else if (progress <= 0.30) pacingInstruction = "STAGE: UẨN KHÚC.";
             else if (progress <= 0.50) pacingInstruction = "STAGE: XUNG ĐỘT.";
             else if (progress <= 0.70) pacingInstruction = "STAGE: LEO THANG.";
             else if (progress <= 0.85) pacingInstruction = "STAGE: CAO TRÀO.";
             else pacingInstruction = "STAGE: KẾT THÚC.";
        }

        const contextWindow = previousContext.slice(-4000); 
        const consistencyCheck = i > 1 ? `
            *** CONTINUITY ***
            1. NAMES: Must match Approved List.
            2. NO RECAPS.
            3. Continue exactly where left off.
        ` : "";

        const promptTemplate = `
            *** PART ${i} of ${totalParts} ***
            GOAL: Write NEXT ~${chunkWordTarget} words.
            ${pacingInstruction}
            
            ${i > 1 ? `PREVIOUS CONTEXT: "...${contextWindow}"` : ""}
            ${consistencyCheck}
        `;

        let partText = await executeCall(systemInstruction, promptTemplate);
        partText = cleanArtifacts(partText);

        fullScript += (isFirst ? "" : " ") + partText;
        previousContext = partText;

        if (!isLast) await delay(1000); 
      }
      return fullScript;
    }
  } catch (error: any) {
    console.error(`Error in Generator:`, error);
    return `⚠️ LỖI: ${error.message}`;
  }
};
