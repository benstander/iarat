import { NextRequest, NextResponse } from 'next/server';
import { processTextIntoTopics } from '@/lib/topic-processing';

export const maxDuration = 60; // Increased for multiple topic processing

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('pdf') as File;
    const brainrotStyle = formData.get('brainrotStyle') as string || 'engaging and modern';
    const videoStyle = formData.get('videoStyle') as 'brainrot' | 'academic' | 'unhinged' || 'brainrot';

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

    // Check file size (limit to 10MB to prevent the 1MB error)
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeInBytes) {
      return NextResponse.json(
        { error: 'PDF file size must be less than 10MB. Please use a smaller file.' },
        { status: 413 }
      );
    }

    console.log(`Processing PDF file: ${file.name} (${file.size} bytes, style: ${videoStyle})`);

    // Convert File to Buffer for pdf-parse
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text from PDF using pdf-parse  
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(buffer);
    const extractedText = pdfData.text;

    console.log(`Extracted text length: ${extractedText.length} characters`);

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text could be extracted from the PDF' },
        { status: 400 }
      );
    }

    // Process text into topics and generate scripts using shared utility
    const summaries = await processTextIntoTopics({
      textContent: extractedText,
      brainrotStyle,
      videoStyle,
      contentType: 'PDF'
    });

    return NextResponse.json({
      success: true,
      summaries,
      totalTopics: summaries.length,
      message: `Successfully processed PDF and created ${summaries.length} topic summaries with ${videoStyle} style`
    });

  } catch (error) {
    console.error('PDF processing error:', error);
    
    // Check if it's a body size error
    if (error instanceof Error && error.message.includes('Body exceeded')) {
      return NextResponse.json(
        { error: 'PDF file is too large. Please use a file smaller than 10MB.' },
        { status: 413 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to process PDF file' },
      { status: 500 }
    );
  }
} 