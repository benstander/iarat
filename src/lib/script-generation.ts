import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';

interface ScriptGenerationOptions {
  textContent: string;
  brainrotStyle?: string;
  videoStyle?: 'brainrot' | 'academic' | 'unhinged';
  videoDialogue?: 'explainer' | 'debater' | 'socratic' | 'narrative' | 'examples' | 'quiz' | null;
  maxDurationSeconds?: number;
}

// Constants for timing calculations
const ELEVENLABS_SPEAKING_RATE = {
  WORDS_PER_SECOND: 2.8, // Average rate for ElevenLabs TTS
  SAFETY_BUFFER: 0.9 // 10% buffer for safety
};

// Helper function to calculate word count from duration
function calculateMaxWords(durationSeconds: number): number {
  const baseWords = Math.floor(durationSeconds * ELEVENLABS_SPEAKING_RATE.WORDS_PER_SECOND * ELEVENLABS_SPEAKING_RATE.SAFETY_BUFFER);
  return Math.max(20, baseWords); // Minimum 20 words
}

function getDialoguePrompt(videoDialogue: 'explainer' | 'debater' | 'socratic' | 'narrative' | 'examples' | 'quiz' | null): {
  approach: string;
  structure: string;
  techniques: string;
} {
  switch (videoDialogue) {
    case 'explainer':
      return {
        approach: "Use a clear explanatory approach that breaks down complex concepts into simple, understandable parts.",
        structure: "Jump quickly into main concept → Provide key details → Give concrete examples → Show practical applications",
        techniques: "Use phrases like 'Let me explain...', 'Here's how this works...', 'To understand this...', 'The key point is...', 'Simply put...'"
      };
    
    case 'debater':
      return {
        approach: "Present information from multiple perspectives and engage with potential counterarguments.",
        structure: "Present main view → Address opposing views → Provide evidence → Counter rebuttals with facts",
        techniques: "Use phrases like 'Some might argue...', 'However, the evidence shows...', 'Critics claim... but...', 'On the other hand...', 'The real question is...'"
      };
    
    case 'socratic':
      return {
        approach: "Use questioning techniques to guide viewers through discovery of concepts.",
        structure: "Pose questions → Guide thinking → Reveal insights → Ask follow-up questions → Show practical implications",
        techniques: "Use rhetorical questions like 'But what if...?', 'Have you ever wondered...?', 'Why do you think...?', 'What would happen if...?', 'How does this change when...?'"
      };
    
    case 'narrative':
      return {
        approach: "Tell the information as a compelling story with characters, conflict, and resolution.",
        structure: "Set the scene quickly → Introduce conflict/problem → Build tension → Show resolution with educational insights",
        techniques: "Use storytelling elements like 'Imagine...', 'Picture this...', 'But then something changed...', 'This shows us...'"
      };
    
    case 'examples':
      return {
        approach: "Focus heavily on concrete, relatable examples to illustrate every major point.",
        structure: "Present concept → Real example → Another example → Show how examples connect → Practical applications",
        techniques: "Use phrases like 'For example...', 'Think about...', 'Just like when...', 'This is similar to...', 'In everyday life...'"
      };
    
    case 'quiz':
      return {
        approach: "Present information in an interactive quiz-like format with questions, answers, and explanations.",
        structure: "Structure as: Pose question → Give viewers time to think → Reveal answer → Explain why → Next question",
        techniques: "Use phrases like 'Quick question...', 'Can you guess...?', 'The answer is...', 'If you said... you're right!', 'Here's why...'"
      };
    
    default:
      return {
        approach: "Use a straightforward, engaging educational approach.",
        structure: "Structure logically with clear progression of ideas.",
        techniques: "Use engaging, conversational language appropriate to the content."
      };
  }
}

