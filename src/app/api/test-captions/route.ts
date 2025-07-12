import { NextRequest, NextResponse } from 'next/server';
import { FFmpegVideoRenderer, CaptionChunk } from '@/lib/ffmpeg-renderer';

export async function POST(req: NextRequest) {
  try {
    const { script, duration = 30 } = await req.json();
    
    if (!script) {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }

    console.log('Testing caption generation...');
    
    // Test caption generation
    FFmpegVideoRenderer.testCaptionGeneration(script, duration);
    
    // Generate captions for the response
    const captions = FFmpegVideoRenderer.generateCaptions(script, duration);
    
    return NextResponse.json({
      success: true,
      script,
      duration,
      captionCount: captions.length,
      captions: captions.map((caption: CaptionChunk, index: number) => ({
        index: index + 1,
        text: caption.text,
        startTime: caption.startTime,
        endTime: caption.endTime,
        duration: caption.endTime - caption.startTime
      }))
    });
    
  } catch (error) {
    console.error('Error testing captions:', error);
    return NextResponse.json(
      { error: 'Failed to test captions', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 