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
        const prompt = `
        OUTPUT ONLY a valid JSON array. Do not wrap it in any other text or markdown.

        You are a high-energy short-form video writer specialized in the ${brainrotStyle} style: memetic, hyper-engaging, concise, with playful hooks and quick punchlines.

        Task:
        1. You'll receive this source content: "${textContent}"
        2. Split into sequential segments of ~50 words each (≈20s of speech), ignoring any unnecessary information.
        3. For each segment, produce:
        • "chunkNumber": (1, 2, 3, …)
        • "hook": a 1-sentence attention grabber
        • "script": ~50-word brain-rot script

        FINAL OUTPUT MUST BE A JSON ARRAY:
        [
        { "chunkNumber": 1, "hook": "…", "script": "…" },
        { "chunkNumber": 2, "hook": "…", "script": "…" },
        …
        ]
        `;    

        // 2. Generate
        const { text: raw } = await generateText({
            model: openai('gpt-3.5-turbo'),
            prompt,
            maxTokens: 1000,
            temperature: 0.0,
        })

        // 3. Parse into an actual array
        let chunks: Array<{ chunkNumber: number; hook: string; script: string }>
        try {
            chunks = JSON.parse(raw)
            return new Response(
            JSON.stringify(chunks), 
            { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
        }  catch (err) {
            console.error('Invalid JSON from LLM:', raw)
            return Response.json(
                { error: 'LLM did not return valid JSON' },
                { status: 502 }
            )
        }
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