function getStylePrompt(videoStyle: 'brainrot' | 'academic' | 'unhinged' = 'brainrot'): {
  roleDescription: string;
  languageInstructions: string;
  styleSpecific: string;
  languageBalance: string;
} {
  switch (videoStyle) {
    case 'academic':
      return {
        roleDescription: "You are a respected university professor who makes complex topics accessible and engaging through clear, authoritative teaching.",
        languageInstructions: "Uses precise academic language while remaining approachable and engaging. Employ scholarly terminology when appropriate, clear explanations, and professional teaching methods.",
        styleSpecific: `- Use formal but engaging academic language
- Explain concepts with methodical precision
- Include relevant examples and case studies
- Structure information logically with clear transitions
- Maintain scholarly authority while being accessible
- Use phrases like "It's important to understand that...", "This concept illustrates...", "Research shows that...", "Let's examine this carefully..."`,
        languageBalance: "90% educational content, 10% engaging delivery techniques"
      };
    
    case 'unhinged':
      return {
        roleDescription: "You're a no-bullshit educator who doesn't sugarcoat anything. You teach with raw passion, brutal honesty, and a large amount of swearing to make sure the message hits home.",
        languageInstructions: "Use unapologetically direct language with plenty of swearing to hammer the point. Be raw, honest, and make sure the educational value isn't lost in the process.",
        styleSpecific: `- Use unapologetically direct language and plenty of swearing to hammer key points
- Be brutally honest about why topics matter in the real world, no sugarcoating
- Call out bullshit and get straight to the fucking point
- Use phrases like "Here's the real shit...", "This is fucking important because...", "Stop pretending like...", "The truth nobody tells you is..."
- Be passionate and intense about the subject matter, don't hold back
- Cut through academic fluff and speak plainly about practical implications`,
        languageBalance: "70% educational content, 30% unfiltered commentary and swearing"
      };
    
    case 'brainrot':
    default:
      return {
        roleDescription: "You are an educational content creator who makes learning viral and engaging through strategic Gen-Z language while ensuring effective teaching.",
        languageInstructions: "Uses strategic Gen-Z language (2-4 phrases max) only when it enhances understanding. Focus on making learning memorable and engaging.",
        styleSpecific: `- Uses strategic Gen-Z language (2-4 phrases max) only when it enhances understanding: "no cap", "fr", "lowkey", "it's giving", "that's actually insane", "hits different"
- Explains concepts with clear examples or analogies
- Breaks down complex ideas into simple, digestible parts
- Maintains engagement throughout the entire duration`,
        languageBalance: "70% educational content, 30% Gen-Z language"
      };
  }
}

