import { NextRequest, NextResponse } from 'next/server';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';
import { generateVideoScript } from '@/lib/script-generation';

export const maxDuration = 60; // Increased for multiple topic processing

// Helper function to clean JSON response from markdown
function cleanJsonResponse(text: string): string {
  // Remove markdown code blocks if present
  const cleaned = text.replace(/```json\s*|\s*```/g, '').trim();
  return cleaned;
}

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

    // Check file size (limit to 10MB to prevent the 1MB error)
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSizeInBytes) {
      return NextResponse.json(
        { error: 'PDF file size must be less than 10MB. Please use a smaller file.' },
        { status: 413 }
      );
    }

    // Extract text from PDF
    const arrayBuffer = await file.arrayBuffer();
    const pdfParse = require('pdf-parse');
    const pdfData = await pdfParse(Buffer.from(arrayBuffer));
    const extractedText = pdfData.text;

    console.log('Extracted text length:', extractedText.length);

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'No text could be extracted from the PDF' },
        { status: 400 }
      );
    }

    // Step 1: Split text into topics using ChatGPT
    console.log('Splitting text into topics...');
    const topicsResult = await generateText({
      model: openai('gpt-4o'),
      prompt: `
        Split the following text into 3-7 distinct topics or sections. 
        Each topic should have a clear title and contain the relevant content from the original text.
        
        Return ONLY a valid JSON array in this exact format:
        [
          {
            "title": "Topic Title",
            "content": "Relevant content from the original text for this topic"
          }
        ]
        
        Text to analyze:
        ${extractedText}
      `,
      maxTokens: 2000,
    });

    const topicsJson = topicsResult.text;
    console.log('Raw topics response:', topicsJson);

    // Parse topics with improved error handling
    let topics;
    try {
      const cleanedJson = cleanJsonResponse(topicsJson);
      topics = JSON.parse(cleanedJson);
    } catch (parseError) {
      console.error('Failed to parse topics JSON:', parseError);
      console.log('Cleaned topics response:', cleanJsonResponse(topicsJson));
      
      // Fallback: treat entire text as one topic
      topics = [{
        title: "Document Summary",
        content: extractedText.substring(0, 2000) // Limit content length
      }];
    }

    if (!Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json(
        { error: 'Failed to split text into topics' },
        { status: 500 }
      );
    }

    console.log(`Successfully split into ${topics.length} topics`);

    // Step 2: Generate scripts for each topic using the shared utility
    const summaries = [];
    
    for (let i = 0; i < topics.length; i++) {
      const topic = topics[i];
      console.log(`Generating script for topic ${i + 1}: ${topic.title}`);
      
      try {
        // Use the shared script generation utility
        const script = await generateVideoScript({
          textContent: `${topic.title}: ${topic.content}`,
          brainrotStyle
        });

        summaries.push({
          topicTitle: topic.title,
          script: script,
          topicIndex: i + 1
        });
        
      } catch (scriptError) {
        console.error(`Error generating script for topic ${i + 1}:`, scriptError);
        // Add a fallback summary
        summaries.push({
          topicTitle: topic.title,
          script: `This topic covers ${topic.title}. ${topic.content.substring(0, 150)}...`,
          topicIndex: i + 1
        });
      }
    }

    console.log(`Generated ${summaries.length} brainrot summaries`);

    return NextResponse.json({
      success: true,
      summaries,
      totalTopics: summaries.length,
      message: `Successfully processed PDF and created ${summaries.length} topic summaries`
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