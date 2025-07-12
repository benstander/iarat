import { generateVideoScript } from '@/lib/script-generation';

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

    // Use the shared script generation utility
    const script = await generateVideoScript({
      textContent,
      brainrotStyle
    });

    return new Response(JSON.stringify({ script }), {
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