import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export interface ScriptGenerationOptions {
  textContent: string;
  brainrotStyle?: string;
}

export async function generateVideoScript({ 
  textContent, 
  brainrotStyle = 'engaging and modern' 
}: ScriptGenerationOptions): Promise<string> {
  if (!textContent) {
    throw new Error('Text content is required');
  }

// Create a prompt for educational content with strategic brainrot elements
const prompt = `You are an educational content creator who makes learning viral and engaging. Transform this educational content into a script that TEACHES effectively while using strategic Gen-Z language to keep it entertaining.

Content to work with: ${textContent}

WRITE A SCRIPT that:

- Is EXACTLY 30 seconds when read at normal speaking pace (about 75 words MAXIMUM)
- Focuses on teaching the core concepts clearly and memorably
- Uses strategic Gen-Z language (2-3 phrases max) only when it enhances understanding, such as "no cap", "fr", "lowkey", "it's giving", "that's actually insane"
- Explains the main concept with clear examples or analogies
- Breaks down complex ideas into simple, digestible parts

CRITICAL: 
- 70% educational content, 30% Gen-Z language
- Ensure viewers actually LEARN something concrete
- Keep it to 75 words MAX for exactly 30 seconds of ElevenLabs voice generation
- Focus on clarity and understanding over pure entertainment

Style: ${brainrotStyle}`;

  const { text } = await generateText({
    model: openai('gpt-4o'),
    prompt: prompt,
    maxTokens: 500, // Reduced from 1000 since we want shorter scripts
    temperature: 0.7, 
  });

  return text.trim();
} 