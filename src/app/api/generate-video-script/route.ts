import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { textContent, brainrotStyle } = await req.json();

    if (!textContent || !brainrotStyle) {
      return new Response(
        JSON.stringify({ error: 'Text content and brainrot style are required' }), 
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create a prompt based on the brainrot style and parsed text content
    const prompt = `You are a creative video script generator that creates engaging, modern content in the "${brainrotStyle}" style.

Content to work with: ${textContent}

Generate a creative video script that:
1. Captures the essence of the "${brainrotStyle}" style
2. Makes the content engaging and memorable
3. Is suitable for short-form video content (TikTok/YouTube Shorts style)
4. Includes suggestions for visual elements
5. Keeps the educational value while making it entertaining

Please format the response as a structured script with:
- Hook (opening line)
- Main content points (3-5 key points)
- Visual suggestions for each section
- Closing/CTA

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