export async function generateVideoScript({ 
  textContent, 
  brainrotStyle = 'engaging and modern',
  videoStyle = 'brainrot',
  videoDialogue = null,
  maxDurationSeconds = 60
}: ScriptGenerationOptions): Promise<string> {
  if (!textContent) {
    throw new Error('Text content is required');
  }

  // Use the requested duration without artificial caps
  const targetDuration = maxDurationSeconds;
  const recommendedWords = calculateMaxWords(targetDuration);
  
  console.log(`Script generation parameters:`);
  console.log(`- Video style: ${videoStyle}`);
  console.log(`- Target duration: ${targetDuration}s`);
  console.log(`- Recommended words: ${recommendedWords}`);

  // Get style-specific prompt components
  const stylePrompt = getStylePrompt(videoStyle);
  const dialoguePrompt = getDialoguePrompt(videoDialogue);

  // Create a prompt that provides duration guidance without strict enforcement
  const prompt = `${stylePrompt.roleDescription} Transform this educational content into a VOICEOVER SCRIPT that TEACHES effectively using the specified style and dialogue approach.

Content to work with: ${textContent}

WRITE A VOICEOVER SCRIPT that:

DURATION GUIDANCE: 
- Target approximately ${recommendedWords} words for optimal ${targetDuration}-second timing
- This ensures good pacing when read by ElevenLabs TTS (~2.8 words per second)
- Prioritize complete thoughts and clear explanations over strict word limits

CONTENT REQUIREMENTS:
- Contains ONLY spoken content - no production instructions, visual cues, or stage directions
- Focuses on teaching the core concepts clearly and memorably
- ${stylePrompt.languageInstructions}
- Explains the main concept with clear examples or analogies
- Breaks down complex ideas into simple, digestible parts
- Maintains engagement throughout the entire duration

STYLE-SPECIFIC REQUIREMENTS:
${stylePrompt.styleSpecific}

DIALOGUE APPROACH REQUIREMENTS:
- ${dialoguePrompt.approach}
- ${dialoguePrompt.structure}  
- ${dialoguePrompt.techniques}

STRUCTURE REQUIREMENTS:
- MINIMIZE intro fluff - jump quickly into educational content (max 1-2 sentences for intro)
- NO unnecessary ending summaries or outro phrases like "that's what they don't want you to know", "mind blown yet?", etc.
- Use sufficient time to thoroughly explain the concepts with concrete examples
- Break down ideas into digestible steps with specific details
- Balance education with engagement but prioritize substance over entertainment
- NEVER use em dashes. Use commas instead.

CRITICAL REQUIREMENTS:
- ${stylePrompt.languageBalance}
- Ensure viewers actually LEARN something concrete and actionable
- Focus on clarity and understanding over pure entertainment
- MAXIMIZE educational content - don't waste words on unnecessary introductions or conclusions
- Include specific examples, facts, or practical applications
- NEVER include production notes like "cut to visuals", "show graphics", or similar instructions
- Write ONLY what the narrator will say out loud
- Complete your thoughts naturally - don't cut off mid-sentence for word count

Legacy Style Parameter: ${brainrotStyle}

AVOID THESE TIME-WASTING PHRASES:
- Long introductions like "What's up everybody, welcome back to my channel" 
- Unnecessary ending summaries like "Mind blown yet?", "That's what they don't want you to know", "Let's keep this convo going"
- Filler phrases that don't add educational value
- Generic conclusions or call-to-actions
- Repetitive transitional phrases

TIMING REMINDER: Aim for around ${recommendedWords} words, but prioritize educational value and natural flow over strict adherence to word count.`;

  const { text } = await generateText({
    model: xai('grok-3'),
    prompt: prompt,
    maxTokens: 1000, // Increased token limit for more flexibility
    temperature: 0.7, 
  });

  const generatedScript = text.trim();
  
  // Log script information without trimming
  const words = generatedScript.split(/\s+/);
  const actualWordCount = words.length;
  const estimatedDuration = actualWordCount / ELEVENLABS_SPEAKING_RATE.WORDS_PER_SECOND;
  
  console.log(`Generated script: ${actualWordCount} words`);
  console.log(`Estimated duration: ~${estimatedDuration.toFixed(1)}s`);
  
  if (estimatedDuration > 60) {
    console.warn(`Script may exceed 60 seconds (estimated ${estimatedDuration.toFixed(1)}s), but proceeding without trimming`);
  }
  
  return generatedScript;
}

/**
 * Validate script duration and word count (for informational purposes)
 */
export function validateScriptDuration(script: string, maxDurationSeconds: number = 60): {
  isValid: boolean;
  actualWords: number;
  maxWords: number;
  estimatedDuration: number;
  maxDuration: number;
} {
  const words = script.trim().split(/\s+/);
  const actualWords = words.length;
  const maxWords = calculateMaxWords(maxDurationSeconds);
  const estimatedDuration = actualWords / ELEVENLABS_SPEAKING_RATE.WORDS_PER_SECOND;
  
  return {
    isValid: estimatedDuration <= maxDurationSeconds, // Changed to duration-based validation only
    actualWords,
    maxWords,
    estimatedDuration,
    maxDuration: maxDurationSeconds
  };
}

/**
 * Get optimal word count for duration
 */
export function getOptimalWordCount(durationSeconds: number): number {
  return calculateMaxWords(durationSeconds);
} 