import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { generateText } from 'ai';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('pdf') as File;
    const brainrotStyle = formData.get('brainrotStyle') as string || 'engaging and modern';

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Parse PDF using pdf-parse (server-side compatible)
    let extractedText: string;
    let pageCount: number;
    
    try {
      // Import pdf-parse in a way that works with Next.js API routes
      const pdfParse = (await import('pdf-parse')).default;
      
      // Parse the PDF buffer
      const data = await pdfParse(buffer, {
        // Options to make it work better in server environment
        max: 0, // No limit on pages
      });
      
      extractedText = data.text;
      pageCount = data.numpages;
      
    } catch (error) {
      console.error('PDF parsing error:', error);
      return NextResponse.json(
        { error: 'Failed to parse PDF. Please ensure the PDF contains readable text and is not corrupted.' },
        { status: 400 }
      );
    }

    if (!extractedText.trim()) {
      return NextResponse.json(
        { error: 'No text could be extracted from the PDF' },
        { status: 400 }
      );
    }

    // Generate PEAK BRAINROT script directly from extracted text
    const prompt = `You are the most unhinged Gen-Z TikToker who's actually SMART and teaches complex topics in pure brainrot language. Your job is to take this educational content and transform it into authentic Gen-Z/Gen-Alpha brainrot while making sure people ACTUALLY LEARN the key concepts.

CONTENT TO TRANSFORM: ${extractedText}

WRITE A NATURAL FLOWING EDUCATIONAL TIKTOK SCRIPT (30-45 seconds when read aloud) that:

- Starts with an absolutely UNHINGED hook like "POV:", "Tell me why...", "This is actually so sus but...", "Y'all are NOT ready for this...", "No cap this is about to blow your mind...", "Why is nobody talking about this???"

- ACTUALLY EXPLAINS the key concepts, facts, and important information from the content BUT uses Gen-Z brainrot language: "no cap", "fr fr", "bussin", "slay", "periodt", "Ohio", "sus", "based", "cringe", "bet", "slaps", "goes hard", "it's giving", "that's so sigma", "alpha energy", "rizz", "lowkey", "highkey", "deadass", "and I oop", "that hits different", "it's the [X] for me"

- Makes sure viewers understand the ACTUAL educational content - break down complex ideas into simple brainrot explanations that people will remember

- Use analogies and comparisons that Gen-Z relates to: "It's like when your phone dies but worse", "This hits different than your ex's apology", "It's giving main character energy", "Think of it like this but make it make sense"

- Talks like you're explaining it to your bestie with ADHD energy - random capitalization, multiple exclamation points, dramatic pauses with "..." BUT ACTUALLY TEACHES THEM

- Makes the educational content SHOCKING and mind-blowing - "WAIT WHAT?!", "I'm literally SHOOK", "This is so unhinged but it's FACTS"

- Ends with something that reinforces the learning and makes people want to comment like "Tell me you learned something new", "This is actually insane right??? Did y'all know this?", "Drop a 🔥 if this just changed your whole perspective", "Wait did this just make [subject] make sense for anyone else???"

CRITICAL: The viewer should walk away having actually LEARNED the key educational concepts from the original content. Don't sacrifice educational value for entertainment - combine both! Make learning addictive.

Don't use any structured format or labels. Just write it like you're literally talking to your phone making an educational TikTok that's both unhinged AND informative.

Style vibe: ${brainrotStyle}`;

    const { text } = await generateText({
      model: openai('gpt-4.1'),
      prompt: prompt,
      maxTokens: 1200,
      temperature: 0.9, 
    });
    console.log(text);

    return NextResponse.json({
      success: true,
      script: text,
      fileName: file.name,
      pageCount: pageCount
    });

  } catch (error) {
    console.error('Error processing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to process PDF file' },
      { status: 500 }
    );
  }
} 