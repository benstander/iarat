import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { textContent, brainrotStyle = 'engaging and modern' } = await req.json();

    if (!textContent) {
      return new Response(
        JSON.stringify({ error: 'Text content is required' }), 
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create a prompt for SHORT, punchy brainrot content (20-30 seconds max)
    const prompt = `You are the ULTIMATE Gen-Z TikToker who creates VIRAL brainrot content that actually TEACHES people. Transform this educational content into a SHORT (20-30 seconds when read aloud), punchy TikTok script.

Content to work with: ${textContent}

WRITE A SUPER SHORT, PUNCHY SCRIPT that:

- Is EXACTLY 20-30 seconds when read at normal speaking pace (about 150-200 words MAX)
- Starts with an INSANE hook: "POV:", "Tell me why...", "Y'all are NOT ready...", "This is actually sus but..."
- Uses PEAK brainrot language: "no cap", "fr fr", "bussin", "slay", "periodt", "sigma", "rizz", "lowkey", "deadass", "it's giving", "Ohio", "sus", "based"
- Actually TEACHES the key concept in simple, memorable terms
- Has 2-3 main points MAX (don't overcomplicate)
- Ends with engagement: "Drop a 🔥 if...", "Tell me this didn't just...", "Wait did this make sense???"

CRITICAL: Keep it SHORT and SNAPPY. TikTok attention spans are 15-30 seconds. Make every word count!

Style: ${brainrotStyle}`;

    const { text } = await generateText({
      model: openai('gpt-3.5-turbo'),
      prompt: prompt,
      maxTokens: 1000,
      temperature: 0.7, 
    });

    return new Response(JSON.stringify({ script: text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating video script:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate video script' }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
} 