import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export interface ScriptGenerationOptions {
  textContent: string;
  brainrotStyle?: string;
  maxDurationSeconds?: number;
}

// ElevenLabs speaking rate configuration
const ELEVENLABS_SPEAKING_RATE = {
  WORDS_PER_MINUTE: 150, // Conservative estimate for ElevenLabs
  WORDS_PER_SECOND: 2.5,  // 150 WPM / 60 seconds
  BUFFER_FACTOR: 0.9      // 10% buffer to ensure we stay under limit
};

/**
 * Calculate maximum word count for given duration
 */
function calculateMaxWords(durationSeconds: number): number {
  const maxWords = Math.floor(durationSeconds * ELEVENLABS_SPEAKING_RATE.WORDS_PER_SECOND * ELEVENLABS_SPEAKING_RATE.BUFFER_FACTOR);
  console.log(`Calculated max words for ${durationSeconds}s: ${maxWords} words`);
  return maxWords;
}

/**
 * Estimate content density to adjust word count
 */
function analyzeContentDensity(textContent: string): {
  density: 'low' | 'medium' | 'high';
  recommendedWords: number;
  maxDurationSeconds: number;
} {
  const contentLength = textContent.length;
  const wordCount = textContent.trim().split(/\s+/).length;
  
  // Analyze content characteristics
  const hasNumbers = /\d/.test(textContent);
  const hasComplexTerms = /[A-Z][a-z]+[A-Z]/.test(textContent); // camelCase or technical terms
  const averageWordLength = contentLength / wordCount;
  
  let density: 'low' | 'medium' | 'high';
  let maxDurationSeconds = 60; // Default 1 minute maximum
  
  // Determine content density - technical content gets more time, simple content can be shorter
  if (averageWordLength > 7 || hasComplexTerms || hasNumbers) {
    density = 'high';
    maxDurationSeconds = 60; // Technical content needs full time for proper explanation
  } else if (averageWordLength > 5) {
    density = 'medium';
    maxDurationSeconds = 60; // Balanced content gets full time
  } else {
    density = 'low';
    maxDurationSeconds = 45; // Simple content can be explained concisely
  }
  
  const recommendedWords = calculateMaxWords(maxDurationSeconds);
  
  console.log(`Content analysis: density=${density}, avgWordLength=${averageWordLength.toFixed(1)}, recommendedWords=${recommendedWords}, maxDuration=${maxDurationSeconds}s`);
  
  return {
    density,
    recommendedWords,
    maxDurationSeconds
  };
}

export async function generateVideoScript({ 
  textContent, 
  brainrotStyle = 'engaging and modern',
  maxDurationSeconds = 60
}: ScriptGenerationOptions): Promise<string> {
  if (!textContent) {
    throw new Error('Text content is required');
  }

  // Enforce absolute maximum of 60 seconds
  const absoluteMaxDuration = Math.min(maxDurationSeconds, 60);
  
  // Analyze content to determine optimal word count
  const contentAnalysis = analyzeContentDensity(textContent);
  const effectiveMaxDuration = Math.min(absoluteMaxDuration, contentAnalysis.maxDurationSeconds);
  const maxWords = calculateMaxWords(effectiveMaxDuration);
  
  console.log(`Script generation parameters:`);
  console.log(`- Max duration: ${effectiveMaxDuration}s (requested: ${maxDurationSeconds}s)`);
  console.log(`- Max words: ${maxWords}`);
  console.log(`- Content density: ${contentAnalysis.density}`);

  // Create a prompt that enforces strict word count limits
  const prompt = `You are an educational content creator who makes learning viral and engaging. Transform this educational content into a VOICEOVER SCRIPT that TEACHES effectively while using strategic Gen-Z language to keep it entertaining.

Content to work with: ${textContent}

WRITE A VOICEOVER SCRIPT that:

CRITICAL WORD COUNT LIMIT: 
- Use MAXIMUM ${maxWords} words (this is STRICT - content will be cut off if longer)
- Target ${Math.floor(maxWords * 0.9)}-${maxWords} words for optimal timing
- This ensures exactly ${effectiveMaxDuration} seconds or less when read by ElevenLabs TTS

CONTENT REQUIREMENTS:
- Contains ONLY spoken content - no production instructions, visual cues, or stage directions
- Focuses on teaching the core concepts clearly and memorably
- Uses strategic Gen-Z language (2-4 phrases max) only when it enhances understanding: "no cap", "fr", "lowkey", "it's giving", "that's actually insane", "hits different"
- Explains the main concept with clear examples or analogies
- Breaks down complex ideas into simple, digestible parts
- Maintains engagement throughout the entire duration

STRUCTURE FOR ${contentAnalysis.density.toUpperCase()} DENSITY CONTENT:
${contentAnalysis.density === 'high' ? 
  '- Use full 60 seconds to thoroughly explain complex concepts\n- Break down technical ideas into digestible steps\n- Include concrete examples and analogies\n- Allow time for concepts to sink in' :
  contentAnalysis.density === 'medium' ?
  '- Cover 2-3 related key points with good explanations\n- Include practical examples\n- Balance education with engagement' :
  '- Be concise and focused - explain key points efficiently\n- Use simple language and clear examples\n- Keep it punchy and engaging without unnecessary padding'
}

CRITICAL REQUIREMENTS:
- 70% educational content, 30% Gen-Z language
- Ensure viewers actually LEARN something concrete
- NEVER exceed ${maxWords} words under any circumstances
- Focus on clarity and understanding over pure entertainment
- Structure with clear beginning, middle, and end
- Include specific examples or interesting facts
- NEVER include production notes like "cut to visuals", "show graphics", or similar instructions
- Write ONLY what the narrator will say out loud

Style: ${brainrotStyle}

WORD COUNT REMINDER: Your response must be ${maxWords} words or fewer. Count carefully!`;

  const { text } = await generateText({
    model: openai('gpt-4o'),
    prompt: prompt,
    maxTokens: Math.min(800, maxWords * 4), // Adjust tokens based on word limit
    temperature: 0.7, 
  });

  const generatedScript = text.trim();
  
  // Validate word count and trim if necessary
  const words = generatedScript.split(/\s+/);
  const actualWordCount = words.length;
  
  console.log(`Generated script: ${actualWordCount} words`);
  
  if (actualWordCount > maxWords) {
    console.warn(`Script exceeded word limit (${actualWordCount} > ${maxWords}), trimming...`);
    const trimmedScript = words.slice(0, maxWords).join(' ');
    console.log(`Trimmed script: ${maxWords} words`);
    return trimmedScript;
  }
  
  console.log(`Script generation successful: ${actualWordCount} words for ~${(actualWordCount / ELEVENLABS_SPEAKING_RATE.WORDS_PER_SECOND).toFixed(1)}s duration`);
  
  return generatedScript;
}

/**
 * Validate script duration and word count
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
    isValid: actualWords <= maxWords && estimatedDuration <= maxDurationSeconds,
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
  return calculateMaxWords(Math.min(durationSeconds, 60));
} 