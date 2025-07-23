import { NextRequest, NextResponse } from 'next/server';
import { processTextIntoTopics } from '@/lib/topic-processing';

export async function POST(req: NextRequest) {
  try {
    const { youtubeUrl } = await req.json();

    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      );
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL' },
        { status: 400 }
      );
    }

    console.log(`Processing YouTube URL: ${youtubeUrl}`);
    try {
      const result = await fetch(`http://localhost:8000/transcription/youtube/?url=${youtubeUrl}`);
      const transcript = await result.text();

      console.log("TRANSCRIPT: " + transcript)

      // Process transcript into topics WITHOUT generating scripts yet
      // Scripts will be generated later when user selects voice style
      const summaries = await processTextIntoTopics({
        textContent: transcript,
        contentType: 'YouTube'
      });

      return NextResponse.json({
        success: true,
        summaries,
        totalTopics: summaries.length,
        message: `Successfully processed YouTube video and created ${summaries.length} topic summaries. Scripts will be generated when you select your voice style.`
      });
    } catch (error) {
      console.error('Error fetching transcript:', error);
      return NextResponse.json(
        { error: 'Failed to fatched transcript' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('YouTube processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process YouTube video' },
      { status: 500 }
    );
  }
} 